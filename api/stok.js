// api/stok.js
// Migrasi dari Google Apps Script -> Supabase
// Menangani: stok elektrik, stok dinamo/radiator, riwayat stok, status restock
import { getSupabase } from "./_lib/supabase.js";
import { handleStockNotification, handleRecoveryNotification } from "./_lib/notify.js";
import { getCorsHeaders, sanitizeError } from "./_lib/helpers.js";

const supabase = getSupabase();

async function generateStokId(prefix) {
  const table = prefix === "STE" ? "tb_stok_elektrik" : "tb_stok_din_rad";
  const idCol = prefix === "STE" ? "id_stok_elektrik" : "id_stok_din_rad";
  const { data, error } = await supabase
    .from(table)
    .select(idCol)
    .like(idCol, `${prefix}-%`);
  if (error) throw error;

  let maxSeq = 0;
  (data || []).forEach((row) => {
    const val = row[idCol];
    const parts = String(val).split("-");
    const num = parseInt(parts[1], 10);
    if (!isNaN(num) && num > maxSeq) maxSeq = num;
  });

  return `${prefix}-${String(maxSeq + 1).padStart(3, "0")}`;
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

export default async function handler(req, res) {
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { method } = req;

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

    if (method === "POST") {
      const { action } = req.query;
      const data = req.body;

      if (action === "addStokElektrik") {
        const id = await generateStokId("STE");
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

      if (action === "addStokDinRad") {
        const id = await generateStokId("SDR");
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
          await supabase
            .from("tb_status_restock")
            .update({ status_dipesan: false, tanggal_restok: new Date().toISOString().split("T")[0] })
            .eq("id_komponen", idKomponenStok);
        }

        return res.status(200).json({ status: "success", stok_saat_ini: stokSaatIni });
      }

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
            .eq("id_komponen", id_komponen)
            .eq("tipe_stok", tipe_stok);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("tb_status_restock").insert({
            id_komponen: id_komponen,
            tipe_stok: tipe_stok,
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
    return res.status(500).json({ success: false, message: sanitizeError(error) });
  }
}
