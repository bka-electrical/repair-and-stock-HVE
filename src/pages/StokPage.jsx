import React, { useState, useEffect } from "react";
import { Plus, X, Search, Package, ArrowLeft, RefreshCw } from "lucide-react";
import { repairsAPI } from "../api";

export default function StokPage({ onBack }) {
  const [activeTab, setActiveTab] = useState('elektrik');
  const [stokElektrik, setStokElektrik] = useState([]);
  const [stokDinRad, setStokDinRad] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [units, setUnits] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [riwayat, setRiwayat] = useState([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [transaksiForm, setTransaksiForm] = useState({
    jenis_transaksi: 'Masuk',
    jumlah: '',
    tgl_transaksi: new Date().toISOString().split('T')[0],
    keterangan: ''
  });
  const [formData, setFormData] = useState({
    id_komponen: '',
    nama_komponen: '',
    stok_saat_ini: '',
    batas_minimal: '',
    kompatibilitas_unit: '',
    nama_spesifikasi_barang: '',
    posisi_rak: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [elektrik, dinRad, cats] = await Promise.all([
        repairsAPI.getStokElektrik(),
        repairsAPI.getStokDinRad(),
        repairsAPI.getMasterKategori()
      ]);
      const cleanElektrik = Array.isArray(elektrik) ? elektrik.filter(item => item.id_stok_elektrik || item.id_komponen || item.nama_komponen) : [];
      const cleanDinRad = Array.isArray(dinRad) ? dinRad.filter(item => item.id_stok_din_rad || item.id_komponen || item.nama_spesifikasi_barang) : [];
      setStokElektrik(cleanElektrik);
      setStokDinRad(cleanDinRad);
      setCategories(cats || []);
      
      const uniqueUnits = [...new Set(cleanDinRad.map(item => item.kompatibilitas_unit).filter(Boolean))];
      setUnits(uniqueUnits);
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'elektrik') {
        await repairsAPI.addStokElektrik(formData);
      } else {
        await repairsAPI.addStokDinRad(formData);
      }
      await loadData();
      setShowModal(false);
      setFormData({
        id_komponen: '',
        nama_komponen: '',
        stok_saat_ini: '',
        batas_minimal: '',
        kompatibilitas_unit: '',
        nama_spesifikasi_barang: '',
        posisi_rak: ''
      });
    } catch (e) { alert("Gagal menyimpan stok"); }
  };

  const handleRowClick = async (item) => {
    setSelectedItem(item);
    setShowHistory(true);
    setShowAddTransaction(false);
    try {
      let riwayatData;
      if (activeTab === 'elektrik') {
        riwayatData = await repairsAPI.getRiwayatElektrik(item.id_stok_elektrik);
      } else {
        riwayatData = await repairsAPI.getRiwayatDinRad(item.id_stok_din_rad);
      }
      console.log('Riwayat data:', riwayatData);
      setRiwayat(Array.isArray(riwayatData) ? riwayatData : []);
    } catch (e) { console.error(e); }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!selectedItem) {
      alert('Item tidak terpilih');
      return;
    }

    const idStok = activeTab === 'elektrik' ? selectedItem.id_stok_elektrik : selectedItem.id_stok_din_rad;
    if (!idStok) {
      alert('ID Stok tidak ditemukan');
      return;
    }

    const payload = {
      tipe: activeTab === 'elektrik' ? 'elektrik' : 'dinrad',
      id_stok: String(idStok),
      jenis_transaksi: transaksiForm.jenis_transaksi,
      jumlah: parseInt(transaksiForm.jumlah) || 0,
      tgl_transaksi: transaksiForm.tgl_transaksi,
      keterangan: transaksiForm.keterangan
    };

    console.log('Kirim transaksi:', payload);

    try {
      const res = await repairsAPI.addRiwayat(payload);
      console.log('Response addRiwayat:', res);

      const riwayatData = activeTab === 'elektrik'
        ? await repairsAPI.getRiwayatElektrik(selectedItem.id_stok_elektrik)
        : await repairsAPI.getRiwayatDinRad(selectedItem.id_stok_din_rad);
      console.log('Riwayat reload:', riwayatData);
      setRiwayat(Array.isArray(riwayatData) ? riwayatData : []);
      await loadData();

      setShowAddTransaction(false);
      setTransaksiForm({
        jenis_transaksi: 'Masuk',
        jumlah: '',
        tgl_transaksi: new Date().toISOString().split('T')[0],
        keterangan: ''
      });
    } catch (e) {
      console.error('Gagal menambah transaksi:', e);
      alert('Gagal menambah transaksi. Cek console untuk detail.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (sisa, batasMinimal) => {
    if (sisa == 0) return { text: 'Habis', color: 'bg-red-500' };
    if (sisa <= batasMinimal) return { text: 'Menipis', color: 'bg-yellow-500' };
    return { text: 'Aman', color: 'bg-green-500' };
  };

  let filteredStok = [];
  try {
    filteredStok = activeTab === 'elektrik'
      ? stokElektrik.filter(item => {
          const matchSearch = String(item?.nama_komponen || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(item?.id_komponen || '').toLowerCase().includes(searchTerm.toLowerCase());
          const matchCategory = categoryFilter === 'all' || String(item?.id_kategori) === String(categoryFilter);
          return matchSearch && matchCategory;
        })
      : stokDinRad.filter(item => {
          const matchSearch = String(item?.nama_spesifikasi_barang || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(item?.id_komponen || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(item?.kompatibilitas_unit || '').toLowerCase().includes(searchTerm.toLowerCase());
          const matchUnit = unitFilter === 'all' || String(item?.kompatibilitas_unit) === String(unitFilter);
          return matchSearch && matchUnit;
        });
  } catch (e) {
    console.error('Filter error:', e);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="bg-slate-900/95 border-b border-slate-800 shadow-sm">
        <div className="w-[80vw] max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between h-24">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="rounded-full border border-slate-700 bg-slate-900/80 p-3 text-slate-200 hover:bg-slate-800">
                <ArrowLeft size={20} />
              </button>
              <div className="w-12 h-12 rounded-3xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Package className="text-white" size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Stok Komponen</h1>
                <p className="text-sm text-slate-400">Pantau stok dan riwayat transaksi komponen.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={loadData} className="inline-flex h-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-slate-200 hover:bg-slate-800">
                <RefreshCw size={18} />
              </button>
              <button onClick={() => setShowModal(true)} className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400">
                <Plus size={18} />
                Input Stok Baru
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-[80vw] max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-1 flex gap-1 shadow-sm shadow-black/20">
            <button onClick={() => setActiveTab('elektrik')} className={`relative rounded-3xl px-5 py-3 text-sm font-semibold transition ${activeTab === 'elektrik' ? 'bg-emerald-500 text-slate-950 shadow-inner shadow-emerald-500/20' : 'bg-transparent text-slate-200 hover:text-white'}`}>
              Stok Elektrik
            </button>
            <button onClick={() => setActiveTab('dinrad')} className={`relative rounded-3xl px-5 py-3 text-sm font-semibold transition ${activeTab === 'dinrad' ? 'bg-emerald-500 text-slate-950 shadow-inner shadow-emerald-500/20' : 'bg-transparent text-slate-200 hover:text-white'}`}>
              Stok Dinamo/Radiator
            </button>
          </div>
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4 text-slate-300">
            <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-400">Data Stok</p>
            <p className="mt-2 text-xl font-semibold text-white">{filteredStok.length} item</p>
          </div>
        </div>

        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-sm p-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-4 text-slate-500" size={20} />
              <input type="text" placeholder="Cari nama komponen..." className="w-full rounded-3xl border border-slate-800 bg-slate-950/80 py-4 pl-12 pr-4 text-slate-100 placeholder:text-slate-500 shadow-inner shadow-black/20" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            {activeTab === 'elektrik' && (
              <select className="rounded-3xl border border-slate-800 bg-slate-950/80 py-4 px-4 text-slate-100" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="all">Semua Kategori</option>
                {categories.map(c => <option key={c.id_kategori} value={c.id_kategori}>{c.nama_kategori}</option>)}
              </select>
            )}
            {activeTab === 'dinrad' && (
              <select className="rounded-3xl border border-slate-800 bg-slate-950/80 py-4 px-4 text-slate-100" value={unitFilter} onChange={e => setUnitFilter(e.target.value)}>
                <option value="all">Semua Unit</option>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-950/90 text-slate-300">
                <tr>
                  {activeTab === 'elektrik' ? (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">ID Stok</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">ID Komponen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Nama Komponen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Stok Saat Ini</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Batas Minimal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Status</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">ID Stok</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">ID Komponen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Kompatibilitas Unit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Nama Spesifikasi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Posisi Rak</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Stok</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Batas Min</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-slate-950 divide-y divide-slate-800">
                {filteredStok.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'elektrik' ? 6 : 8} className="px-6 py-12 text-center text-slate-500">Belum ada data stok</td>
                  </tr>
                ) : (
                  filteredStok.map(item => {
                    const badge = getStatusBadge(item.stok_saat_ini, item.batas_minimal);
                    return (
                      <tr key={item.id_stok_elektrik || item.id_stok_din_rad} className="hover:bg-slate-900/80 cursor-pointer" onClick={() => handleRowClick(item)}>
                        {activeTab === 'elektrik' ? (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">{item.id_stok_elektrik}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.id_komponen}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.nama_komponen}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.stok_saat_ini}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.batas_minimal}</td>
                            <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${badge.color}`}>{badge.text}</span></td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">{item.id_stok_din_rad}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.id_komponen}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.kompatibilitas_unit}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.nama_spesifikasi_barang}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.posisi_rak}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.stok_saat_ini}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.batas_minimal}</td>
                            <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${badge.color}`}>{badge.text}</span></td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Input Stok */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 dark:bg-gray-800 border border-gray-700 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-700 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Input Stok Baru</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {activeTab === 'elektrik' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">ID Komponen</label>
                    <input type="text" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={formData.id_komponen} onChange={e => setFormData({...formData, id_komponen: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Nama Komponen</label>
                    <input type="text" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={formData.nama_komponen} onChange={e => setFormData({...formData, nama_komponen: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Stok Saat Ini</label>
                    <input type="number" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={formData.stok_saat_ini} onChange={e => setFormData({...formData, stok_saat_ini: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Batas Minimal</label>
                    <input type="number" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={formData.batas_minimal} onChange={e => setFormData({...formData, batas_minimal: e.target.value})} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">ID Komponen</label>
                    <input type="text" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={formData.id_komponen} onChange={e => setFormData({...formData, id_komponen: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Kompatibilitas Unit</label>
                    <input type="text" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={formData.kompatibilitas_unit} onChange={e => setFormData({...formData, kompatibilitas_unit: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Nama Spesifikasi Barang</label>
                    <input type="text" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={formData.nama_spesifikasi_barang} onChange={e => setFormData({...formData, nama_spesifikasi_barang: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Posisi Rak</label>
                    <input type="text" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={formData.posisi_rak} onChange={e => setFormData({...formData, posisi_rak: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Batas Minimal</label>
                    <input type="number" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={formData.batas_minimal} onChange={e => setFormData({...formData, batas_minimal: e.target.value})} />
                  </div>
                </>
              )}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 dark:bg-gray-800 border border-gray-700 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-700 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Riwayat Stok - {selectedItem.id_stok_elektrik || selectedItem.id_stok_din_rad}</h2>
              <button onClick={() => { setShowHistory(false); setSelectedItem(null); setShowAddTransaction(false); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            
            {/* Add Transaction Form */}
            {showAddTransaction ? (
              <div className="p-6 border-b border-gray-700 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-white">Tambah Transaksi</h3>
                <form onSubmit={handleAddTransaction} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Jenis Transaksi</label>
                      <select className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" value={transaksiForm.jenis_transaksi} onChange={e => setTransaksiForm({...transaksiForm, jenis_transaksi: e.target.value})}>
                        <option value="Masuk">Masuk</option>
                        <option value="Keluar">Keluar</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Jumlah</label>
                      <input type="number" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={transaksiForm.jumlah} onChange={e => setTransaksiForm({...transaksiForm, jumlah: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Tanggal</label>
                      <input type="date" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={transaksiForm.tgl_transaksi} onChange={e => setTransaksiForm({...transaksiForm, tgl_transaksi: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Keterangan</label>
                      <input type="text" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" value={transaksiForm.keterangan} onChange={e => setTransaksiForm({...transaksiForm, keterangan: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowAddTransaction(false)} className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800">Batal</button>
                    <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Simpan</button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-6 border-b border-gray-700 dark:border-gray-700">
                <button onClick={() => setShowAddTransaction(true)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2">
                  <Plus size={20} /> Tambah Transaksi
                </button>
              </div>
            )}
            
             <div className="p-6">
               <table className="min-w-full divide-y divide-gray-700">
                 <thead className="bg-gray-800">
                   <tr>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">ID Riwayat</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Jenis Transaksi</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Jumlah</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Tanggal</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Keterangan</th>
                   </tr>
                 </thead>
                 <tbody className="bg-gray-900 divide-y divide-gray-700">
                   {riwayat.length === 0 ? (
                     <tr>
                       <td colSpan="5" className="px-6 py-12 text-center text-gray-500">Belum ada riwayat</td>
                     </tr>
                   ) : (
                     riwayat.map(r => (
                       <tr key={r.id_riwayat_elektrik || r.id_riwayat_din_rad} className="hover:bg-gray-800">
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{r.id_riwayat_elektrik || r.id_riwayat_din_rad}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{r.jenis_transaksi}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{r.jumlah}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{formatDate(r.tgl_transaksi)}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{r.keterangan}</td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
