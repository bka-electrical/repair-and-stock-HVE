// api/spareparts.js
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
    // GET - Ambil semua sparepart
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("spareparts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Mapping ke nama field lama (camelCase) biar frontend nggak perlu diubah
      const mapped = data.map((row) => ({
        id: row.id,
        namaPart: row.nama_part,
        deskripsi: row.deskripsi,
        jumlah: row.jumlah,
        unit: row.unit,
        status: row.status,
        tanggalDipesan: row.tanggal_dipesan,
        tanggalDatang: row.tanggal_datang,
        createdBy: row.created_by,
        createdAt: row.created_at,
      }));

      return res.status(200).json({ success: true, data: mapped });
    }

    // POST - Tambah sparepart baru
    if (req.method === "POST") {
      const { namaPart, deskripsi, jumlah, unit, createdBy } = req.body;
      const id = Date.now().toString();
      const createdAt = new Date().toISOString();

      const { error } = await supabase.from("spareparts").insert({
        id,
        nama_part: namaPart,
        deskripsi,
        jumlah,
        unit,
        status: "pending",
        tanggal_dipesan: null,
        tanggal_datang: null,
        created_by: createdBy,
        created_at: createdAt,
      });
      if (error) throw error;

      return res.status(201).json({
        success: true,
        data: {
          id,
          namaPart,
          deskripsi,
          jumlah,
          unit,
          status: "pending",
          tanggalDipesan: "",
          tanggalDatang: "",
          createdBy,
          createdAt,
        },
      });
    }

    // PUT - Update sparepart
    if (req.method === "PUT") {
      const {
        id,
        namaPart,
        deskripsi,
        jumlah,
        unit,
        status,
        tanggalDipesan,
        tanggalDatang,
      } = req.body;

      const { data: existing } = await supabase
        .from("spareparts")
        .select("id")
        .eq("id", id)
        .limit(1);

      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, error: "Sparepart tidak ditemukan" });
      }

      const { error } = await supabase
        .from("spareparts")
        .update({
          nama_part: namaPart,
          deskripsi,
          jumlah,
          unit,
          status,
          tanggal_dipesan: tanggalDipesan || null,
          tanggal_datang: tanggalDatang || null,
        })
        .eq("id", id);
      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: { id, namaPart, deskripsi, jumlah, unit, status, tanggalDipesan, tanggalDatang },
      });
    }

    // DELETE - Hapus sparepart
    if (req.method === "DELETE") {
      const { id } = req.body;

      const { data: existing } = await supabase
        .from("spareparts")
        .select("id")
        .eq("id", id)
        .limit(1);

      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, error: "Sparepart tidak ditemukan" });
      }

      const { error } = await supabase.from("spareparts").delete().eq("id", id);
      if (error) throw error;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (error) {
    console.error("Spareparts API Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}