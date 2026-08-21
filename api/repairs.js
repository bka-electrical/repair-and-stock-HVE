// api/repairs.js
// Migrasi dari Google Apps Script -> Supabase
import { createClient } from "@supabase/supabase-js";
import { handleStockNotification } from "./_lib/notify.js";

// Pakai SERVICE_ROLE_KEY (bukan anon key) karena ini jalan di server/backend,
// butuh akses penuh tanpa dibatasi RLS. Jangan pernah expose service role key ke frontend.
async function fetchWithRetry(url, options, retries = 4, delayMs = 500) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      const isNetworkError =
        err?.cause?.code === "ECONNRESET" ||
        /fetch failed/i.test(err?.message || "");
      if (!isNetworkError || attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    global: {
      fetch: (url, options) => fetchWithRetry(url, options),
    },
  }
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

// ===== GENERATOR ID (semua dikumpulin di sini, level atas) =====

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

async function generateProdukReadyId() {
  const { data, error } = await supabase
    .from("tb_produk_ready")
    .select("id_produk_ready")
    .like("id_produk_ready", "PRD-%");
  if (error) throw error;

  let maxSeq = 0;
  (data || []).forEach((row) => {
    const parts = String(row.id_produk_ready).split("-");
    const num = parseInt(parts[1], 10);
    if (!isNaN(num) && num > maxSeq) maxSeq = num;
  });

  return `PRD-${String(maxSeq + 1).padStart(3, "0")}`;
}

async function generateRiwayatProdukId() {
  const { data, error } = await supabase
    .from("tb_riwayat_produk")
    .select("id_riwayat_produk")
    .like("id_riwayat_produk", "RPRD-%");
  if (error) throw error;

  let maxSeq = 0;
  (data || []).forEach((row) => {
    const parts = String(row.id_riwayat_produk).split("-");
    const num = parseInt(parts[1], 10);
    if (!isNaN(num) && num > maxSeq) maxSeq = num;
  });

  return `RPRD-${String(maxSeq + 1).padStart(3, "0")}`;
}

async function generateSuratJalanId() {
  const { data, error } = await supabase
    .from("tb_surat_jalan")
    .select("id_surat_jalan")
    .like("id_surat_jalan", "SJ-%");
  if (error) throw error;

  let maxSeq = 0;
  (data || []).forEach((row) => {
    const parts = String(row.id_surat_jalan).split("-");
    const num = parseInt(parts[1], 10);
    if (!isNaN(num) && num > maxSeq) maxSeq = num;
  });

  return `SJ-${String(maxSeq + 1).padStart(3, "0")}`;
}

async function kurangiStokProdukReady(kategoriProduk, idMesin, jumlah) {
  if (!kategoriProduk || !idMesin || !jumlah) return;

  const { data: produkRows, error: produkErr } = await supabase
    .from("tb_produk_ready")
    .select("id_produk_ready, jumlah_stok")
    .eq("kategori_produk", kategoriProduk)
    .eq("id_mesin", idMesin)
    .limit(1);
  if (produkErr) throw produkErr;
  if (!produkRows || produkRows.length === 0) {
    console.log("kurangiStokProdukReady: tidak ada produk ready yang cocok, dilewati");
    return;
  }

  const stokLama = produkRows[0].jumlah_stok || 0;
  const stokBaru = Math.max(0, stokLama - jumlah);

  await supabase
    .from("tb_produk_ready")
    .update({ jumlah_stok: stokBaru })
    .eq("id_produk_ready", produkRows[0].id_produk_ready);

  const idRiwayat = await generateRiwayatProdukId();
  await supabase.from("tb_riwayat_produk").insert({
    id_riwayat_produk: idRiwayat,
    id_produk_ready: produkRows[0].id_produk_ready,
    jenis_transaksi: "Keluar",
    jumlah,
    tanggal: new Date().toISOString().split("T")[0],
    keterangan: "Auto-deduct dari surat jalan",
  });
}

// ===== STOK / KOMPONEN =====

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
    return kompatibilitas === "UNIVERSAL" || (namaMesin && kompatibilitas.includes(namaMesin));
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

  await handleStockNotification(idKomponen, newStok, match.batas_minimal || 0, "din_rad", match.nama_spesifikasi_barang);
}

async function restoreElektrikStock(idKomponen, jumlah) {
  const { data: stokRows } = await supabase
    .from("tb_stok_elektrik")
    .select("*")
    .eq("id_komponen", idKomponen)
    .limit(1);

  if (!stokRows || stokRows.length === 0) return;
  const stok = stokRows[0];
  const newStok = (stok.stok_saat_ini || 0) + jumlah;

  await supabase
    .from("tb_stok_elektrik")
    .update({ stok_saat_ini: newStok })
    .eq("id_stok_elektrik", stok.id_stok_elektrik);

  const idRiwayat = await generateRiwayatId(true);
  await supabase.from("tb_riwayat_elektrik").insert({
    id_riwayat: idRiwayat,
    id_stok_elektrik: stok.id_stok_elektrik,
    jenis_transaksi: "Masuk",
    jumlah,
    tgl_transaksi: new Date().toISOString().split("T")[0],
    keterangan: "Restore from ticket edit",
  });

  await handleStockNotification(idKomponen, newStok, stok.batas_minimal || 0, "elektrik", stok.nama_komponen);
}

async function restoreDinRadStock(idKomponen, jumlah, idMesin) {
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
    return kompatibilitas === "UNIVERSAL" || (namaMesin && kompatibilitas.includes(namaMesin));
  });
  if (!match) return;

  const newStok = (match.stok_saat_ini || 0) + jumlah;

  await supabase
    .from("tb_stok_din_rad")
    .update({ stok_saat_ini: newStok })
    .eq("id_stok_din_rad", match.id_stok_din_rad);

  const idRiwayat = await generateRiwayatId(false);
  await supabase.from("tb_riwayat_din_rad").insert({
    id_riwayat: idRiwayat,
    id_stok_din_rad: match.id_stok_din_rad,
    jenis_transaksi: "Masuk",
    jumlah,
    tgl_transaksi: new Date().toISOString().split("T")[0],
    keterangan: "Restore from ticket edit",
  });

  await handleStockNotification(idKomponen, newStok, match.batas_minimal || 0, "din_rad", match.nama_spesifikasi_barang);
}

async function processKomponen(idPerbaikan, komponenList, idKategoriSparepart, idMesin) {
  if (!Array.isArray(komponenList)) return;

  const kategoriLower = String(idKategoriSparepart || "").toLowerCase().trim();
  const isElektrik = kategoriLower.includes("elektrik");
  const isDinRad = kategoriLower.includes("dinamo") || kategoriLower.includes("radiator");

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
  if (!Array.isArray(komponenList) || komponenList.length === 0) {
    console.log("insertAccuRecord: komponenList kosong, tb_accu tidak diisi untuk", idPerbaikan);
    return;
  }

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

  const { error } = await supabase.from("tb_accu").insert({
    id_accu: idPerbaikan,
    jenis_kabel: namaKabel.join(", "),
    jenis_sekun: namaSekun.join(", "),
    riwayat_no_kabel: riwayatNoKabel || "",
    riwayat_sisa: riwayatSisa || "", // FIX: sebelumnya nulis ke kolom "riwayat_sisa" yang tidak ada di tabel
  });

  if (error) {
    console.error("Gagal insert tb_accu:", error.message);
  }
}

// Ketika tiket perbaikan berubah status jadi "Selesai", otomatis catat/tambah stok
// di tb_produk_ready (match kategori + mesin saja, kalau ada tinggal +1,
// kalau belum ada bikin baris baru), lalu catat riwayat masuknya di tb_riwayat_produk
// dengan keterangan berisi ID tiket + nama unit.
async function addProdukReadyFromTicket(idPerbaikan, payload) {
  const namaKategori = String(payload.id_kategori_sparepart || "").trim();
  const namaUnit = payload.nama_unit || "";
  const idMesin = payload.id_mesin || "";

  if (!namaKategori) return;

  const { data: kategoriRows, error: kategoriErr } = await supabase
    .from("tb_kategori_sparepart")
    .select("id_kategori")
    .eq("nama_kategori", namaKategori)
    .limit(1);
  if (kategoriErr) throw kategoriErr;

  const idKategori = kategoriRows && kategoriRows.length > 0 ? kategoriRows[0].id_kategori : null;
  if (!idKategori) return;

  const { data: existingRows, error: existingErr } = await supabase
    .from("tb_produk_ready")
    .select("id_produk_ready, jumlah_stok")
    .eq("kategori_produk", idKategori)
    .eq("id_mesin", idMesin)
    .limit(1);
  if (existingErr) throw existingErr;

  let idProdukReady;

  if (existingRows && existingRows.length > 0) {
    idProdukReady = existingRows[0].id_produk_ready;
    const stokBaru = (existingRows[0].jumlah_stok || 0) + 1;

    const { error: updateErr } = await supabase
      .from("tb_produk_ready")
      .update({ jumlah_stok: stokBaru })
      .eq("id_produk_ready", idProdukReady);
    if (updateErr) throw updateErr;
  } else {
    idProdukReady = await generateProdukReadyId();

    const { error: insertErr } = await supabase.from("tb_produk_ready").insert({
      id_produk_ready: idProdukReady,
      kategori_produk: idKategori,
      id_mesin: idMesin,
      jumlah_stok: 1,
      keterangan: "",
    });
    if (insertErr) throw insertErr;
  }

  const idRiwayatProduk = await generateRiwayatProdukId();
  const { error: riwayatErr } = await supabase.from("tb_riwayat_produk").insert({
    id_riwayat_produk: idRiwayatProduk,
    id_produk_ready: idProdukReady,
    jenis_transaksi: "Masuk",
    jumlah: 1,
    tanggal: new Date().toISOString().split("T")[0],
    keterangan: `Produk dari ID tiket ${idPerbaikan} - Unit: ${namaUnit}`,
  });
  if (riwayatErr) throw riwayatErr;
}

// ===== HANDLER UTAMA =====

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { method } = req;

    // ========== GET (semua digabung jadi satu blok) ==========
    if (method === "GET") {
      const { action, id_kategori, id_perbaikan, id_produk_ready } = req.query;

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

      if (action === "getSuratJalan") {
        const { data, error } = await supabase
          .from("tb_surat_jalan")
          .select("*")
          .order("tanggal_kirim", { ascending: false });
        if (error) throw error;
        return res.status(200).json({ success: true, data });
      }

      if (action === "getProdukReady") {
        const { data, error } = await supabase
          .from("tb_produk_ready")
          .select("*")
          .order("id_produk_ready", { ascending: true });
        if (error) throw error;
        return res.status(200).json({ success: true, data });
      }

      if (action === "getRiwayatProduk") {
        let query = supabase
          .from("tb_riwayat_produk")
          .select("*")
          .order("tanggal", { ascending: false });
        if (id_produk_ready) {
          query = query.eq("id_produk_ready", id_produk_ready);
        }
        const { data, error } = await query;
        if (error) throw error;
        return res.status(200).json({ success: true, data });
      }

      if (!action) {
        const { data, error } = await supabase
          .from("tb_perbaikan")
          .select("*")
          .not("status_perbaikan", "in", '("Selesai","Afkir")');
        if (error) throw error;
        return res.status(200).json({ success: true, data });
      }

      return res.status(400).json({ success: false, message: "Action tidak dikenal" });
    }

    // ========== POST (semua digabung jadi satu blok) ==========
    if (method === "POST") {
      const { action } = req.query;

      if (!action) {
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
          await insertAccuRecord(idPerbaikan, payload.komponen, payload.riwayat_no_kabel, payload.riwayat_sisa);
        }

        return res.status(201).json({ success: true, id: idPerbaikan });
      }

      const data = req.body;

      if (action === "addSuratJalan") {
        const jumlahKirim = parseInt(data.jumlah) || 1;
        const id = await generateSuratJalanId();

        const { error } = await supabase.from("tb_surat_jalan").insert({
          id_surat_jalan: id,   // <- baru
          no_surat_jalan: data.no_surat_jalan || "",
          tanggal_kirim: data.tanggal_kirim || new Date().toISOString().split("T")[0],
          tujuan: data.tujuan || "",
          kategori_barang: data.kategori_barang || null,
          id_mesin: data.id_mesin || null,
          jumlah: jumlahKirim,
        });
        if (error) throw error;

        await kurangiStokProdukReady(data.kategori_barang, data.id_mesin, jumlahKirim);

        return res.status(201).json({ success: true, id });
      }

      if (action === "addProdukReady") {
        const id = await generateProdukReadyId();
        const { error } = await supabase.from("tb_produk_ready").insert({
          id_produk_ready: id,
          kategori_produk: data.kategori_produk || null,
          id_mesin: data.id_mesin || "",
          jumlah_stok: parseInt(data.jumlah_stok) || 0,
          keterangan: data.keterangan || "",
        });
        if (error) throw error;
        return res.status(201).json({ success: true, id });
      }

      if (action === "addRiwayatProduk") {
        const jumlah = parseInt(data.jumlah) || 0;
        const jenisTransaksi = data.jenis_transaksi === "Keluar" ? "Keluar" : "Masuk";

        const { data: produkRows, error: produkErr } = await supabase
          .from("tb_produk_ready")
          .select("jumlah_stok")
          .eq("id_produk_ready", data.id_produk_ready)
          .limit(1);
        if (produkErr) throw produkErr;
        if (!produkRows || produkRows.length === 0) {
          return res.status(400).json({ success: false, message: "Produk ready tidak ditemukan" });
        }

        const stokSaatIni = produkRows[0].jumlah_stok || 0;
        const stokBaru =
          jenisTransaksi === "Keluar"
            ? Math.max(0, stokSaatIni - jumlah)
            : stokSaatIni + jumlah;

        const { error: updateErr } = await supabase
          .from("tb_produk_ready")
          .update({ jumlah_stok: stokBaru })
          .eq("id_produk_ready", data.id_produk_ready);
        if (updateErr) throw updateErr;

        const id = await generateRiwayatProdukId();
        const { error: insertErr } = await supabase.from("tb_riwayat_produk").insert({
          id_riwayat_produk: id,
          id_produk_ready: data.id_produk_ready,
          jenis_transaksi: jenisTransaksi,
          jumlah,
          tanggal: data.tanggal || new Date().toISOString().split("T")[0],
          keterangan: data.keterangan || "",
        });
        if (insertErr) throw insertErr;

        return res.status(201).json({ success: true, id });
      }

      return res.status(400).json({ success: false, message: "Action tidak dikenal" });
    }

    // ========== PUT (semua digabung jadi satu blok) ==========
    if (method === "PUT") {
      const { action } = req.query;

      if (!action) {
        const payload = req.body;
        const idPerbaikan = payload.id_perbaikan;

        const { data: oldRows, error: oldErr } = await supabase
          .from("tb_perbaikan")
          .select("status_perbaikan")
          .eq("id_perbaikan", idPerbaikan)
          .limit(1);
        if (oldErr) throw oldErr;
        const statusLama = oldRows && oldRows.length > 0 ? oldRows[0].status_perbaikan : null;

        const updateData = {
          nama_unit: payload.nama_unit || "",
          id_mesin: payload.id_mesin || "",
          id_kategori_sparepart: payload.id_kategori_sparepart || "",
          lokasi_operasi: payload.lokasiOperasi || "",
          status_perbaikan: payload.status,
          tgl_masuk: payload.tgl_masuk || new Date().toISOString().split("T")[0],
          catatan: payload.catatan,
        };
        if (payload.tgl_keluar) updateData.tgl_keluar = payload.tgl_keluar;

        const { error } = await supabase
          .from("tb_perbaikan")
          .update(updateData)
          .eq("id_perbaikan", idPerbaikan);
        if (error) throw error;

        const kategoriLowerPut = String(payload.id_kategori_sparepart || "").toLowerCase().trim();
        const isElektrikPut = kategoriLowerPut.includes("elektrik");
        const isDinRadPut = kategoriLowerPut.includes("dinamo") || kategoriLowerPut.includes("radiator");

        if (payload.komponen && Array.isArray(payload.komponen)) {
          const { data: oldDetails } = await supabase
            .from("tb_detail_perbaikan")
            .select("id_komponen, jumlah")
            .eq("id_perbaikan", idPerbaikan);

          const oldMap = new Map();
          for (const row of (oldDetails || [])) {
            oldMap.set(String(row.id_komponen), parseInt(row.jumlah) || 1);
          }

          const newKomponen = payload.komponen;
          const newMap = new Map();
          for (const comp of newKomponen) {
            newMap.set(String(comp.id_komponen), parseInt(comp.jumlah) || 1);
          }

          const allIds = new Set([...oldMap.keys(), ...newMap.keys()]);

          for (const idKomponen of allIds) {
            const oldQty = oldMap.get(idKomponen) || 0;
            const newQty = newMap.get(idKomponen) || 0;
            const delta = newQty - oldQty;

            if (delta === 0) continue;

            if (delta > 0) {
              if (isElektrikPut) await deductElektrikStock(idKomponen, delta);
              else if (isDinRadPut) await deductDinRadStock(idKomponen, delta, payload.id_mesin);
            } else {
              const restoreQty = Math.abs(delta);
              if (isElektrikPut) await restoreElektrikStock(idKomponen, restoreQty);
              else if (isDinRadPut) await restoreDinRadStock(idKomponen, restoreQty, payload.id_mesin);
            }
          }

          await supabase.from("tb_detail_perbaikan").delete().eq("id_perbaikan", idPerbaikan);
          for (const comp of newKomponen) {
            const jumlah = parseInt(comp.jumlah) || 1;
            await supabase.from("tb_detail_perbaikan").insert({
              id_perbaikan: idPerbaikan,
              id_komponen: comp.id_komponen,
              jumlah,
            });
          }
        }

        // Auto masuk ke stok produk ready hanya saat transisi PERTAMA KALI ke "Selesai"
        if (payload.status === "Selesai" && statusLama !== "Selesai") {
          await addProdukReadyFromTicket(idPerbaikan, payload);
        }

        return res.status(200).json({ success: true });
      }

      const data = req.body;

      if (action === "updateSuratJalan") {
        const { error } = await supabase
          .from("tb_surat_jalan")
          .update({
            no_surat_jalan: data.no_surat_jalan,
            tanggal_kirim: data.tanggal_kirim,
            tujuan: data.tujuan,
            kategori_barang: data.kategori_barang || null,
            id_mesin: data.id_mesin || null,
          })
          .eq("id_surat_jalan", data.id_surat_jalan);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      if (action === "updateProdukReady") {
        const { error } = await supabase
          .from("tb_produk_ready")
          .update({
            kategori_produk: data.kategori_produk,
            id_mesin: data.id_mesin,
            jumlah_stok: parseInt(data.jumlah_stok) || 0,
            keterangan: data.keterangan,
          })
          .eq("id_produk_ready", data.id_produk_ready);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      if (action === "updateRiwayatProduk") {
        const { error } = await supabase
          .from("tb_riwayat_produk")
          .update({
            id_produk_ready: data.id_produk_ready,
            jenis_transaksi: data.jenis_transaksi,
            jumlah: data.jumlah,
            tanggal: data.tanggal,
            keterangan: data.keterangan,
          })
          .eq("id_riwayat_produk", data.id_riwayat_produk);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ success: false, message: "Action tidak dikenal" });
    }

    // ========== DELETE (baru, sebelumnya hilang/rusak) ==========
    if (method === "DELETE") {
      const { action } = req.query;
      const data = req.body || {};

      if (action === "deleteProdukReady") {
        const { error } = await supabase
          .from("tb_produk_ready")
          .delete()
          .eq("id_produk_ready", data.id_produk_ready);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      if (action === "deleteRiwayatProduk") {
        const { error } = await supabase
          .from("tb_riwayat_produk")
          .delete()
          .eq("id_riwayat_produk", data.id_riwayat_produk);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      if (action === "deleteRepair") {
        const { error } = await supabase
          .from("tb_perbaikan")
          .delete()
          .eq("id_perbaikan", data.id_perbaikan);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      if (action === "deleteSuratJalan") {
        const { error } = await supabase
          .from("tb_surat_jalan")
          .delete()
          .eq("id_surat_jalan", data.id_surat_jalan);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }


      return res.status(400).json({ success: false, message: "Action tidak dikenal" });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("Repairs API Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

