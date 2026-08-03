// api/stok.js
// Migrasi dari Google Apps Script -> Supabase
// Menangani: stok elektrik, stok dinamo/radiator, riwayat stok, status restock
import { createClient } from "@supabase/supabase-js";
import { handleStockNotification, handleRecoveryNotification } from "./_lib/notify.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function generateStokId(prefix, table) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .like(prefix === "STE" ? "id_stok_elektrik" : "id_stok_din_rad", `${prefix}-%`);
  if (error) throw error;
  const count = (data || []).length + 1;
  return `${prefix}-${String(count).padStart(3, "0")}`;
}

async function generateRiwayatId(isElektrik) {
  const table = isElektrik ? "tb_riwayat_elektrik" : "tb_riwayat_din_rad";
  const prefix = isElektrik ? "RSTE" : "RSDR";
  const { data, error } = await supabase.from(table).select("id_riwayat").like("id_riwayat", `${prefix}-%`);
  if (error) throw error;
  const count = (data || []).length + 1;
  return `${prefix}-${String(count).padStart(3, "0")}`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { method } = req;

    // ===== GET =====
    if (method === "GET") {
      const { action, id_stok } = req.query;

      if (action === "getStokElektrik") {
        const { data, error } = await supabase.from("tb_stok_elektrik").select("*");
        if (error) throw error;
        return res.status(200).json({ success: true, data });
      }

      if (action === "getStokDinRad") {
        const { data, error } = await supabase.from("tb_stok_din_rad").select("*");
        if (error) throw error;
        return res.status(200).json({ success: true, data });
      }

      if (action === "getRiwayatElektrik") {
        const { data, error } = await supabase
          .from("tb_riwayat_elektrik")
          .select("*")
          .eq("id_stok_elektrik", id_stok)
          .order("tgl_transaksi", { ascending: false });
        if (error) throw error;
        return res.status(200).json({ success: true, data });
      }

      if (action === "getRiwayatDinRad") {
        const { data, error } = await supabase
          .from("tb_riwayat_din_rad")
          .select("*")
          .eq("id_stok_din_rad", id_stok)
          .order("tgl_transaksi", { ascending: false });
        if (error) throw error;
        return res.status(200).json({ success: true, data });
      }

      return res.status(400).json({ success: false, message: "Action tidak dikenal" });
    }

    // ===== POST =====
    if (method === "POST") {
      const { action } = req.query;
      const data = req.body;

      // Tambah entri stok elektrik baru
      if (action === "addStokElektrik") {
        const id = await generateStokId("STE", "tb_stok_elektrik");
        const { error } = await supabase.from("tb_stok_elektrik").insert({
          id_stok_elektrik: id,
          id_komponen: data.id_komponen || "",
          nama_komponen: data.nama_komponen || "",
          stok_saat_ini: parseInt(data.stok_saat_ini) || 0,
          batas_minimal: parseInt(data.batas_minimal) || 0,
        });
        if (error) throw error;
        return res.status(201).json({ status: "success", id });
      }

      // Tambah entri stok dinamo/radiator baru
      if (action === "addStokDinRad") {
        const id = await generateStokId("SDR", "tb_stok_din_rad");
        const { error } = await supabase.from("tb_stok_din_rad").insert({
          id_stok_din_rad: id,
          id_komponen: data.id_komponen || "",
          kompatibilitas_unit: data.kompatibilitas_unit || "",
          nama_spesifikasi_barang: data.nama_spesifikasi_barang || "",
          posisi_rak: data.posisi_rak || "",
          stok_saat_ini: parseInt(data.stok_saat_ini) || 0,
          batas_minimal: parseInt(data.batas_minimal) || 0,
        });
        if (error) throw error;
        return res.status(201).json({ status: "success", id });
      }

      // Tambah riwayat transaksi (Masuk/Keluar) + update stok_saat_ini
      if (action === "addRiwayat") {
        const isElektrik = data.tipe === "elektrik";
        const table = isElektrik ? "tb_stok_elektrik" : "tb_stok_din_rad";
        const idCol = isElektrik ? "id_stok_elektrik" : "id_stok_din_rad";
        const idStok = String(data.id_stok);
        const jumlah = parseInt(data.jumlah) || 0;
        const jenis = data.jenis_transaksi;

        const { data: stokRows, error: stokErr } = await supabase
          .from(table)
          .select("*")
          .eq(idCol, idStok)
          .limit(1);
        if (stokErr) throw stokErr;
        if (!stokRows || stokRows.length === 0) {
          return res.status(404).json({ status: "error", message: "ID Stok tidak ditemukan: " + idStok });
        }

        const stokLama = stokRows[0].stok_saat_ini || 0;
        const idKomponenStok = stokRows[0].id_komponen;
        const batasMinimal = stokRows[0].batas_minimal || 0;
        const namaKomponen = isElektrik ? stokRows[0].nama_komponen : stokRows[0].nama_spesifikasi_barang;

        let stokSaatIni = stokLama;
        if (jenis === "Masuk") stokSaatIni += jumlah;
        else if (jenis === "Keluar") stokSaatIni = Math.max(0, stokSaatIni - jumlah);

        const { error: updateErr } = await supabase
          .from(table)
          .update({ stok_saat_ini: stokSaatIni })
          .eq(idCol, idStok);
        if (updateErr) throw updateErr;

        const idRiwayat = await generateRiwayatId(isElektrik);
        const riwayatTable = isElektrik ? "tb_riwayat_elektrik" : "tb_riwayat_din_rad";
        const { error: riwayatErr } = await supabase.from(riwayatTable).insert({
          id_riwayat: idRiwayat,
          [idCol]: idStok,
          jenis_transaksi: jenis,
          jumlah,
          tgl_transaksi: data.tgl_transaksi || new Date().toISOString().split("T")[0],
          keterangan: data.keterangan || "",
        });
        if (riwayatErr) throw riwayatErr;

        const tipeStok = isElektrik ? "elektrik" : "din_rad";
        if (jenis === "Keluar") {
          await handleStockNotification(idKomponenStok, stokSaatIni, batasMinimal, tipeStok, namaKomponen);
        } else if (jenis === "Masuk") {
          await handleRecoveryNotification(idKomponenStok, stokLama, stokSaatIni, batasMinimal, tipeStok, namaKomponen);
          // Barang sudah datang -> reset status restock kalau sebelumnya sudah dipesan
          await supabase
            .from("tb_status_restock")
            .update({ status_dipesan: false, tanggal_restok: new Date().toISOString().split("T")[0] })
            .eq("id_komponen", idKomponenStok);
        }

        return res.status(200).json({ status: "success", stok_saat_ini: stokSaatIni });
      }

      // Tandai komponen sudah dipesan (restock)
      if (action === "markAsDipesan") {
        const { id_komponen, tipe_stok } = data;

        const { data: existing } = await supabase
          .from("tb_status_restock")
          .select("id_komponen")
          .eq("id_komponen", id_komponen)
          .limit(1);

        if (existing && existing.length > 0) {
          const { error } = await supabase
            .from("tb_status_restock")
            .update({ status_dipesan: true, last_reminder: new Date().toISOString() })
            .eq("id_komponen", id_komponen);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("tb_status_restock").insert({
            id_komponen,
            tipe_stok,
            status_dipesan: true,
            first_alert: new Date().toISOString(),
            last_reminder: new Date().toISOString(),
          });
          if (error) throw error;
        }

        return res.status(200).json({ status: "success" });
      }

      return res.status(400).json({ success: false, message: "Action tidak dikenal" });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("Stok API Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}