import React, { useState, useEffect } from "react";
import { ArrowLeft, Plus, X, Edit, Trash2, Package } from "lucide-react";
import { repairsAPI } from "../api";

const TIPES = ["Dinamo Starter", "Dinamo Amper (Alternator)"];
const KONDISI = ["Bagus / Utuh", "Terkanibal Sebagian", "Habis / Afkir"];

export default function DinamoReadyPage({ onBack }) {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    tipe_dinamo: "",
    id_mesin: "",
    kondisi: "",
    keterangan: "",
  });
  const [mesinList, setMesinList] = useState([]);
  const [komponenList, setKomponenList] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dinamoReady, mesin] = await Promise.all([
        repairsAPI.getDinamoReady(),
        repairsAPI.getMasterMesin(),
      ]);
      setItems(Array.isArray(dinamoReady) ? dinamoReady : []);
      setMesinList(Array.isArray(mesin) ? mesin : []);
    } catch (e) { console.error(e); }
  };

  const loadKomponen = async (tipe) => {
    try {
      const cats = await repairsAPI.getMasterKategori();
      const cat = cats.find(c => c.nama_kategori === tipe);
      if (cat) {
        const comps = await repairsAPI.getComponents(cat.nama_kategori);
        setKomponenList(Array.isArray(comps) ? comps : []);
      } else {
        setKomponenList([]);
      }
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await repairsAPI.updateDinamoReady({
          id_dinamo_ready: editingItem.id_dinamo_ready,
          ...formData,
        });
      } else {
        await repairsAPI.addDinamoReady(formData);
      }
      await loadData();
      setShowForm(false);
      setEditingItem(null);
      setFormData({ tipe_dinamo: "", id_mesin: "", kondisi: "", keterangan: "" });
    } catch (e) { alert("Gagal menyimpan data dinamo ready"); }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      tipe_dinamo: item.tipe_dinamo || "",
      id_mesin: item.id_mesin || "",
      kondisi: item.kondisi || "",
      keterangan: item.keterangan || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus data dinamo ready ini?")) return;
    try {
      await repairsAPI.deleteDinamoReady(id);
      await loadData();
    } catch (e) { alert("Gagal menghapus data"); }
  };

  const getKondisiColor = (kondisi) => {
    if (kondisi === "Bagus / Utuh") return "bg-green-500";
    if (kondisi === "Terkanibal Sebagian") return "bg-yellow-500";
    if (kondisi === "Habis / Afkir") return "bg-red-500";
    return "bg-slate-500";
  };

  const getMesinName = (id) => {
    const m = mesinList.find(m => String(m.id_mesin) === String(id));
    return m ? m.nama_mesin : id || "-";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="bg-slate-900/95 border-b border-slate-800 shadow-sm">
        <div className="w-[80vw] max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between h-24">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="rounded-full border border-slate-700 bg-slate-900/80 p-3 text-slate-200 hover:bg-slate-800">
                <ArrowLeft size={20} />
              </button>
              <div className="w-12 h-12 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Package className="text-white" size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Dinamo Ready</h1>
                <p className="text-sm text-slate-400">Kelola dinamo yang siap pasang</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={loadData} className="inline-flex h-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-slate-200 hover:bg-slate-800">
                <X size={18} />
              </button>
              <button onClick={() => { setEditingItem(null); setFormData({ tipe_dinamo: "", id_mesin: "", kondisi: "", keterangan: "" }); setShowForm(true); }} className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400">
                <Plus size={18} className="mr-2" />
                Tambah Dinamo Ready
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-[80vw] max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {items.length === 0 ? (
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-sm p-12 text-center">
            <p className="text-slate-500">Belum ada data dinamo ready</p>
          </div>
        ) : (
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/80">
            <h2 className="text-lg font-semibold text-white">Daftar Dinamo Ready</h2>
            <p className="text-sm text-slate-400">Dinamo yang tersedia untuk dipasang atau dikorbankan</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-950/90 text-slate-300">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Tipe Dinamo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Mesin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Kondisi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Keterangan</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-slate-950 divide-y divide-slate-800">
                {items.map((item, idx) => (
                  <tr key={item.id_dinamo_ready || `${item.tipe_dinamo}-${item.id_mesin}-${idx}`} className="hover:bg-slate-900/80">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{item.id_dinamo_ready}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.tipe_dinamo || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{getMesinName(item.id_mesin)}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white ${getKondisiColor(item.kondisi)}`}>{item.kondisi || "-"}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.keterangan || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center gap-2">
                      <button onClick={() => handleEdit(item)} className="text-emerald-400 hover:text-emerald-300"><Edit size={14} /></button>
                      <button onClick={() => handleDelete(item.id_dinamo_ready)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </main>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">{editingItem ? "Edit Dinamo Ready" : "Tambah Dinamo Ready"}</h2>
              <button onClick={() => { setShowForm(false); setEditingItem(null); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Tipe Dinamo</label>
                <select className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={formData.tipe_dinamo} onChange={e => { setFormData({...formData, tipe_dinamo: e.target.value}); loadKomponen(e.target.value); }}>
                  <option value="">Pilih Tipe</option>
                  {TIPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Mesin</label>
                <select className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={formData.id_mesin} onChange={e => setFormData({...formData, id_mesin: e.target.value})}>
                  <option value="">Pilih Mesin</option>
                  {mesinList.map(m => <option key={m.id_mesin} value={m.id_mesin}>{m.nama_mesin}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Kondisi</label>
                <select className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={formData.kondisi} onChange={e => setFormData({...formData, kondisi: e.target.value})}>
                  <option value="">Pilih Kondisi</option>
                  {KONDISI.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Keterangan</label>
                <textarea className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white h-20 resize-none" placeholder="Tambahkan catatan..." value={formData.keterangan} onChange={e => setFormData({...formData, keterangan: e.target.value})} />
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