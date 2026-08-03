// api/tasks.js
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
    // GET - Ambil semua task
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const mapped = data.map((row) => ({
        id: row.id,
        namaTask: row.nama_task,
        deskripsi: row.deskripsi,
        prioritas: row.prioritas,
        deadline: row.deadline,
        progress: row.progress,
        status: row.status,
        createdAt: row.created_at,
        // progress_logs sekarang tipe jsonb, jadi sudah otomatis jadi array, tidak perlu JSON.parse lagi
        progressLogs: row.progress_logs || [],
      }));

      return res.status(200).json({ success: true, data: mapped });
    }

    // POST - Tambah task baru
    if (req.method === "POST") {
      const data = req.body;
      const progress = data.progress || 0;

      const { error } = await supabase.from("tasks").insert({
        id: data.id,
        nama_task: data.namaTask,
        deskripsi: data.deskripsi,
        prioritas: data.prioritas || "medium",
        deadline: data.deadline || null,
        progress,
        status: progress >= 100 ? "selesai" : "berlangsung",
        created_at: data.createdAt || new Date().toISOString(),
        progress_logs: data.progressLogs || [],
      });
      if (error) throw error;

      return res.status(201).json({ success: true, message: "Task berhasil ditambahkan" });
    }

    // PUT - Update task
    if (req.method === "PUT") {
      const data = req.body;

      const { data: existing } = await supabase
        .from("tasks")
        .select("id")
        .eq("id", String(data.id))
        .limit(1);

      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: "Task tidak ditemukan" });
      }

      const progress = data.progress || 0;

      const { error } = await supabase
        .from("tasks")
        .update({
          nama_task: data.namaTask,
          deskripsi: data.deskripsi,
          prioritas: data.prioritas || "medium",
          deadline: data.deadline || null,
          progress,
          status: progress >= 100 ? "selesai" : "berlangsung",
          progress_logs: data.progressLogs || [],
        })
        .eq("id", data.id);
      if (error) throw error;

      return res.status(200).json({ success: true, message: "Task berhasil diupdate" });
    }

    // DELETE - Hapus task
    if (req.method === "DELETE") {
      const { id } = req.query;

      const { data: existing } = await supabase
        .from("tasks")
        .select("id")
        .eq("id", String(id))
        .limit(1);

      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: "Task tidak ditemukan" });
      }

      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;

      return res.status(200).json({ success: true, message: "Task berhasil dihapus" });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("Tasks API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message,
    });
  }
}