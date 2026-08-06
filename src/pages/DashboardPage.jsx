import React, { useMemo, useState } from "react";
import { Activity, Box, CheckCircle, Globe, Package, Sparkles, Truck, Wrench, Hammer } from "lucide-react";

const overviewItems = [
  { label: "Dinamo Amper", keywords: ["dinamo amper", "amper", "dinamo"], color: "from-amber-500 to-orange-500" },
  { label: "Dinamo Starter", keywords: ["dinamo starter", "starter"], color: "from-cyan-500 to-blue-500" },
  { label: "Radiator", keywords: ["radiator"], color: "from-violet-500 to-fuchsia-500" },
  { label: "Elektrik SPIL", keywords: ["elektrik spil", "spil", "elektrik"], color: "from-emerald-500 to-teal-500" },
  { label: "Elektrik Maker", keywords: ["elektrik maker", "maker"], color: "from-indigo-500 to-sky-500" },
  { label: "Accu", keywords: ["accu"], color: "from-yellow-500 to-amber-500" }
];

const normalizeText = (value) => String(value || "").toLowerCase();

const matchesKeywords = (repair, keywords) => {
  const text = [repair.nama_unit, repair.id_kategori_sparepart, repair.lokasiOperasi]
    .map(normalizeText)
    .join(" ");
  return keywords.some(keyword => text.includes(keyword));
};

export default function DashboardPage({
  activeRepairs,
  archiveRepairs,
  stockSummary,
  onNavigateRepair,
  onNavigateStock,
  onNavigateArchive,
  onNavigateTerkirim,
  onNavigateRepairWithCategory,
  onNavigateDinamoReady,
  dinamoReadyCount,
}) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [locale, setLocale] = useState('id');

  const text = {
    id: {
      company: 'HVE ELECTRICAL SPIL',
      headerTitle: 'Dasbor Utama',
      headerSubtitle: 'Ringkas aktivitas servis dan stok komponen dalam satu tampilan.',
      quickAction: 'Aksi Cepat',
      quickSubtitle: 'Mulai dari sini',
      repairButton: 'Perbaikan',
      repairButtonSubtitle: 'Langsung ke sistem servis bengkel.',
      stockButton: 'Suku Cadang',
      stockButtonSubtitle: 'Buka halaman stok komponen.',
      statsLabel: 'Statistik Overview',
      statsHeading: 'Jumlah tugas sedang berjalan',
      ongoing: 'Tugas Berlangsung',
      noTasks: 'Belum ada tugas aktif.',
       done: 'Tugas Selesai',
       doneSubtitle: 'Lihat riwayat perbaikan yang telah selesai.',
       sent: 'Terkirim',
       sentSubtitle: 'Lihat halaman surat jalan yang terkirim.',
       dinamoReady: 'Dinamo Ready',
       dinamoReadySubtitle: 'Kelola dinamo siap pasang.',
      summaryLabel: 'Ringkasan Suku Cadang',
      summaryHeading: 'Stok Penting',
      outOfStock: 'Habis',
      lowStock: 'Menipis',
      stockInfo: 'Buka halaman stok untuk menindaklanjuti.',
      lowStockInfo: 'Buka stok komponen untuk cek ketersediaan.',
      detailTask: 'Detail Task',
      status: 'Status',
      location: 'Lokasi',
      serviceDescription: 'Dummy detail servis: pengecekan komponen utama, perbaikan sistem kelistrikan, dan persiapan penggantian bagian bila diperlukan.',
      unit: 'Unit',
      machine: 'Mesin',
      entryDate: 'Tgl Masuk',
      closeButton: 'Tutup',
      openService: 'Buka Sistem Servis'
    },
    en: {
      company: 'HVE ELECTRICAL SPIL',
      headerTitle: 'Main Dashboard',
      headerSubtitle: 'Summarizes service activity and component stock in one view.',
      quickAction: 'Quick Actions',
      quickSubtitle: 'Start from here',
      repairButton: 'Repair',
      repairButtonSubtitle: 'Go to the workshop service system.',
      stockButton: 'Spare Parts',
      stockButtonSubtitle: 'Open the component stock page.',
      statsLabel: 'Statistics Overview',
      statsHeading: 'Number of ongoing tasks',
      ongoing: 'Ongoing Tasks',
      noTasks: 'No active tasks yet.',
      done: 'Completed Tasks',
      doneSubtitle: 'View completed repair history.',
      sent: 'Sent',
      sentSubtitle: 'Sent page is not filled yet.',
      summaryLabel: 'Spare Parts Summary',
      summaryHeading: 'Important Stock',
      outOfStock: 'Out of Stock',
      lowStock: 'Low Stock',
      stockInfo: 'Open stock page to follow up.',
      lowStockInfo: 'Open component stock to check availability.',
      detailTask: 'Task Details',
      status: 'Status',
      location: 'Location',
      serviceDescription: 'Dummy service details: checking main components, electrical system repairs, and preparing part replacements if needed.',
      unit: 'Unit',
      machine: 'Machine',
      entryDate: 'Entry Date',
      closeButton: 'Close',
      openService: 'Open Service System'
    }
  };

  const t = text[locale];

  const overviewData = useMemo(() => {
    return overviewItems.map(item => ({
      ...item,
      count: activeRepairs.filter(repair => matchesKeywords(repair, item.keywords)).length
    }));
  }, [activeRepairs]);

  const latestTasks = useMemo(() => {
    return [...activeRepairs]
      .sort((a, b) => {
        const aDate = new Date(a.tgl_masuk || 0).getTime();
        const bDate = new Date(b.tgl_masuk || 0).getTime();
        return bDate - aDate;
      })
      .slice(0, 5);
  }, [activeRepairs]);

  const completedCount = archiveRepairs.length;
  const inProgressCount = activeRepairs.length;
  const sentCount = 0;

  return (
    <div className="min-h-screen text-slate-100" style={{ backgroundImage: "url('/background.webp')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      <div className="min-h-screen bg-slate-950/90 backdrop-blur-sm">
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
          <div className="w-[80vw] max-w-[1400px] mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-400">{t.company}</p>
              <h1 className="mt-2 text-3xl font-bold text-white">{t.headerTitle}</h1>
              <p className="mt-2 text-sm text-slate-400">{t.headerSubtitle}</p>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <div className="inline-flex rounded-full border border-slate-700 bg-slate-900/80 p-1 shadow-inner shadow-black/10">
                <button onClick={() => setLocale('id')} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${locale === 'id' ? 'bg-emerald-500 text-slate-950 shadow-inner shadow-emerald-500/20' : 'text-slate-300 hover:text-white'}`}>
                  ID
                </button>
                <button onClick={() => setLocale('en')} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${locale === 'en' ? 'bg-emerald-500 text-slate-950 shadow-inner shadow-emerald-500/20' : 'text-slate-300 hover:text-white'}`}>
                  EN
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-[80vw] max-w-[1400px] mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-400">{t.quickAction}</p>
              <h2 className="text-2xl font-bold text-white">{t.quickSubtitle}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <button onClick={onNavigateRepair} className="group rounded-3xl border border-slate-800 bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-left shadow-xl transition hover:-translate-y-1 hover:shadow-2xl">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white shadow-sm">
                <Wrench size={28} />
              </div>
              <p className="text-lg font-semibold text-white">{t.repairButton}</p>
              <p className="mt-2 text-sm text-slate-300">{t.repairButtonSubtitle}</p>
            </button>

            <button onClick={onNavigateStock} className="group rounded-3xl border border-slate-800 bg-gradient-to-br from-pink-600 to-fuchsia-600 p-6 text-left shadow-xl transition hover:-translate-y-1 hover:shadow-2xl">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white shadow-sm">
                <Package size={28} />
              </div>
              <p className="text-lg font-semibold text-white">{t.stockButton}</p>
              <p className="mt-2 text-sm text-slate-300">{t.stockButtonSubtitle}</p>
            </button>

            <button onClick={onNavigateTerkirim} className="group rounded-3xl border border-slate-800 bg-gradient-to-br from-purple-600 to-indigo-600 p-6 text-left shadow-xl transition hover:-translate-y-1 hover:shadow-2xl">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white shadow-sm">
                <Truck size={28} />
              </div>
              <p className="text-lg font-semibold text-white">{t.sent}</p>
              <p className="mt-2 text-sm text-slate-300">{t.sentSubtitle}</p>
            </button>

            <button onClick={onNavigateDinamoReady} className="group rounded-3xl border border-slate-800 bg-gradient-to-br from-amber-600 to-orange-600 p-6 text-left shadow-xl transition hover:-translate-y-1 hover:shadow-2xl">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white shadow-sm">
                <Hammer size={28} />
              </div>
              <p className="text-lg font-semibold text-white">{t.dinamoReady}</p>
              <p className="mt-2 text-sm text-slate-300">{t.dinamoReadySubtitle}</p>
            </button>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">{t.statsLabel}</p>
              <h2 className="mt-2 text-2xl font-bold text-white">{t.statsHeading}</h2>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              {overviewData.map(item => (
                <div key={item.label} className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-400">{item.label}</p>
                      <p className="mt-3 text-3xl font-semibold text-white">{item.count}</p>
                    </div>
                    <div className={`h-12 w-12 rounded-3xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white`}>
                      <Sparkles size={22} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {overviewItems.map((item) => {
                const categoryTasks = activeRepairs.filter(repair => matchesKeywords(repair, item.keywords));
                const sortedTasks = [...categoryTasks]
                  .sort((a, b) => new Date(b.tgl_masuk || 0) - new Date(a.tgl_masuk || 0))
                  .slice(0, 5);
                return (
                  <button
                    key={item.label}
                    onClick={() => onNavigateRepairWithCategory && onNavigateRepairWithCategory(item.keywords[0])}
                    className="group rounded-3xl border border-slate-800 bg-slate-900/90 p-4 text-left shadow-sm transition hover:border-emerald-400 max-h-[380px] overflow-hidden flex h-full flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">{item.label}</p>
                        <p className="mt-2 text-3xl font-bold text-white">{categoryTasks.length}</p>
                      </div>
                      <div className={`rounded-2xl bg-slate-800 p-3 text-emerald-400`}>
                        <Activity size={20} />
                      </div>
                    </div>
                    <div className="mt-4 max-h-[220px] space-y-2 overflow-y-auto pr-1">
                      {sortedTasks.length === 0 ? (
                        <p className="text-sm text-slate-400">{t.noTasks}</p>
                      ) : sortedTasks.map(task => (
                        <div key={task.id_perbaikan} onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setSelectedTask(task); } }} role="button" tabIndex={0} className="w-full rounded-3xl border border-slate-800 bg-slate-950/80 px-3 py-3 text-left transition hover:border-emerald-400 cursor-pointer">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-white">{task.nama_unit || task.id_perbaikan || "Tugas Baru"}</p>
                            <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300">{task.status_perbaikan || "Dalam Pengerjaan"}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{task.lokasiOperasi || "Lokasi tidak tersedia"}</p>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}

              <button onClick={onNavigateArchive} className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 text-left shadow-sm transition hover:border-sky-400 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">{t.done}</p>
                    <p className="mt-2 text-3xl font-bold text-white">{completedCount}</p>
                    <p className="mt-2 text-sm text-slate-400">{t.doneSubtitle}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-800 p-3 text-sky-400">
                    <CheckCircle size={20} />
                  </div>
                </div>
              </button>

               <button onClick={onNavigateTerkirim} className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 text-left shadow-sm transition hover:border-purple-400 h-full flex flex-col justify-between">
                 <div className="flex items-start justify-between gap-3">
                   <div>
                     <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">{t.sent}</p>
                     <p className="mt-2 text-3xl font-bold text-white">{sentCount}</p>
                     <p className="mt-2 text-sm text-slate-400">{t.sentSubtitle}</p>
                   </div>
                   <div className="rounded-2xl bg-slate-800 p-3 text-purple-400">
                     <Truck size={20} />
                   </div>
                 </div>
               </button>

               <button onClick={onNavigateDinamoReady} className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 text-left shadow-sm transition hover:border-amber-400 h-full flex flex-col justify-between">
                 <div className="flex items-start justify-between gap-3">
                   <div>
                     <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">{t.dinamoReady}</p>
                     <p className="mt-2 text-3xl font-bold text-white">{dinamoReadyCount}</p>
                     <p className="mt-2 text-sm text-slate-400">{t.dinamoReadySubtitle}</p>
                   </div>
                   <div className="rounded-2xl bg-slate-800 p-3 text-amber-400">
                     <Hammer size={20} />
                   </div>
                 </div>
               </button>
             </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">{t.summaryLabel}</p>
              <h2 className="mt-2 text-2xl font-bold text-white">{t.summaryHeading}</h2>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <button onClick={onNavigateStock} className="group rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-left shadow transition hover:border-red-400">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-red-300">{t.outOfStock}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{stockSummary?.outOfStock ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-red-500/10 p-3 text-red-300">
                  <Box size={24} />
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-400">{t.stockInfo}</p>
            </button>

            <button onClick={onNavigateStock} className="group rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-left shadow transition hover:border-yellow-400">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">{t.lowStock}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{stockSummary?.lowStock ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-yellow-500/10 p-3 text-yellow-300">
                  <Package size={24} />
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-400">{t.lowStockInfo}</p>
            </button>
          </div>
        </section>
      </main>

      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-emerald-400">{t.detailTask}</p>
                <h3 className="mt-2 text-2xl font-bold text-white">{selectedTask.nama_unit || selectedTask.id_perbaikan}</h3>
              </div>
              <button onClick={() => setSelectedTask(null)} className="rounded-full border border-slate-700 bg-slate-950 p-3 text-slate-300 transition hover:bg-slate-900">×</button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-500 uppercase">{t.status}</p>
                <p className="mt-2 text-lg font-semibold text-white">{selectedTask.status_perbaikan || "Dalam Pengerjaan"}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-500 uppercase">{t.location}</p>
                <p className="mt-2 text-lg font-semibold text-white">{selectedTask.lokasiOperasi || "-"}</p>
              </div>
            </div>
            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-sm font-semibold text-slate-300">{t.serviceDescription}</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">{t.serviceDescription}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl bg-slate-900 p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t.unit}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selectedTask.nama_unit || "-"}</p>
                </div>
                <div className="rounded-3xl bg-slate-900 p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t.machine}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selectedTask.id_mesin || "-"}</p>
                </div>
                <div className="rounded-3xl bg-slate-900 p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t.entryDate}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selectedTask.tgl_masuk ? new Date(selectedTask.tgl_masuk).toLocaleDateString("id-ID") : "-"}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button onClick={() => setSelectedTask(null)} className="inline-flex items-center justify-center rounded-3xl border border-slate-800 bg-slate-950 px-5 py-3 text-sm text-slate-300 transition hover:bg-slate-900">{t.closeButton}</button>
              <button onClick={() => { onNavigateRepair(); setSelectedTask(null); }} className="inline-flex items-center justify-center rounded-3xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">{t.openService}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
