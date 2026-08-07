// api/status-restock.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { method } = req;

    // GET - Ambil semua status restock, atau 1 by id_komponen
    if (method === "GET") {
      const { id_komponen } = req.query;

      if (id_komponen) {
        const { data, error } = await supabase
          .from("tb_status_restock")
          .select("*")
          .eq("id_komponen", id_komponen)
          .limit(1);
        if (error) throw error;
        return res.status(200).json({ success: true, data: data?.[0] || null });
      }

      const { data, error } = await supabase.from("tb_status_restock").select("*");
      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

    // POST - digunakan untuk 3 aksi berbeda lewat query ?action=...
    if (method === "POST") {
      const { action } = req.query;
      const body = req.body;
      const { id_komponen, tipe_stok } = body;

      if (!id_komponen) {
        return res.status(400).json({ success: false, message: "id_komponen wajib diisi" });
      }

      const { data: existing } = await supabase
        .from("tb_status_restock")
        .select("*")
        .eq("id_komponen", id_komponen)
        .limit(1);

      // action=alert -> catat/perbarui alert stok menipis (dipanggil otomatis saat stok <= batas_minimal)
      if (action === "alert") {
        if (existing && existing.length > 0) {
          const { error } = await supabase
            .from("tb_status_restock")
            .update({ last_reminder: new Date().toISOString() })
            .eq("id_komponen", id_komponen);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("tb_status_restock").insert({
            id_komponen,
            tipe_stok,
            first_alert: new Date().toISOString(),
            last_reminder: new Date().toISOString(),
            status_dipesan: false,
          });
          if (error) throw error;
        }
        return res.status(200).json({ success: true });
      }

      // action=markDipesan -> tandai komponen sudah dipesan ke supplier
      if (action === "markDipesan" || !action) {
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
        return res.status(200).json({ success: true });
      }

      // action=selesai -> barang sudah datang, reset status & catat tanggal restok
      if (action === "selesai") {
        const { error } = await supabase
          .from("tb_status_restock")
          .update({
            status_dipesan: false,
            tanggal_restok: new Date().toISOString().split("T")[0],
          })
          .eq("id_komponen", id_komponen);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ success: false, message: "Action tidak dikenal" });
    }

    // DELETE - Hapus status restock (misal kalau komponen sudah tidak dipantau lagi)
    if (method === "DELETE") {
      const { id_komponen } = req.query;
      const { error } = await supabase.from("tb_status_restock").delete().eq("id_komponen", id_komponen);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("Status Restock API Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}