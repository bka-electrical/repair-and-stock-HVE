import React, { useState, useEffect } from "react";
import { ArrowLeft, Truck, Plus, X } from "lucide-react";
import { repairsAPI } from "../api";

export default function TerkirimPage({ onBack }) {
  const [suratList, setSuratList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    no_surat_jalan: "",
    tanggal_kirim: new Date().toISOString().split("T")[0],
    tujuan: "",
    id_perbaikan: "",
    nama_unit: "",
  });

  useEffect(() => {
    loadSuratJalan();
  }, []);

  const loadSuratJalan = async () => {
    try {
      const data = await repairsAPI.getSuratJalan();
      setSuratList(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const openAdd = () => {
    setEditingItem(null);
    setFormData({
      no_surat_jalan: "",
      tanggal_kirim: new Date().toISOString().split("T")[0],
      tujuan: "",
      id_perbaikan: "",
      nama_unit: "",
    });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({
      no_surat_jalan: item.no_surat_jalan || "",
      tanggal_kirim: item.tanggal_kirim || new Date().toISOString().split("T")[0],
      tujuan: item.tujuan || "",
      id_perbaikan: item.id_perbaikan || "",
      nama_unit: item.nama_unit || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await repairsAPI.updateSuratJalan({
          id_surat_jalan: editingItem.id_surat_jalan,
          ...formData,
        });
      } else {
        await repairsAPI.addSuratJalan(formData);
      }
      await loadSuratJalan();
      setShowForm(false);
      setEditingItem(null);
      setFormData({
        no_surat_jalan: "",
        tanggal_kirim: new Date().toISOString().split("T")[0],
        tujuan: "",
        id_perbaikan: "",
        nama_unit: "",
      });
    } catch (e) {
      alert(editingItem ? "Gagal update surat jalan" : "Gagal menyimpan surat jalan");
    }
  };

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
              <p className="mt-2 text-sm text-slate-400">Kelola surat jalan yang telah dikirim.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
        <div className="flex justify-end">
          <button onClick={openAdd} className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400">
            <Plus size={18} className="mr-2" />
            Tambah Surat Jalan
          </button>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-950/90 text-slate-300">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">No. Surat Jalan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Tanggal Kirim</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Tujuan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">ID Perbaikan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Nama Unit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-slate-950 divide-y divide-slate-800">
                {suratList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">Belum ada data surat jalan</td>
                  </tr>
                ) : (
                  suratList.map(item => (
                    <tr key={item.id_surat_jalan} className="hover:bg-slate-900/80 cursor-pointer" onClick={() => openEdit(item)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">{item.no_surat_jalan || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.tanggal_kirim ? new Date(item.tanggal_kirim).toLocaleDateString("id-ID") : "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.tujuan || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.id_perbaikan || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.nama_unit || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-medium text-emerald-400 hover:text-emerald-300">Edit</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">{editingItem ? "Edit Surat Jalan" : "Tambah Surat Jalan"}</h2>
              <button onClick={() => { setShowForm(false); setEditingItem(null); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">No. Surat Jalan</label>
                <input type="text" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={formData.no_surat_jalan} onChange={e => setFormData({...formData, no_surat_jalan: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Tanggal Kirim</label>
                <input type="date" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={formData.tanggal_kirim} onChange={e => setFormData({...formData, tanggal_kirim: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Tujuan</label>
                <input type="text" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={formData.tujuan} onChange={e => setFormData({...formData, tujuan: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">ID Perbaikan (opsional)</label>
                <input type="text" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" value={formData.id_perbaikan} onChange={e => setFormData({...formData, id_perbaikan: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Nama Unit (opsional)</label>
                <input type="text" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" value={formData.nama_unit} onChange={e => setFormData({...formData, nama_unit: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); }} className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">{editingItem ? "Update" : "Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}