import React, { useState, useEffect } from "react";
import { Plus, X, Search, Package, History } from "lucide-react";
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
    kompabilitas_unit: '',
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
      setStokElektrik(elektrik);
      setStokDinRad(dinRad);
      setCategories(cats);
      
      const uniqueUnits = [...new Set(dinRad.map(item => item.kompabilitas_unit).filter(Boolean))];
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
        kompabilitas_unit: '',
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
          const matchSearch = String(item?.nama_spesifikasi_barang || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(item?.id_komponen || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(item?.kompabilitas_unit || '').toLowerCase().includes(searchTerm.toLowerCase());
          const matchUnit = unitFilter === 'all' || String(item?.kompabilitas_unit) === String(unitFilter);
          return matchSearch && matchUnit;
        });
  } catch (e) {
    console.error('Filter error:', e);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-16">
            <button onClick={onBack} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <History size={20} />
            </button>
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Package className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Stok Komponen</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('elektrik')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'elektrik' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border'}`}>
            Stok Elektrik
          </button>
          <button onClick={() => setActiveTab('dinrad')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'dinrad' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border'}`}>
            Stok Dinamo/Radiator
          </button>
        </div>

        {/* Search & Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input type="text" placeholder="Cari nama komponen..." className="w-full pl-10 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>
            {activeTab === 'elektrik' && (
              <div>
                <select className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                  <option value="all">Semua Kategori</option>
                  {categories.map(c => <option key={c.id_kategori} value={c.id_kategori}>{c.nama_kategori}</option>)}
                </select>
              </div>
            )}
            {activeTab === 'dinrad' && (
              <div>
                <select className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={unitFilter} onChange={e => setUnitFilter(e.target.value)}>
                  <option value="all">Semua Unit</option>
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            )}
            <button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
              <Plus size={20} /> Input Stok Baru
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {activeTab === 'elektrik' ? (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID Stok</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID Komponen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nama Komponen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Stok Saat Ini</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Batas Minimal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID Stok</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID Komponen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Kompatibilitas Unit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nama Spesifikasi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Posisi Rak</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Stok</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Batas Min</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredStok.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'elektrik' ? 6 : 8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">Belum ada data stok</td>
                  </tr>
                ) : (
                  filteredStok.map(item => {
                    const badge = getStatusBadge(item.stok_saat_ini, item.batas_minimal);
                    return (
                      <tr key={item.id_stok_elektrik || item.id_stok_din_rad} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => handleRowClick(item)}>
                        {activeTab === 'elektrik' ? (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.id_stok_elektrik}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{item.id_komponen}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{item.nama_komponen}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{item.stok_saat_ini}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{item.batas_minimal}</td>
                            <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${badge.color}`}>{badge.text}</span></td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.id_stok_din_rad}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{item.id_komponen}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{item.kompabilitas_unit}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{item.nama_spesifikasi_barang}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{item.posisi_rak}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{item.stok_saat_ini}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{item.batas_minimal}</td>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Input Stok Baru</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {activeTab === 'elektrik' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ID Komponen</label>
                    <input type="text" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required value={formData.id_komponen} onChange={e => setFormData({...formData, id_komponen: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nama Komponen</label>
                    <input type="text" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required value={formData.nama_komponen} onChange={e => setFormData({...formData, nama_komponen: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stok Saat Ini</label>
                    <input type="number" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required value={formData.stok_saat_ini} onChange={e => setFormData({...formData, stok_saat_ini: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Batas Minimal</label>
                    <input type="number" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required value={formData.batas_minimal} onChange={e => setFormData({...formData, batas_minimal: e.target.value})} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ID Komponen</label>
                    <input type="text" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required value={formData.id_komponen} onChange={e => setFormData({...formData, id_komponen: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kompatibilitas Unit</label>
                    <input type="text" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required value={formData.kompabilitas_unit} onChange={e => setFormData({...formData, kompabilitas_unit: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nama Spesifikasi Barang</label>
                    <input type="text" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required value={formData.nama_spesifikasi_barang} onChange={e => setFormData({...formData, nama_spesifikasi_barang: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Posisi Rak</label>
                    <input type="text" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required value={formData.posisi_rak} onChange={e => setFormData({...formData, posisi_rak: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Batas Minimal</label>
                    <input type="number" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required value={formData.batas_minimal} onChange={e => setFormData({...formData, batas_minimal: e.target.value})} />
                  </div>
                </>
              )}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Riwayat Stok - {selectedItem.id_stok_elektrik || selectedItem.id_stok_din_rad}</h2>
              <button onClick={() => { setShowHistory(false); setSelectedItem(null); setShowAddTransaction(false); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
            </div>
            
            {/* Add Transaction Form */}
            {showAddTransaction ? (
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4">Tambah Transaksi</h3>
                <form onSubmit={handleAddTransaction} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jenis Transaksi</label>
                      <select className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={transaksiForm.jenis_transaksi} onChange={e => setTransaksiForm({...transaksiForm, jenis_transaksi: e.target.value})}>
                        <option value="Masuk">Masuk</option>
                        <option value="Keluar">Keluar</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jumlah</label>
                      <input type="number" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required value={transaksiForm.jumlah} onChange={e => setTransaksiForm({...transaksiForm, jumlah: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tanggal</label>
                      <input type="date" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required value={transaksiForm.tgl_transaksi} onChange={e => setTransaksiForm({...transaksiForm, tgl_transaksi: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Keterangan</label>
                      <input type="text" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={transaksiForm.keterangan} onChange={e => setTransaksiForm({...transaksiForm, keterangan: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowAddTransaction(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Batal</button>
                    <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Simpan</button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <button onClick={() => setShowAddTransaction(true)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2">
                  <Plus size={20} /> Tambah Transaksi
                </button>
              </div>
            )}
            
            <div className="p-6">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID Riwayat</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Jenis Transaksi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Jumlah</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tanggal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {riwayat.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">Belum ada riwayat</td>
                    </tr>
                  ) : (
                    riwayat.map(r => (
                      <tr key={r.id_riwayat_elektrik || r.id_riwayat_din_rad} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{r.id_riwayat_elektrik || r.id_riwayat_din_rad}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{r.jenis_transaksi}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{r.jumlah}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatDate(r.tgl_transaksi)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{r.keterangan}</td>
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
