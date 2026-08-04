// api/repairs.js
// Migrasi dari Google Apps Script -> Supabase
import { getSupabase } from "./_lib/supabase.js";
import { handleStockNotification } from "./_lib/notify.js";
import { getCorsHeaders, sanitizeError } from "./_lib/helpers.js";

const supabase = getSupabase();

const CATEGORY_PREFIX = {
  "dinamo amper": "DA",
  "dinamo starter": "DS",
  "radiator": "RD",
  "elektrik spil": "SPIL",
  "elektrik maker": "MAKER",
};

function getCategoryPrefix(namaKategori) {
  if (!namaKategori) return "TIK";
  const key = String(namaKategori).toLowerCase().trim();
  return CATEGORY_PREFIX[key] || "TIK";
}

async function generateTicketId(prefix) {
  const pattern = prefix + "-%";
  const { data, error } = await supabase
    .from("tb_perbaikan")
    .select("id_perbaikan")
    .ilike("id_perbaikan", pattern);

  if (error) throw error;

  let maxSeq = 0;
  (data || []).forEach((row) => {
    const parts = String(row.id_perbaikan).split("-");
    const num = parseInt(parts[1], 10);
    if (!isNaN(num) && num > maxSeq) maxSeq = num;
  });

  const nextSeq = String(maxSeq + 1).padStart(4, "0");
  return `${prefix}-${nextSeq}`;
}

async function generateRiwayatId(isElektrik) {
  const prefix = isElektrik ? "RSTE" : "RSDR";
  const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return `${prefix}-${unique}`.slice(0, 20);
}

async function deductElektrikStock(idKomponen, jumlah) {
  const { data: stokRows } = await supabase
    .from("tb_stok_elektrik")
    .select("*")
    .eq("id_komponen", idKomponen)
    .limit(1);

  if (!stokRows || stokRows.length === 0) return;
  const stok = stokRows[0];
  const newStok = Math.max(0, (stok.stok_saat_ini || 0) - jumlah);

  await supabase
    .from("tb_stok_elektrik")
    .update({ stok_saat_ini: newStok })
    .eq("id_stok_elektrik", stok.id_stok_elektrik);

  const idRiwayat = await generateRiwayatId(true);
  await supabase.from("tb_riwayat_elektrik").insert({
    id_riwayat: idRiwayat,
    id_stok_elektrik: stok.id_stok_elektrik,
    jenis_transaksi: "Keluar",
    jumlah,
    tgl_transaksi: new Date().toISOString().split("T")[0],
    keterangan: "Auto-deduct from ticket",
  });

  await handleStockNotification(idKomponen, newStok, stok.batas_minimal || 0, "elektrik", stok.nama_komponen);
}

async function deductDinRadStock(idKomponen, jumlah, idMesin) {
  let namaMesin = "";
  if (idMesin) {
    const { data: mesinRows } = await supabase
      .from("tb_mesin")
      .select("nama_mesin")
      .eq("id_mesin", idMesin)
      .limit(1);
    if (mesinRows && mesinRows.length > 0) {
      namaMesin = String(mesinRows[0].nama_mesin || "").toUpperCase();
    }
  }

  const { data: stokRows } = await supabase
    .from("tb_stok_din_rad")
    .select("*")
    .eq("id_komponen", idKomponen);

  if (!stokRows) return;

  const match = stokRows.find((row) => {
    const kompatibilitas = String(row.kompatibilitas_unit || "").toUpperCase();
    return (
      kompatibilitas === "UNIVERSAL" ||
      (namaMesin && kompatibilitas.includes(namaMesin))
    );
  });
  if (!match) return;

  const newStok = Math.max(0, (match.stok_saat_ini || 0) - jumlah);

  await supabase
    .from("tb_stok_din_rad")
    .update({ stok_saat_ini: newStok })
    .eq("id_stok_din_rad", match.id_stok_din_rad);

  const idRiwayat = await generateRiwayatId(false);
  await supabase.from("tb_riwayat_din_rad").insert({
    id_riwayat: idRiwayat,
    id_stok_din_rad: match.id_stok_din_rad,
    jenis_transaksi: "Keluar",
    jumlah,
    tgl_transaksi: new Date().toISOString().split("T")[0],
    keterangan: "Auto-deduct from ticket",
  });

  await handleStockNotification(
    idKomponen,
    newStok,
    match.batas_minimal || 0,
    "din_rad",
    match.nama_spesifikasi_barang
  );
}

async function processKomponen(idPerbaikan, komponenList, idKategoriSparepart, idMesin) {
  if (!Array.isArray(komponenList)) return;

  const kategoriName = String(idKategoriSparepart || "").toLowerCase();
  const isElektrik = kategoriName.includes("elektrik");
  const isDinRad = kategoriName.includes("dinamo") || kategoriName.includes("radiator");

  for (const comp of komponenList) {
    const jumlah = parseInt(comp.jumlah) || 1;

    await supabase.from("tb_detail_perbaikan").insert({
      id_perbaikan: idPerbaikan,
      id_komponen: comp.id_komponen,
      jumlah,
    });

    if (isElektrik) {
      await deductElektrikStock(comp.id_komponen, jumlah);
    } else if (isDinRad) {
      await deductDinRadStock(comp.id_komponen, jumlah, idMesin);
    }
  }
}

export default async function handler(req, res) {
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { method } = req;

    if (method === "GET") {
      const { action, id_kategori, id_perbaikan } = req.query;

      if (action === "getKategori") {
        const { data, error } = await supabase.from("tb_kategori_sparepart").select("*");
        if (error) throw error;
        return res.status(200).json({ success: true, data });
      }

      if (action === "getLocations") {
        const { data, error } = await supabase.from("tb_lokasi").select("*");
        if (error) throw error;
        return res.status(200).json({ success: true, data });
      }

      if (action === "getMesin") {
        const { data, error } = await supabase.from("tb_mesin").select("*");
        if (error) throw error;
        return res.status(200).json({ success: true, data });
      }

      if (action === "getComponents") {
        const { data: kategoriRows, error: kategoriError } = await supabase
          .from("tb_kategori_sparepart")
          .select("id_kategori")
          .eq("nama_kategori", id_kategori)
          .limit(1);

        if (kategoriError || !kategoriRows || kategoriRows.length === 0) {
          return res.status(200).json({ success: true, data: [] });
        }

        const idKategoriNum = kategoriRows[0].id_kategori;

        const { data, error } = await supabase
          .from("tb_komponen_detail")
          .select("*")
          .eq("id_kategori", idKategoriNum);

        if (error) throw error;
        return res.status(200).json({ success: true, data: data || [] });
      }

      if (action === "getSelectedComponents") {
        const { data, error } = await supabase
          .from("tb_detail_perbaikan")
          .select("id_komponen, jumlah")
          .eq("id_perbaikan", id_perbaikan);
        if (error) throw error;
        return res.status(200).json({ success: true, data });
      }

      if (action === "getArchive") {
        const { data, error } = await supabase
          .from("tb_perbaikan")
          .select("*")
          .in("status_perbaikan", ["Selesai", "Afkir"]);
        if (error) throw error;
        return res.status(200).json({ success: true, data });
      }

      const { data, error } = await supabase
        .from("tb_perbaikan")
        .select("*");
      console.log("[repairs] tb_perbaikan raw data count:", (data || []).length, "error:", error);
      if (error) throw error;
      const active = (data || []).filter((r) => {
        const s = String(r.status_perbaikan || "");
        return s !== "Selesai" && s !== "Afkir";
      });
      return res.status(200).json({ success: true, data: active });
    }

    if (method === "POST") {
      const payload = req.body;
      const prefix = getCategoryPrefix(payload.id_kategori_sparepart);
      const idPerbaikan = await generateTicketId(prefix);

      const { error } = await supabase.from("tb_perbaikan").insert({
        id_perbaikan: idPerbaikan,
        nama_unit: payload.nama_unit || "",
        id_mesin: payload.id_mesin || "",
        id_kategori_sparepart: payload.id_kategori_sparepart,
        lokasi_operasi: payload.lokasiOperasi || "",
        tgl_masuk: payload.tgl_masuk || new Date().toISOString().split("T")[0],
        status_perbaikan: "Menunggu Pengecekan",
        catatan: payload.deskripsiKerusikan || "",
      });
      if (error) throw error;

      try {
        await processKomponen(idPerbaikan, payload.komponen, payload.id_kategori_sparepart, payload.id_mesin);
      } catch (procErr) {
        console.error("[repairs] processKomponen error:", procErr);
        await supabase.from("tb_detail_perbaikan").delete().eq("id_perbaikan", idPerbaikan);
        await supabase.from("tb_perbaikan").delete().eq("id_perbaikan", idPerbaikan);
        throw procErr;
      }

      return res.status(201).json({ success: true, id: idPerbaikan });
    }

    if (method === "PUT") {
      const payload = req.body;
      const idPerbaikan = payload.id_perbaikan;

      const updateData = {
        nama_unit: payload.nama_unit || "",
        id_mesin: payload.id_mesin || "",
        status_perbaikan: payload.status,
        catatan: payload.catatan,
      };
      if (payload.tgl_keluar) updateData.tgl_keluar = payload.tgl_keluar;

      const { error } = await supabase
        .from("tb_perbaikan")
        .update(updateData)
        .eq("id_perbaikan", idPerbaikan);
      if (error) throw error;

      if (payload.komponen && Array.isArray(payload.komponen)) {
        await supabase.from("tb_detail_perbaikan").delete().eq("id_perbaikan", idPerbaikan);
        await processKomponen(idPerbaikan, payload.komponen, payload.id_kategori_sparepart, payload.id_mesin);
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("Repairs API Error:", error);
    return res.status(500).json({ success: false, message: sanitizeError(error) });
  }
}
