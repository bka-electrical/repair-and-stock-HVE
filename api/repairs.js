// api/repairs.js
// Migrasi dari Google Apps Script -> Supabase
import { createClient } from "@supabase/supabase-js";
import { handleStockNotification } from "./_lib/notify.js";

// Pakai SERVICE_ROLE_KEY (bukan anon key) karena ini jalan di server/backend,
// butuh akses penuh tanpa dibatasi RLS. Jangan pernah expose service role key ke frontend.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

// Generate ID tiket, format: DA-001, RD-002, dst
async function generateTicketId(prefix) {
  const { data, error } = await supabase
    .from("tb_perbaikan")
    .select("id_perbaikan")
    .like("id_perbaikan", `${prefix}-%`);
  if (error) throw error;
  const count = (data || []).length + 1;
  return `${prefix}-${String(count).padStart(3, "0")}`;
}

// Generate ID riwayat stok, format: RSTE-001 (elektrik) / RSDR-001 (dinamo/radiator)
async function generateRiwayatId(isElektrik) {
  const table = isElektrik ? "tb_riwayat_elektrik" : "tb_riwayat_din_rad";
  const prefix = isElektrik ? "RSTE" : "RSDR";
  const { data, error } = await supabase
    .from(table)
    .select("id_riwayat")
    .like("id_riwayat", `${prefix}-%`);
  if (error) throw error;
  const count = (data || []).length + 1;
  return `${prefix}-${String(count).padStart(3, "0")}`;
}

// Kurangi stok elektrik + catat riwayat (Keluar)
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

// Kurangi stok Dinamo/Radiator -- hanya kalau kompatibilitas_unit
// cocok dengan nama mesin, atau bertanda 'UNIVERSAL'
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

// Simpan komponen yang dipakai di tiket + jalankan auto-deduct stok
// sesuai kategori (elektrik atau dinamo/radiator)
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
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { method } = req;

    if (method === "GET") {
      const { action, id_kategori, id_perbaikan } = req.query;

      // Master data
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
        const { data, error } = await supabase
          .from("tb_komponen_detail")
          .select("*")
          .eq("id_kategori", id_kategori);
        if (error) throw error;
        return res.status(200).json({ success: true, data });
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

      // Default: antrean aktif (bukan Selesai/Afkir)
      const { data, error } = await supabase
        .from("tb_perbaikan")
        .select("*")
        .not("status_perbaikan", "in", '("Selesai","Afkir")');
      if (error) throw error;
      return res.status(200).json({ success: true, data });
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
        catatan: payload.deskripsiKerusakan || "",
      });
      if (error) throw error;

      await processKomponen(idPerbaikan, payload.komponen, payload.id_kategori_sparepart, payload.id_mesin);

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

      // Kalau komponen diedit, hapus detail lama & catat ulang (termasuk auto-deduct)
      if (payload.komponen && Array.isArray(payload.komponen)) {
        await supabase.from("tb_detail_perbaikan").delete().eq("id_perbaikan", idPerbaikan);
        await processKomponen(idPerbaikan, payload.komponen, payload.id_kategori_sparepart, payload.id_mesin);
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("Repairs API Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}