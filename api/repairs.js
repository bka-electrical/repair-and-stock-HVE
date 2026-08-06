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
  "accu": "ACCU",
};

function getCategoryPrefix(namaKategori) {
  if (!namaKategori) return "TIK";
  const key = String(namaKategori).toLowerCase().trim();
  return CATEGORY_PREFIX[key] || "TIK";
}

// Generate ID tiket, format: DA-0001, RD-0002, dst
async function generateTicketId(prefix) {
  const { data, error } = await supabase
    .from("tb_perbaikan")
    .select("id_perbaikan")
    .like("id_perbaikan", `${prefix}-%`);
  if (error) throw error;

  let maxSeq = 0;
  (data || []).forEach((row) => {
    const parts = String(row.id_perbaikan).split("-");
    const num = parseInt(parts[1], 10);
    if (!isNaN(num) && num > maxSeq) maxSeq = num;
  });

  return `${prefix}-${String(maxSeq + 1).padStart(4, "0")}`;
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

  let maxSeq = 0;
  (data || []).forEach((row) => {
    const parts = String(row.id_riwayat).split("-");
    const num = parseInt(parts[1], 10);
    if (!isNaN(num) && num > maxSeq) maxSeq = num;
  });

  return `${prefix}-${String(maxSeq + 1).padStart(3, "0")}`;
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
// sesuai tipe_stok kategori (diambil dari tb_kategori_sparepart, bukan tebak nama)
async function processKomponen(idPerbaikan, komponenList, idKategoriSparepart, idMesin) {
  if (!Array.isArray(komponenList)) return;

  const { data: kategoriRows } = await supabase
    .from("tb_kategori_sparepart")
    .select("tipe_stok")
    .eq("nama_kategori", idKategoriSparepart)
    .limit(1);

  const tipeStok = kategoriRows && kategoriRows.length > 0 ? kategoriRows[0].tipe_stok : null;
  const isElektrik = tipeStok === "elektrik";
  const isDinRad = tipeStok === "din_rad";

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

// Simpan baris tb_accu (id_accu = id_perbaikan), khusus kategori "Accu"
async function insertAccuRecord(idPerbaikan, komponenList, riwayatNoKabel, riwayatSisa) {
  if (!Array.isArray(komponenList) || komponenList.length === 0) return;

  const namaKabel = [];
  const namaSekun = [];

  for (const comp of komponenList) {
    const { data: rows } = await supabase
      .from("tb_komponen_detail")
      .select("id_komponen, nama_komponen")
      .eq("id_komponen", comp.id_komponen)
      .limit(1);
    if (!rows || rows.length === 0) continue;

    const idKomponen = String(rows[0].id_komponen || "");
    const namaKomponen = String(rows[0].nama_komponen || "").toLowerCase();
    if (idKomponen.startsWith("ACU-K") || namaKomponen.includes("kabel")) {
      namaKabel.push(rows[0].nama_komponen);
    } else if (idKomponen.startsWith("ACU-S") || namaKomponen.includes("sekun")) {
      namaSekun.push(rows[0].nama_komponen);
    }
  }

  await supabase.from("tb_accu").insert({
    id_accu: idPerbaikan,
    jenis_kabel: namaKabel.join(", "),
    jenis_sekun: namaSekun.join(", "),
    riwayat_no_kabel: riwayatNoKabel || "",
    riwayat_sisa: riwayatSisa || "",
  });
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
        // Frontend mengirim NAMA kategori (dropdown pakai nama_kategori sebagai value),
        // jadi perlu diterjemahkan dulu ke id_kategori sebelum query ke tb_komponen_detail
        const { data: kategoriRows } = await supabase
          .from("tb_kategori_sparepart")
          .select("id_kategori")
          .eq("nama_kategori", id_kategori)
          .limit(1);

        const idKategoriAsli = kategoriRows && kategoriRows.length > 0 ? kategoriRows[0].id_kategori : null;
        if (!idKategoriAsli) {
          return res.status(200).json({ success: true, data: [] });
        }

        const { data, error } = await supabase
          .from("tb_komponen_detail")
          .select("*")
          .eq("id_kategori", idKategoriAsli);
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

      // Default: antrean aktif (bukan Selesai/Afkir).
      // Hanya jalankan ini tanpa action; action lain diproses di bawah.
      if (!action) {
        const { data, error } = await supabase
          .from("tb_perbaikan")
          .select("*")
          .not("status_perbaikan", "in", '("Selesai","Afkir")');
        if (error) throw error;
        return res.status(200).json({ success: true, data });
      }
    }

    if (method === "POST") {
      if (!req.query.action) {
        const payload = req.body;
        const kategoriSparepart = String(payload.id_kategori_sparepart || "").trim();
        const kategoriSparepartLower = kategoriSparepart.toLowerCase();
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

        await processKomponen(idPerbaikan, payload.komponen, kategoriSparepart, payload.id_mesin);

        if (kategoriSparepartLower === "accu") {
          await insertAccuRecord(
            idPerbaikan,
            payload.komponen,
            payload.riwayat_no_kabel,
            payload.riwayat_sisa ?? payload.riwayat_sekun
          );
        }

        return res.status(201).json({ success: true, id: idPerbaikan });
      }
    }

    if (method === "PUT") {
      if (!req.query.action) {
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
    }

    if (method === "GET") {
      const { action } = req.query;
      if (action === "getSuratJalan") {
        const { data, error } = await supabase
          .from("tb_surat_jalan")
          .select("*")
          .order("tanggal_kirim", { ascending: false });
        if (error) throw error;
        return res.status(200).json({ success: true, data });
      }

      if (action === "getDinamoReady") {
        const { data, error } = await supabase
          .from("tb_dinamo_ready")
          .select("*")
          .order("id_dinamo_ready", { ascending: true });
        if (error) throw error;
        return res.status(200).json({ success: true, data });
      }

      if (action === "getRiwayatKanibal") {
        const { data, error } = await supabase
          .from("tb_riwayat_kanibal")
          .select("*")
          .order("tanggal_kanibal", { ascending: false });
        if (error) throw error;
        return res.status(200).json({ success: true, data });
      }
    }

    if (method === "POST") {
      const { action } = req.query;
      const data = req.body;

      if (action === "addSuratJalan") {
        const { error } = await supabase.from("tb_surat_jalan").insert({
          no_surat_jalan: data.no_surat_jalan || "",
          tanggal_kirim: data.tanggal_kirim || new Date().toISOString().split("T")[0],
          tujuan: data.tujuan || "",
          id_perbaikan: data.id_perbaikan || "",
          nama_unit: data.nama_unit || "",
        });
        if (error) throw error;
        return res.status(201).json({ success: true });
      }

      if (action === "addDinamoReady") {
        const id = await generateDinamoReadyId();
        const { error } = await supabase.from("tb_dinamo_ready").insert({
          id_dinamo_ready: id,
          tipe_dinamo: data.tipe_dinamo || "",
          id_mesin: data.id_mesin || "",
          kondisi: data.kondisi || "",
          keterangan: data.keterangan || "",
        });
        if (error) throw error;
        return res.status(201).json({ success: true, id });
      }

      if (action === "addRiwayatKanibal") {
        const id = await generateKanibalId();
        const { error } = await supabase.from("tb_riwayat_kanibal").insert({
          id_kanibal: id,
          id_dinamo_ready: data.id_dinamo_ready || "",
          id_perbaikan: data.id_perbaikan || "",
          id_komponen: data.id_komponen || "",
          tanggal_kanibal: data.tanggal_kanibal || new Date().toISOString(),
          keterangan: data.keterangan || "",
        });
        if (error) throw error;
        return res.status(201).json({ success: true, id });
      }
    }

    if (method === "PUT") {
      const { action } = req.query;
      const data = req.body;

      if (action === "updateSuratJalan") {
        const { error } = await supabase
          .from("tb_surat_jalan")
          .update({
            no_surat_jalan: data.no_surat_jalan,
            tanggal_kirim: data.tanggal_kirim,
            tujuan: data.tujuan,
          })
          .eq("id_surat_jalan", data.id_surat_jalan);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      if (action === "updateDinamoReady") {
        const { error } = await supabase
          .from("tb_dinamo_ready")
          .update({
            tipe_dinamo: data.tipe_dinamo,
            id_mesin: data.id_mesin,
            kondisi: data.kondisi,
            keterangan: data.keterangan,
          })
          .eq("id_dinamo_ready", data.id_dinamo_ready);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      if (action === "updateRiwayatKanibal") {
        const { error } = await supabase
          .from("tb_riwayat_kanibal")
          .update({
            id_dinamo_ready: data.id_dinamo_ready,
            id_perbaikan: data.id_perbaikan,
            id_komponen: data.id_komponen,
            tanggal_kanibal: data.tanggal_kanibal,
            keterangan: data.keterangan,
          })
          .eq("id_kanibal", data.id_kanibal);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }
    }

// Generate ID kanibal, format: KAN-001, KAN-002, etc.
async function generateKanibalId() {
  const { data, error } = await supabase
    .from("tb_riwayat_kanibal")
    .select("id_kanibal")
    .like("id_kanibal", "KAN-%");
  if (error) throw error;

  let maxSeq = 0;
  (data || []).forEach((row) => {
    const parts = String(row.id_kanibal).split("-");
    const num = parseInt(parts[1], 10);
    if (!isNaN(num) && num > maxSeq) maxSeq = num;
  });

  return `KAN-${String(maxSeq + 1).padStart(3, "0")}`;
}

// Generate ID dinamo ready, format: DRD-001, DRD-002, etc.
async function generateDinamoReadyId() {
  const { data, error } = await supabase
    .from("tb_dinamo_ready")
    .select("id_dinamo_ready")
    .like("id_dinamo_ready", "DRD-%");
  if (error) throw error;

  let maxSeq = 0;
  (data || []).forEach((row) => {
    const parts = String(row.id_dinamo_ready).split("-");
    const num = parseInt(parts[1], 10);
    if (!isNaN(num) && num > maxSeq) maxSeq = num;
  });

  return `DRD-${String(maxSeq + 1).padStart(3, "0")}`;
}

      if (action === "deleteDinamoReady") {
        const { error } = await supabase
          .from("tb_dinamo_ready")
          .delete()
          .eq("id_dinamo_ready", data.id_dinamo_ready);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      if (action === "deleteRiwayatKanibal") {
        const { error } = await supabase
          .from("tb_riwayat_kanibal")
          .delete()
          .eq("id_kanibal", data.id_kanibal);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("Repairs API Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
