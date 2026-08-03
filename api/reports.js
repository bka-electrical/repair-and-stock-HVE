// api/reports.js
// Migrasi dari Google Sheets API -> Supabase
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).json({});

  try {
    // GET - Ambil semua data laporan
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("laporan")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const mapped = data.map((row) => ({
        id: row.id,
        tanggal: row.tanggal,
        lokasi: row.lokasi,
        namaProyek: row.nama_proyek,
        jenisKegiatan: row.jenis_kegiatan,
        unitAlat: row.unit_alat,
        deskripsi: row.deskripsi,
        status: row.status,
        jamMulai: row.jam_mulai,
        jamSelesai: row.jam_selesai,
        catatan: row.catatan,
        createdAt: row.created_at,
      }));

      return res.status(200).json({ success: true, data: mapped });
    }

    // POST - Tambah data baru
    if (req.method === "POST") {
      const data = req.body;

      const { error } = await supabase.from("laporan").insert({
        id: data.id,
        tanggal: data.tanggal,
        lokasi: data.lokasi,
        nama_proyek: data.namaProyek,
        jenis_kegiatan: data.jenisKegiatan,
        unit_alat: data.unitAlat || "",
        deskripsi: data.deskripsi,
        status: data.status,
        jam_mulai: data.jamMulai || "",
        jam_selesai: data.jamSelesai || "",
        catatan: data.catatan || "",
        created_at: data.createdAt || new Date().toISOString(),
      });
      if (error) throw error;

      return res.status(201).json({ success: true, message: "Data berhasil ditambahkan" });
    }

    // PUT - Update data
    if (req.method === "PUT") {
      const data = req.body;

      const { data: existing } = await supabase
        .from("laporan")
        .select("id")
        .eq("id", data.id)
        .limit(1);

      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: "Data tidak ditemukan" });
      }

      const { error } = await supabase
        .from("laporan")
        .update({
          tanggal: data.tanggal,
          lokasi: data.lokasi,
          nama_proyek: data.namaProyek,
          jenis_kegiatan: data.jenisKegiatan,
          unit_alat: data.unitAlat || "",
          deskripsi: data.deskripsi,
          status: data.status,
          jam_mulai: data.jamMulai || "",
          jam_selesai: data.jamSelesai || "",
          catatan: data.catatan || "",
        })
        .eq("id", data.id);
      if (error) throw error;

      return res.status(200).json({ success: true, message: "Data berhasil diupdate" });
    }

    // DELETE - Hapus data
    if (req.method === "DELETE") {
      const { id } = req.query;

      const { data: existing } = await supabase
        .from("laporan")
        .select("id")
        .eq("id", id)
        .limit(1);

      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: "Data tidak ditemukan" });
      }

      const { error } = await supabase.from("laporan").delete().eq("id", id);
      if (error) throw error;

      return res.status(200).json({ success: true, message: "Data berhasil dihapus" });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("Reports API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message,
    });
  }
}