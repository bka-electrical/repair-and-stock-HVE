// api/surat-jalan.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function generateSuratJalanId() {
  const { data, error } = await supabase
    .from("tb_surat_jalan")
    .select("id_surat_jalan")
    .like("id_surat_jalan", "SJ-%");
  if (error) throw error;
  const count = (data || []).length + 1;
  return `SJ-${String(count).padStart(3, "0")}`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { method } = req;

    // GET - Ambil semua surat jalan (atau 1 by id lewat query ?id=...)
    if (method === "GET") {
      const { id } = req.query;

      if (id) {
        const { data, error } = await supabase
          .from("tb_surat_jalan")
          .select("*")
          .eq("id_surat_jalan", id)
          .limit(1);
        if (error) throw error;
        return res.status(200).json({ success: true, data: data?.[0] || null });
      }

      const { data, error } = await supabase
        .from("tb_surat_jalan")
        .select("*")
        .order("tanggal_kirim", { ascending: false });
      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

    // POST - Tambah surat jalan baru
    if (method === "POST") {
      const body = req.body;
      const id = await generateSuratJalanId();

      const { error } = await supabase.from("tb_surat_jalan").insert({
        id_surat_jalan: id,
        no_surat_jalan: body.no_surat_jalan || "",
        tanggal_kirim: body.tanggal_kirim || new Date().toISOString().split("T")[0],
        tujuan: body.tujuan || "",
        nama_unit: body.nama_unit || "",
        nama_barang: body.nama_barang || "",
      });
      if (error) throw error;

      return res.status(201).json({ success: true, id });
    }

    // PUT - Update surat jalan
    if (method === "PUT") {
      const body = req.body;
      const { id_surat_jalan } = body;

      const { data: existing } = await supabase
        .from("tb_surat_jalan")
        .select("id_surat_jalan")
        .eq("id_surat_jalan", id_surat_jalan)
        .limit(1);

      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: "Surat jalan tidak ditemukan" });
      }

      const { error } = await supabase
        .from("tb_surat_jalan")
        .update({
          no_surat_jalan: body.no_surat_jalan,
          tanggal_kirim: body.tanggal_kirim,
          tujuan: body.tujuan,
          nama_unit: body.nama_unit,
          nama_barang: body.nama_barang,
        })
        .eq("id_surat_jalan", id_surat_jalan);
      if (error) throw error;

      return res.status(200).json({ success: true });
    }

    // DELETE - Hapus surat jalan
    if (method === "DELETE") {
      const { id } = req.query;

      const { data: existing } = await supabase
        .from("tb_surat_jalan")
        .select("id_surat_jalan")
        .eq("id_surat_jalan", id)
        .limit(1);

      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: "Surat jalan tidak ditemukan" });
      }

      const { error } = await supabase.from("tb_surat_jalan").delete().eq("id_surat_jalan", id);
      if (error) throw error;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("Surat Jalan API Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}