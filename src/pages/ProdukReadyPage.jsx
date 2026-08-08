import React, { useState, useEffect } from "react";
import { ArrowLeft, Plus, X, Edit, Trash2, Package, ArrowDownCircle, ArrowUpCircle, Loader2 } from "lucide-react";
import { repairsAPI } from "../api";

export default function ProdukReadyPage({ onBack }) {
  const [view, setView] = useState("ready"); // 'ready' | 'riwayat'
  const [items, setItems] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [mesinList, setMesinList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    kategori_produk: "",
    id_mesin: "",
    jumlah_stok: "",
    keterangan: "",
  });

  const [showTransaksiForm, setShowTransaksiForm] = useState(false);
  const [transaksiTarget, setTransaksiTarget] = useState(null);
  const [transaksiData, setTransaksiData] = useState({
    jenis_transaksi: "Masuk",
    jumlah: "",
    tanggal: "",
    keterangan: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (view === "riwayat") loadRiwayat();
  }, [view]);

  const loadData = async () => {
    try {
      const [produkReady, mesin, kategori] = await Promise.all([
        repairsAPI.getProdukReady(),
        repairsAPI.getMasterMesin(),
        repairsAPI.getMasterKategori(),
      ]);
      setItems(Array.isArray(produkReady) ? produkReady : []);
      setMesinList(Array.isArray(mesin) ? mesin : []);
      setKategoriList(Array.isArray(kategori) ? kategori : []);
    } catch (e) { console.error(e); }
  };

  const loadRiwayat = async () => {
    try {
      const data = await repairsAPI.getRiwayatProduk();
      setRiwayat(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        jumlah_stok: parseInt(formData.jumlah_stok) || 0,
      };
      if (editingItem) {
        await repairsAPI.updateProdukReady({
          id_produk_ready: editingItem.id_produk_ready,
          ...payload,
        });
      } else {
        await repairsAPI.addProdukReady(payload);
      }
      await loadData();
      setShowForm(false);
      setEditingItem(null);
      setFormData({ kategori_produk: "", id_mesin: "", jumlah_stok: "", keterangan: "" });
    } catch (e) {
      alert("Gagal menyimpan data produk ready");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      kategori_produk: item.kategori_produk || "",
      id_mesin: item.id_mesin || "",
      jumlah_stok: item.jumlah_stok ?? "",
      keterangan: item.keterangan || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus data produk ready ini?")) return;
    try {
      await repairsAPI.deleteProdukReady(id);
      await loadData();
    } catch (e) { alert("Gagal menghapus data"); }
  };

  const openTransaksiForm = (item, jenis) => {
    setTransaksiTarget(item);
    setTransaksiData({
      jenis_transaksi: jenis,
      jumlah: "",
      tanggal: new Date().toISOString().split("T")[0],
      keterangan: "",
    });
    setShowTransaksiForm(true);
  };

  const handleTransaksiSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await repairsAPI.addRiwayatProduk({
        id_produk_ready: transaksiTarget.id_produk_ready,
        jenis_transaksi: transaksiData.jenis_transaksi,
        jumlah: parseInt(transaksiData.jumlah) || 0,
        tanggal: transaksiData.tanggal,
        keterangan: transaksiData.keterangan,
      });
      await loadData();
      if (view === "riwayat") await loadRiwayat();
      setShowTransaksiForm(false);
      setTransaksiTarget(null);
    } catch (err) {
      console.error(err);
      alert("Gagal mencatat transaksi stok");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMesinName = (id) => {
    const m = mesinList.find(m => String(m.id_mesin) === String(id));
    return m ? m.nama_mesin : id || "-";
  };

  const getKategoriName = (id) => {
    const k = kategoriList.find(k => String(k.id_kategori) === String(id));
    return k ? k.nama_kategori : id || "-";
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
                <h1 className="text-2xl font-bold text-white">Produk Ready</h1>
                <p className="text-sm text-slate-400">Kelola stok produk yang siap pasang</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={view === "ready" ? loadData : loadRiwayat} className="inline-flex h-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-slate-200 hover:bg-slate-800">
                <X size={18} />
              </button>
              {view === "ready" && (
                <button onClick={() => { setEditingItem(null); setFormData({ kategori_produk: "", id_mesin: "", jumlah_stok: "", keterangan: "" }); setShowForm(true); }} className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400">
                  <Plus size={18} className="mr-2" />
                  Tambah Produk Ready
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="w-[80vw] max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Sub page tabs, sama pola dengan halaman Repair */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-1 flex gap-1 shadow-sm shadow-black/20 w-fit">
          <button onClick={() => setView("ready")} className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${view === "ready" ? "bg-emerald-500 text-slate-950 shadow-inner shadow-emerald-500/20" : "bg-transparent text-slate-200 hover:text-white"}`}>
            Ready
          </button>
          <button onClick={() => setView("riwayat")} className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${view === "riwayat" ? "bg-emerald-500 text-slate-950 shadow-inner shadow-emerald-500/20" : "bg-transparent text-slate-200 hover:text-white"}`}>
            Riwayat
          </button>
        </div>

        {/* ===== TAB: READY (dari tb_produk_ready) ===== */}
        {view === "ready" && (
          items.length === 0 ? (
            <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-sm p-12 text-center">
              <p className="text-slate-500">Belum ada data produk ready</p>
            </div>
          ) : (
            <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/80">
                <h2 className="text-lg font-semibold text-white">Daftar Produk Ready</h2>
                <p className="text-sm text-slate-400">Produk yang tersedia beserta jumlah stoknya</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800">
                  <thead className="bg-slate-950/90 text-slate-300">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Kategori</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Mesin</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Stok</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Keterangan</th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-950 divide-y divide-slate-800">
                    {items.map((item, idx) => (
                      <tr key={item.id_produk_ready || `${item.kategori_produk}-${item.id_mesin}-${idx}`} className="hover:bg-slate-900/80">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{item.id_produk_ready}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{getKategoriName(item.kategori_produk)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{getMesinName(item.id_mesin)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`rounded-lg px-3 py-2 text-xs font-semibold text-white ${(item.jumlah_stok || 0) > 0 ? "bg-emerald-600" : "bg-red-500"}`}>
                            {item.jumlah_stok ?? 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.keterangan || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end gap-2">
                          <button onClick={() => openTransaksiForm(item, "Masuk")} title="Stok Masuk" className="text-emerald-400 hover:text-emerald-300"><ArrowDownCircle size={16} /></button>
                          <button onClick={() => openTransaksiForm(item, "Keluar")} title="Stok Keluar" className="text-amber-400 hover:text-amber-300"><ArrowUpCircle size={16} /></button>
                          <button onClick={() => handleEdit(item)} className="text-sky-400 hover:text-sky-300"><Edit size={14} /></button>
                          <button onClick={() => handleDelete(item.id_produk_ready)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* ===== TAB: RIWAYAT (dari tb_riwayat_produk) ===== */}
        {view === "riwayat" && (
          riwayat.length === 0 ? (
            <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-sm p-12 text-center">
              <p className="text-slate-500">Belum ada riwayat transaksi produk</p>
            </div>
          ) : (
            <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/80">
                <h2 className="text-lg font-semibold text-white">Riwayat Transaksi Produk</h2>
                <p className="text-sm text-slate-400">Riwayat stok masuk dan keluar produk ready</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800">
                  <thead className="bg-slate-950/90 text-slate-300">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Produk</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Jenis</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Jumlah</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Tanggal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-950 divide-y divide-slate-800">
                    {riwayat.map((row, idx) => (
                      <tr key={row.id_riwayat_produk || idx} className="hover:bg-slate-900/80">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{row.id_riwayat_produk}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{row.id_produk_ready}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`rounded-lg px-3 py-1 text-xs font-semibold text-white ${row.jenis_transaksi === "Masuk" ? "bg-emerald-600" : "bg-amber-600"}`}>
                            {row.jenis_transaksi}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{row.jumlah}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{row.tanggal || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{row.keterangan || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </main>

      {/* Form Modal: Tambah/Edit Produk Ready */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">{editingItem ? "Edit Produk Ready" : "Tambah Produk Ready"}</h2>
              <button onClick={() => { setShowForm(false); setEditingItem(null); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Kategori Produk</label>
                <select className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={formData.kategori_produk} onChange={e => setFormData({...formData, kategori_produk: e.target.value})}>
                  <option value="">Pilih Kategori</option>
                  {kategoriList.map(k => <option key={k.id_kategori} value={k.id_kategori}>{k.nama_kategori}</option>)}
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
                <label className="block text-sm font-medium text-gray-200 mb-2">Jumlah Stok</label>
                <input type="number" min="0" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={formData.jumlah_stok} onChange={e => setFormData({...formData, jumlah_stok: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Keterangan</label>
                <textarea className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white h-20 resize-none" placeholder="Tambahkan catatan..." value={formData.keterangan} onChange={e => setFormData({...formData, keterangan: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); }} className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {editingItem ? "Update" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Form Modal: Catat Transaksi Stok (Masuk/Keluar) */}
      {showTransaksiForm && transaksiTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                Catat Stok {transaksiData.jenis_transaksi} — {transaksiTarget.id_produk_ready}
              </h2>
              <button onClick={() => { setShowTransaksiForm(false); setTransaksiTarget(null); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleTransaksiSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Jenis Transaksi</label>
                <select className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={transaksiData.jenis_transaksi} onChange={e => setTransaksiData({...transaksiData, jenis_transaksi: e.target.value})}>
                  <option value="Masuk">Masuk</option>
                  <option value="Keluar">Keluar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Jumlah</label>
                <input type="number" min="1" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={transaksiData.jumlah} onChange={e => setTransaksiData({...transaksiData, jumlah: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Tanggal</label>
                <input type="date" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={transaksiData.tanggal} onChange={e => setTransaksiData({...transaksiData, tanggal: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Keterangan</label>
                <textarea className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white h-20 resize-none" placeholder="Tambahkan catatan..." value={transaksiData.keterangan} onChange={e => setTransaksiData({...transaksiData, keterangan: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowTransaksiForm(false); setTransaksiTarget(null); }} className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {editingItem ? "Update" : "Simpan"}
              </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}