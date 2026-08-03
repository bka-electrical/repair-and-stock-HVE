// api/_lib/notify.js
// Modul shared untuk notifikasi WhatsApp stok habis/menipis/recovery.
// File diawali underscore (folder _lib) supaya Vercel TIDAK menganggapnya
// sebagai endpoint API tersendiri -- ini murni helper yang diimport file lain.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const WHATSAPP_PHONE = process.env.WHATSAPP_PHONE || "";
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || "";
const REMINDER_COOLDOWN_HOURS = 168; // 7 hari, sama seperti logic Apps Script asli

async function sendWhatsAppNotification(message) {
  if (!WHATSAPP_PHONE || !WHATSAPP_API_KEY) {
    console.log("WhatsApp belum dikonfigurasi, notifikasi dilewati");
    return;
  }
  try {
    const url =
      "https://api.callmebot.com/whatsapp.php?phone=" +
      encodeURIComponent(WHATSAPP_PHONE) +
      "&text=" +
      encodeURIComponent(message) +
      "&apikey=" +
      encodeURIComponent(WHATSAPP_API_KEY);
    await fetch(url);
  } catch (e) {
    console.error("Gagal kirim notifikasi WhatsApp:", e.message);
  }
}

async function getRestockStatus(idKomponen, tipeStok) {
  const { data } = await supabase
    .from("tb_status_restock")
    .select("*")
    .eq("id_komponen", idKomponen)
    .eq("tipe_stok", tipeStok)
    .limit(1);
  return data && data.length > 0 ? data[0] : null;
}

async function shouldSendNotification(idKomponen, tipeStok) {
  const status = await getRestockStatus(idKomponen, tipeStok);
  if (!status || !status.last_reminder) return true;

  const lastReminder = new Date(status.last_reminder);
  if (isNaN(lastReminder.getTime())) return true;

  const hoursDiff = (new Date() - lastReminder) / (1000 * 60 * 60);
  return hoursDiff >= REMINDER_COOLDOWN_HOURS;
}

async function markNotificationSent(idKomponen, tipeStok) {
  const status = await getRestockStatus(idKomponen, tipeStok);
  const now = new Date().toISOString();

  if (status) {
    await supabase
      .from("tb_status_restock")
      .update({ last_reminder: now })
      .eq("id_komponen", idKomponen);
  } else {
    await supabase.from("tb_status_restock").insert({
      id_komponen: idKomponen,
      tipe_stok: tipeStok,
      first_alert: now,
      last_reminder: now,
      status_dipesan: false,
    });
  }
}

// Dipanggil setelah stok berkurang -- kirim notif kalau habis atau di bawah batas minimal
export async function handleStockNotification(idKomponen, newStok, batasMinimal, tipeStok, namaKomponen) {
  const label = tipeStok === "elektrik" ? "Elektrik" : "Dinamo/Radiator";
  const nama = namaKomponen || idKomponen;

  if (newStok === 0) {
    await sendWhatsAppNotification(`🚨 STOK HABIS: ${nama} (${label})`);
    await markNotificationSent(idKomponen, tipeStok);
    return;
  }

  if (newStok <= batasMinimal) {
    if (await shouldSendNotification(idKomponen, tipeStok)) {
      await sendWhatsAppNotification(
        `⚠️ STOK MENIPIS: ${nama} (${label}) - Sisa: ${newStok}, Batas Minimal: ${batasMinimal}`
      );
      await markNotificationSent(idKomponen, tipeStok);
    }
  }
}

// Dipanggil setelah stok bertambah (misal ada barang masuk) -- kirim notif kalau balik normal
export async function handleRecoveryNotification(idKomponen, oldStok, newStok, batasMinimal, tipeStok, namaKomponen) {
  const nama = namaKomponen || idKomponen;

  if (oldStok <= batasMinimal && newStok > batasMinimal) {
    if (await shouldSendNotification(idKomponen, tipeStok)) {
      const label = tipeStok === "elektrik" ? "Elektrik" : "Dinamo/Radiator";
      await sendWhatsAppNotification(`✅ STOK RECOVERY: ${nama} (${label}) - Stok kembali normal: ${newStok}`);
      await markNotificationSent(idKomponen, tipeStok);
    }
  }
}