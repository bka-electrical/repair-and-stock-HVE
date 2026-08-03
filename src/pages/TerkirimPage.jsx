import React from "react";
import { ArrowLeft, Truck } from "lucide-react";

export default function TerkirimPage({ onBack }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-200 transition hover:bg-slate-900">
              <ArrowLeft size={20} />
            </button>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-purple-300">Terkirim</p>
              <h1 className="mt-2 text-3xl font-bold text-white">Halaman Terkirim</h1>
              <p className="mt-2 text-sm text-slate-400">Placeholder halaman terkirim - bisa disesuaikan nanti.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-500/15 text-purple-300">
              <Truck size={28} />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Terkirim</p>
              <p className="mt-2 text-slate-400">Saat ini halaman ini berfungsi sebagai placeholder untuk status terkirim.</p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl bg-slate-950 p-6 text-slate-300">
            <p className="text-sm text-slate-500">Info</p>
            <p className="mt-4 text-base leading-7">Halaman ini akan ditambahkan fungsionalitas khusus untuk menampilkan data terkirim ketika struktur bisnis dan kebutuhan sudah ditentukan.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
