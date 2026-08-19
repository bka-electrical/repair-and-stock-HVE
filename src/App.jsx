import React, { useState, useEffect, useRef } from "react";
import { Plus, X, RefreshCw, Wrench, Package, CheckCircle, Search, ArrowLeft, LayoutGrid, Home, Settings, Truck, Loader2, Trash2 } from "lucide-react";
import { repairsAPI } from "./api";
import StokPage from "./pages/StokPage";
import DashboardPage from "./pages/DashboardPage";
import TerkirimPage from "./pages/TerkirimPage";
import ProdukReadyPage from "./pages/ProdukReadyPage";

export default function LaporanPekerjaan() {
  const [repairs, setRepairs] = useState([]);
  const [archive, setArchive] = useState([]);
  const [showRepairForm, setShowRepairForm] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [view, setView] = useState('active'); // 'active' | 'archive'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupBy, setGroupBy] = useState('none'); // 'none' | specific category name
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [mesin, setMesin] = useState([]);
  const [komponenList, setKomponenList] = useState([]);
  const [selectedKomponen, setSelectedKomponen] = useState([]);
  const [komponenLoading, setKomponenLoading] = useState(false);
  const [komponenStock, setKomponenStock] = useState({});
  const [stockSummary, setStockSummary] = useState({ outOfStock: 0, lowStock: 0 });
  const [produkReadyCount, setProdukReadyCount] = useState(0);
  const komponenLoadIdRef = useRef(0);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [isUpdatingTicket, setIsUpdatingTicket] = useState(false);
  const [page, setPage] = useState('dashboard'); // 'dashboard' | 'perbaikan' | 'stok' | 'terkirim' | 'produkready'
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('isLoggedIn') === 'true');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [repairFormData, setRepairFormData] = useState({
    nama_unit: "",
    id_mesin: "",
    id_kategori_sparepart: "",
    lokasiOperasi: "",
    deskripsiKerusakan: "",
    status_perbaikan: "Menunggu Pengecekan",
    catatan: "",
    tgl_masuk: new Date().toISOString().split("T")[0],
    tgl_keluar: "",
    riwayat_no_kabel: "",   // <- baru
    riwayat_sisa: ""       // <- baru
  });

  useEffect(() => {
    loadQueue();
    loadMasterData();
    loadStockSummary();
    loadProdukReadyCount();
    loadArchive();
  }, []);

  useEffect(() => {
    if (view === 'archive') loadArchive();
  }, [view]);

  const loadStockSummary = async () => {
    try {
      const map = await repairsAPI.getStockInfo();
      setKomponenStock(map);
      const entries = Object.values(map);
      const outOfStock = entries.filter((item) => (item.stok || 0) === 0).length;
      const lowStock = entries.filter((item) => {
        const stok = item.stok || 0;
        const batas = item.batas || 0;
        return stok > 0 && batas > 0 && stok <= batas;
      }).length;
      setStockSummary({ outOfStock, lowStock });
    } catch (e) { console.error('Stock summary fail', e); }
  };

  const loadProdukReadyCount = async () => {
    try {
      const data = await repairsAPI.getProdukReady();
      setProdukReadyCount(Array.isArray(data) ? data.length : 0);
    } catch (e) { console.error('Produk Ready count fail', e); }
  };

  const loadMasterData = async () => {
    try {
      const [c, l, m] = await Promise.all([
        repairsAPI.getMasterKategori(),
        repairsAPI.getMasterLocations(),
        repairsAPI.getMasterMesin()
      ]);
      setCategories(c);
      setLocations(l);
      setMesin(m);
    } catch (e) { console.error('Master data fail', e); }
  };

  const loadQueue = async () => {
    try {
      const data = await repairsAPI.getActive();
      setRepairs(data);
    } catch (error) { console.error(error); }
  };

  const loadArchive = async () => {
    try {
      const data = await repairsAPI.getArchive();
      setArchive(data);
    } catch (error) { console.error(error); }
  };

  const navigateToRepair = () => {
    setView('active');
    setPage('perbaikan');
    setGroupBy('none');
  };

  const navigateToRepairWithCategory = (categoryKeyword) => {
    setView('active');
    setPage('perbaikan');
    setGroupBy(categoryKeyword);
  };

  const navigateToStock = () => {
    setPage('stok');
  };

  const navigateToArchive = () => {
    setView('archive');
    setPage('perbaikan');
  };

  const navigateToProdukReady = () => {
    setPage('produkready');
  };

  const navigateToTerkirim = () => {
    setPage('terkirim');
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setIsCreatingTicket(true);
    try {
      const komponenWithJumlah = selectedKomponen.map(s => ({
        id_komponen: s.id_komponen,
        jumlah: parseInt(s.jumlah) || 1
      }));

      const result = await repairsAPI.create({ ...repairFormData, komponen: komponenWithJumlah });
      const newTicket = {
        ...repairFormData,
        id_perbaikan: result.id,
        status_perbaikan: 'Menunggu Pengecekan',
        tgl_masuk: repairFormData.tgl_masuk,
        tgl_keluar: ''
      };
      setRepairs(prev => [newTicket, ...prev]);
      setShowRepairForm(false);
      setRepairFormData({
        nama_unit: "",
        id_mesin: "",
        id_kategori_sparepart: "",
        lokasiOperasi: "",
        deskripsiKerusakan: "",
        status_perbaikan: "Menunggu Pengecekan",
        catatan: "",
        tgl_masuk: new Date().toISOString().split("T")[0],
        tgl_keluar: "",
        riwayat_no_kabel: "",
        riwayat_sisa: ""
      });
      setSelectedKomponen([]);
      setKomponenList([]);
    } catch (error) {
      alert("Gagal membuat tiket");
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const handleKategoriChange = async (e) => {
    const kategori = e.target.value;
    setRepairFormData({ ...repairFormData, id_kategori_sparepart: kategori });
    setSelectedKomponen([]);
    setKomponenList([]);
    setKomponenStock({});
    setKomponenLoading(false);

    if (kategori) {
      setKomponenLoading(true);
      const loadId = ++komponenLoadIdRef.current;
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        const comps = await repairsAPI.getComponents(kategori);
        if (komponenLoadIdRef.current !== loadId) return;
        setKomponenList(comps);
        const stockMap = await repairsAPI.getStockInfo();
        if (komponenLoadIdRef.current !== loadId) return;
        setKomponenStock(stockMap);
      } catch (err) {
        console.error(err);
      } finally {
        if (komponenLoadIdRef.current === loadId) {
          setKomponenLoading(false);
        }
      }
    }
  };

  const handleUpdateTicket = async () => {
    setIsUpdatingTicket(true);
    try {
      const komponenWithJumlah = (selectedRepair.selectedKomponen || []).map(s => ({
        id_komponen: typeof s === 'object' ? s.id_komponen : s,
        jumlah: typeof s === 'object' ? (parseInt(s.jumlah) || 1) : 1
      }));

      const payload = {
        ...selectedRepair,
        status: selectedRepair.status_perbaikan,
        catatan: selectedRepair.catatan,
        tgl_keluar: selectedRepair.status_perbaikan === 'Selesai' ? new Date().toISOString().split('T')[0] : null,
        komponen: komponenWithJumlah,
        nama_unit: selectedRepair.nama_unit || '',
        id_mesin: selectedRepair.id_mesin || '',
        id_kategori_sparepart: selectedRepair.id_kategori_sparepart,
        lokasiOperasi: selectedRepair.lokasiOperasi,
        tgl_masuk: selectedRepair.tgl_masuk
      };
      await repairsAPI.update(payload);

      if (selectedRepair.status_perbaikan === 'Selesai' || selectedRepair.status_perbaikan === 'Afkir') {
        setRepairs(prev => prev.filter(r => r.id_perbaikan !== selectedRepair.id_perbaikan));
        setArchive(prev => [{
          ...selectedRepair,
          status_perbaikan: selectedRepair.status_perbaikan,
          catatan: selectedRepair.catatan,
          tgl_keluar: payload.tgl_keluar
        }, ...prev]);
      } else {
        setRepairs(prev => prev.map(r => r.id_perbaikan === selectedRepair.id_perbaikan ? {
          ...r,
          status_perbaikan: selectedRepair.status_perbaikan,
          catatan: selectedRepair.catatan,
          tgl_keluar: payload.tgl_keluar
        } : r));
      }

      setSelectedRepair(null);
      setKomponenList([]);
    } catch (error) {
      alert("Gagal update tiket");
    } finally {
      setIsUpdatingTicket(false);
    }
  };

  const handleCardClick = async (repair) => {
    setSelectedRepair({ ...repair, selectedKomponen: [] });
    if (repair.id_kategori_sparepart) {
      try {
        const [comps, selected, stockMap] = await Promise.all([
          repairsAPI.getComponents(repair.id_kategori_sparepart),
          repairsAPI.getSelectedComponents(repair.id_perbaikan),
          repairsAPI.getStockInfo(),
        ]);
        setKomponenList(comps);
        setKomponenStock(stockMap);
        setSelectedRepair(prev => ({ ...prev, selectedKomponen: selected }));
      } catch (e) { console.error(e); }
    }
  };

  const handleLogin = () => {
    setLoginPassword("");
    setShowLoginModal(true);
  };

  const handleLoginSubmit = () => {
    if (loginPassword === 'admin123') {
      localStorage.setItem('isLoggedIn', 'true');
      setIsLoggedIn(true);
      setShowLoginModal(false);
      setLoginPassword("");
    } else {
      alert('Password salah');
    }
  };

  const handleLoginKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLoginSubmit();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
  };

  const handleDeleteRepair = async (id) => {
    if (!confirm('Hapus tiket perbaikan ini?')) return;
    try {
      await repairsAPI.deleteRepair(id);
      setRepairs(prev => prev.filter(r => r.id_perbaikan !== id));
      setArchive(prev => prev.filter(r => r.id_perbaikan !== id));
    } catch (error) {
      alert('Gagal menghapus tiket');
    }
  };

  const statusConfig = {
    "Menunggu Pengecekan": { color: "text-red-500", bg: "bg-red-50", icon: Wrench },
    "Dalam Pengerjaan": { color: "text-blue-500", bg: "bg-blue-50", icon: Wrench },
    "Menunggu Sparepart": { color: "text-amber-500", bg: "bg-amber-50", icon: Package },
    "Selesai": { color: "text-emerald-500", bg: "bg-emerald-50", icon: CheckCircle },
    "Afkir": { color: "text-gray-500", bg: "bg-gray-50", icon: X }
  };

  const filteredRepairs = repairs.filter(repair => {
    const matchStatus = statusFilter === 'all' || repair.status_perbaikan === statusFilter;
    const mesinData = mesin.find(m => String(m.id_mesin) === String(repair.id_mesin));
    const matchSearch = !searchTerm || 
      String(repair.id_perbaikan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(repair.nama_unit || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(mesinData?.nama_mesin || repair.id_mesin || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(repair.lokasiOperasi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(repair.deskripsiKerusakan || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = groupBy === 'none' || String(repair.id_kategori_sparepart || '').toLowerCase() === groupBy.toLowerCase();
    return matchStatus && matchSearch && matchCategory;
  });

  const filteredArchive = archive.filter(repair => {
    const matchStatus = statusFilter === 'all' || repair.status_perbaikan === statusFilter;
    const mesinData = mesin.find(m => String(m.id_mesin) === String(repair.id_mesin));
    const matchSearch = !searchTerm || 
      String(repair.id_perbaikan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(repair.nama_unit || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(mesinData?.nama_mesin || repair.id_mesin || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(repair.lokasiOperasi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(repair.deskripsiKerusakan || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = groupBy === 'none' || String(repair.id_kategori_sparepart || '').toLowerCase() === groupBy.toLowerCase();
    return matchStatus && matchSearch && matchCategory;
  });

  const groupData = (data, groupByField) => {
    if (groupByField === 'none') return [{ key: 'all', label: '', items: data }];
    
    const groups = {};
    data.forEach(item => {
      const key = item.id_kategori_sparepart || 'Tidak Diketahui';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    
    return Object.keys(groups).sort().map(key => ({
      key,
      label: key,
      items: groups[key]
    }));
  };

  const groupedRepairs = groupData(filteredRepairs, groupBy);
  const groupedArchive = groupData(filteredArchive, groupBy);

   return (
    <>
      <nav className="bg-slate-900/95 border-b border-slate-800 shadow-sm sticky top-0 z-40 backdrop-blur-sm">
        <div className="w-[80vw] max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Wrench size={16} className="text-white" />
              </div>
              <span className="text-sm font-bold text-white tracking-wide">HVE SPIL</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-800/50 rounded-full p-1">
              <button onClick={() => setPage('dashboard')} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${page === 'dashboard' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}>
                <Home size={14} className="inline mr-1" />
                Dashboard
              </button>
              <button onClick={() => { setView('active'); setPage('perbaikan'); setGroupBy('none'); }} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${page === 'perbaikan' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}>
                <Wrench size={14} className="inline mr-1" />
                Perbaikan
              </button>
              <button onClick={() => setPage('stok')} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${page === 'stok' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}>
                <Package size={14} className="inline mr-1" />
                Suku Cadang
              </button>
              <button onClick={() => setPage('terkirim')} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${page === 'terkirim' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}>
                <Truck size={14} className="inline mr-1" />
                Terkirim
              </button>
              <button onClick={() => setPage('produkready')} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${page === 'produkready' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}>
                <Package size={14} className="inline mr-1" />
                Produk Ready
              </button>
              <button onClick={isLoggedIn ? handleLogout : handleLogin} className={`${isLoggedIn ? 'border border-red-500/50 bg-red-500/10 text-red-300 hover:bg-red-500/20' : 'border border-slate-600 bg-slate-800/80 text-slate-200 hover:bg-slate-700'} rounded-full px-4 py-2 text-xs font-semibold transition ml-3`}>
                {isLoggedIn ? 'Logout' : 'Login'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {page === 'dashboard' && (
      <DashboardPage
        activeRepairs={repairs}
        archiveRepairs={archive}
        stockSummary={stockSummary}
        onNavigateRepair={navigateToRepair}
        onNavigateStock={navigateToStock}
        onNavigateArchive={navigateToArchive}
        onNavigateTerkirim={navigateToTerkirim}
        onNavigateRepairWithCategory={navigateToRepairWithCategory}
        onNavigateProdukReady={navigateToProdukReady}
        produkReadyCount={produkReadyCount}
      />
    )}
    {page === 'perbaikan' && (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="bg-slate-900/95 border-b border-slate-800 shadow-sm">
        <div className="w-[80vw] max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-3xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Wrench className="text-white" size={18} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Sistem Servis Bengkel</h1>
                <p className="text-sm text-slate-400">Pantau tiket, status, dan antrean layanan.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setPage('dashboard')} className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800">
                Kembali
              </button>
              <button onClick={loadQueue} className="inline-flex h-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-slate-100 hover:bg-slate-800">
                <RefreshCw size={16} />
              </button>
              <button onClick={() => setShowRepairForm(true)} className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/20 hover:bg-emerald-400">
                <Plus size={16} />
                Perbaikan
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-[80vw] max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-1 flex gap-1 shadow-sm shadow-black/20">
            <button onClick={() => setView('active')} className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${view === 'active' ? 'bg-emerald-500 text-slate-950 shadow-inner shadow-emerald-500/20' : 'bg-transparent text-slate-200 hover:text-white'}`}>
              Antrean Aktif
            </button>
            <button onClick={() => setView('archive')} className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${view === 'archive' ? 'bg-emerald-500 text-slate-950 shadow-inner shadow-emerald-500/20' : 'bg-transparent text-slate-200 hover:text-white'}`}>
              Riwayat
            </button>
          </div>
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4 flex items-center justify-between text-sm text-slate-300 min-w-[220px]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">Tiket Aktif</p>
              <p className="mt-2 text-2xl font-bold text-white">{repairs.length}</p>
            </div>
            <div className="rounded-full bg-emerald-500/10 px-3 py-2 text-emerald-300 text-xs">Live</div>
          </div>
        </div>

        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-sm p-5">
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-100">Cari Tiket</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <input type="text" placeholder="Cari ID tiket, unit, kategori, lokasi..." className="w-full rounded-3xl border border-slate-800 bg-slate-950/80 p-3 text-slate-100 placeholder:text-slate-500 shadow-inner shadow-black/10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <select className="w-full rounded-3xl border border-slate-800 bg-slate-950/80 p-3 text-slate-100" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">Semua Status</option>
              <option value="Menunggu Pengecekan">Menunggu Pengecekan</option>
              <option value="Dalam Pengerjaan">Dalam Pengerjaan</option>
              <option value="Menunggu Sparepart">Menunggu Sparepart</option>
              <option value="Selesai">Selesai</option>
              <option value="Afkir">Afkir</option>
            </select>
            <select className="w-full rounded-3xl border border-slate-800 bg-slate-950/80 p-3 text-slate-100" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
              <option value="none">Tidak Dikelompokkan</option>
              {categories.map(cat => (
                <option key={cat.nama_kategori} value={cat.nama_kategori}>{cat.nama_kategori}</option>
              ))}
            </select>
          </div>
        </div>

        {view === 'active' && (
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/80">
              <h2 className="text-lg font-semibold text-white">Antrean Aktif</h2>
              <p className="text-sm text-slate-400">Tiket perbaikan yang sedang dalam proses</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-950/90 text-slate-400">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">ID Tiket</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Unit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Mesin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Kategori</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Lokasi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Tanggal Masuk</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-950 divide-y divide-slate-800">
                  {groupedRepairs.map(group => (
                    <React.Fragment key={group.key}>
                      {groupBy !== 'none' && (
                        <tr key={`group-${group.key}`} className="bg-slate-900">
                          <td colSpan="8" className="px-6 py-2 text-sm font-semibold uppercase text-slate-300">
                            {group.label} ({group.items.length} tiket)
                          </td>
                        </tr>
                      )}
                      {group.items.map(repair => {
                        const kategori = categories.find(c => c.nama_kategori === repair.id_kategori_sparepart);
                        const mesinData = mesin.find(m => String(m.id_mesin) === String(repair.id_mesin));
                        const StatusIcon = statusConfig[repair.status_perbaikan]?.icon || Wrench;
                        const statusColor = statusConfig[repair.status_perbaikan]?.color || "text-slate-300";
                        return (
                          <tr key={repair.id_perbaikan} className="hover:bg-slate-900/80 cursor-pointer" onClick={() => handleCardClick(repair)}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{repair.id_perbaikan}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{repair.nama_unit || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{mesinData?.nama_mesin || repair.id_mesin || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{kategori?.nama_kategori || repair.id_kategori_sparepart}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{repair.lokasiOperasi || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor} bg-slate-800`}>{<StatusIcon size={12} />} {repair.status_perbaikan}</span></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{repair.tgl_masuk ? new Date(repair.tgl_masuk).toLocaleDateString("id-ID") : "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-emerald-400 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleCardClick(repair); }}>Lihat</span>
                                {isLoggedIn && (
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteRepair(repair.id_perbaikan); }} className="text-red-400 hover:text-red-300 p-1">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'archive' && (
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/80">
              <h2 className="text-lg font-semibold text-white">Riwayat Perbaikan</h2>
              <p className="text-sm text-slate-400">Tiket yang sudah selesai atau di-afkir</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-950/90 text-slate-400">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">ID Tiket</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Unit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Mesin</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Kategori</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Lokasi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Tanggal Masuk</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Tanggal Keluar</th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase">Aksi</th>
                    </tr>
                </thead>
                <tbody className="bg-slate-950 divide-y divide-slate-800">
                  {groupedArchive.map(group => (
                    <React.Fragment key={group.key}>
                      {groupBy !== 'none' && (
                        <tr key={`archive-group-${group.key}`} className="bg-slate-900">
                          <td colSpan="8" className="px-6 py-2 text-sm font-semibold uppercase text-slate-300">
                            {group.label} ({group.items.length} tiket)
                          </td>
                        </tr>
                      )}
                      {group.items.map(repair => {
                        const kategori = categories.find(c => c.nama_kategori === repair.id_kategori_sparepart);
                        const mesinData = mesin.find(m => String(m.id_mesin) === String(repair.id_mesin));
                        const StatusIcon = statusConfig[repair.status_perbaikan]?.icon || CheckCircle;
                        const statusColor = statusConfig[repair.status_perbaikan]?.color || "text-slate-300";
                        return (
                          <tr key={repair.id_perbaikan} className="hover:bg-slate-900/80 cursor-pointer" onClick={() => handleCardClick(repair)}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{repair.id_perbaikan}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{repair.nama_unit || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{mesinData?.nama_mesin || repair.id_mesin || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{kategori?.nama_kategori || repair.id_kategori_sparepart}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{repair.lokasiOperasi || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor} bg-slate-800`}>{<StatusIcon size={12} />} {repair.status_perbaikan}</span></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{repair.tgl_masuk ? new Date(repair.tgl_masuk).toLocaleDateString("id-ID") : "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{repair.tgl_keluar ? new Date(repair.tgl_keluar).toLocaleDateString("id-ID") : "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-emerald-400 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleCardClick(repair); }}>Edit</span>
                                {isLoggedIn && (
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteRepair(repair.id_perbaikan); }} className="text-red-400 hover:text-red-300 p-1">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Repair Detail Modal (Slide-out Panel style but modal) */}
      {selectedRepair && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 dark:bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 dark:bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-white">Detail Perbaikan</h2>
              <button onClick={() => { setSelectedRepair(null); setKomponenList([]); }} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <p className="text-xs font-bold text-gray-400 mb-2 uppercase">ID Perbaikan</p>
                <p className="text-lg font-bold text-white">{selectedRepair.id_perbaikan}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Status Perbaikan</p>
                <select className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" value={selectedRepair.status_perbaikan} onChange={e => setSelectedRepair({...selectedRepair, status_perbaikan: e.target.value})}>
                  {Object.keys(statusConfig).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {selectedRepair.status_perbaikan === 'Selesai' && (
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Tanggal Keluar</p>
                  <input type="date" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" value={selectedRepair.tgl_keluar || ""} onChange={e => setSelectedRepair({...selectedRepair, tgl_keluar: e.target.value})} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Nama Unit</p>
                  {isLoggedIn ? (
                    <input type="text" className="w-full p-2 border border-gray-600 rounded bg-gray-800 text-white" value={selectedRepair.nama_unit || ""} onChange={e => setSelectedRepair({...selectedRepair, nama_unit: e.target.value})} />
                  ) : (
                    <p className="font-medium text-white">{selectedRepair.nama_unit || "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Nama Mesin</p>
                  {isLoggedIn ? (
                    <select className="w-full p-2 border border-gray-600 rounded bg-gray-800 text-white" value={selectedRepair.id_mesin || ""} onChange={e => setSelectedRepair({...selectedRepair, id_mesin: e.target.value})}>
                      <option value="">-- Pilih Mesin --</option>
                      {mesin.map(m => <option key={m.id_mesin} value={m.id_mesin}>{m.nama_mesin}</option>)}
                    </select>
                  ) : (
                    <p className="font-medium text-white">
                      {(() => {
                        const m = mesin.find(item => String(item.id_mesin) === String(selectedRepair.id_mesin));
                        return m ? m.nama_mesin : (selectedRepair.id_mesin || "-");
                      })()}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Lokasi</p>
                  {isLoggedIn ? (
                    <select className="w-full p-2 border border-gray-600 rounded bg-gray-800 text-white" value={selectedRepair.lokasiOperasi || ""} onChange={e => setSelectedRepair({...selectedRepair, lokasiOperasi: e.target.value})}>
                      <option value="">-- Pilih Lokasi --</option>
                      {locations.map(l => <option key={l.id_lokasi} value={l.nama_lokasi}>{l.nama_lokasi}</option>)}
                    </select>
                  ) : (
                    <p className="font-medium text-white">{selectedRepair.lokasiOperasi || "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Kategori</p>
                  {isLoggedIn ? (
                    <select className="w-full p-2 border border-gray-600 rounded bg-gray-800 text-white" value={selectedRepair.id_kategori_sparepart || ""} onChange={e => setSelectedRepair({...selectedRepair, id_kategori_sparepart: e.target.value})}>
                      <option value="">-- Pilih Kategori --</option>
                      {categories.map(c => <option key={c.id_kategori} value={c.nama_kategori}>{c.nama_kategori}</option>)}
                    </select>
                  ) : (
                    <p className="font-medium text-white">{selectedRepair.id_kategori_sparepart || "-"}</p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Tanggal Masuk</p>
                {isLoggedIn ? (
                  <input type="date" className="w-full p-2 border border-gray-600 rounded bg-gray-800 text-white" value={selectedRepair.tgl_masuk || ""} onChange={e => setSelectedRepair({...selectedRepair, tgl_masuk: e.target.value})} />
                ) : (
                  <p className="font-medium text-white">{selectedRepair.tgl_masuk ? new Date(selectedRepair.tgl_masuk).toLocaleDateString('id-ID') : "-"}</p>
                )}
              </div>

              {komponenList.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-3 uppercase">Komponen yang diganti</p>
                  <div className="space-y-2">
                    {komponenList.map(k => {
                      const selected = selectedRepair.selectedKomponen?.find(s => (typeof s === 'object' ? s.id_komponen : s) === k.id_komponen);
                      const checked = !!selected;
                      const jumlah = typeof selected === 'object' ? selected.jumlah : 1;
                      const sisaStok = komponenStock[k.id_komponen]?.stok;
                      return (
                        <label key={k.id_komponen} className="flex items-center gap-3 p-3 border border-gray-700 rounded-lg hover:bg-gray-800 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={e => {
                            const current = selectedRepair.selectedKomponen || [];
                            const updated = e.target.checked
                              ? [...current, { id_komponen: k.id_komponen, jumlah: 1 }]
                              : current.filter(s => (typeof s === 'object' ? s.id_komponen : s) !== k.id_komponen);
                            setSelectedRepair({...selectedRepair, selectedKomponen: updated});
                          }} className="w-4 h-4 text-indigo-600 rounded" />
                          <span className="text-sm text-gray-300 flex-1">{k.nama_komponen}</span>
                          <div className="flex items-center gap-2">
                            {sisaStok !== null && (
                              <span className="text-xs text-gray-400 min-w-[48px] text-right">stok: {sisaStok}</span>
                            )}
                            <input
                              type="number"
                              min="1"
                              disabled={!checked}
                              className={`w-16 p-2 border border-gray-600 rounded bg-gray-800 text-white text-center ${checked ? 'opacity-100' : 'opacity-50'}`}
                              value={checked ? jumlah : ''}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 1;
                                setSelectedRepair(prev => ({
                                  ...prev,
                                  selectedKomponen: (prev.selectedKomponen || []).map(s =>
                                    (typeof s === 'object' ? s.id_komponen : s) === k.id_komponen
                                      ? { id_komponen: k.id_komponen, jumlah: Math.max(1, val) }
                                      : s
                                  )
                                }));
                              }}
                            />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Catatan</p>
                <textarea className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white h-24 resize-none" placeholder="Tambahkan catatan..." value={selectedRepair.catatan || ""} onChange={e => setSelectedRepair({...selectedRepair, catatan: e.target.value})} />
              </div>
            </div>

            {isLoggedIn && (
              <div className="sticky bottom-0 bg-gray-900 dark:bg-gray-800 border-t border-gray-700 px-6 py-4 flex gap-3">
                <button onClick={() => setSelectedRepair(null)} className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800">
                  Batal
                </button>
                <button onClick={handleUpdateTicket} disabled={isUpdatingTicket} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isUpdatingTicket && <Loader2 size={16} className="animate-spin" />}
                  Simpan Perubahan
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      )}

      {/* Create Ticket Modal */}
      {showRepairForm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 dark:bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[calc(100vh-4rem)] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Tiket Perbaikan Baru</h2>
              <button onClick={() => setShowRepairForm(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
               <form onSubmit={handleCreateTicket} className="p-6 space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Nama Unit</label>
                    <input type="text" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required placeholder="Contoh: EXCAVATOR 01" value={repairFormData.nama_unit} onChange={e => setRepairFormData({...repairFormData, nama_unit: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Nama Mesin</label>
                    <select className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={repairFormData.id_mesin} onChange={e => setRepairFormData({...repairFormData, id_mesin: e.target.value})}>
                      <option value="">Pilih Mesin</option>
                      {mesin.map(m => <option key={m.id_mesin} value={m.id_mesin}>{m.nama_mesin}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Kategori Sparepart</label>
                    <select className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={repairFormData.id_kategori_sparepart} onChange={handleKategoriChange}>
                      <option value="">Pilih Kategori</option>
                      {categories.map(c => <option key={c.id_kategori} value={c.nama_kategori}>{c.nama_kategori}</option>)}
                    </select>
                  </div>
                   {(komponenLoading || komponenList.length > 0) && (
                     <div>
                       <label className="block text-sm font-medium text-gray-200 mb-2">Komponen yang diganti</label>
                       <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-700 rounded-lg p-3">
                         {komponenLoading ? (
                           <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                             Memuat komponen...
                           </div>
                         ) : (
                            komponenList.map(k => {
                              const selected = selectedKomponen.find(s => s.id_komponen === k.id_komponen);
                              const checked = !!selected;
                              const stockInfo = komponenStock[k.id_komponen];
                              const sisaStok = stockInfo ? stockInfo.stok : null;
                              return (
                                <label key={k.id_komponen} className="flex items-center gap-3 p-2 hover:bg-gray-800 rounded cursor-pointer">
                                  <input type="checkbox" checked={checked} onChange={e => {
                                    const updated = e.target.checked
                                      ? [...selectedKomponen, { id_komponen: k.id_komponen, jumlah: 1 }]
                                      : selectedKomponen.filter(s => s.id_komponen !== k.id_komponen);
                                    setSelectedKomponen(updated);
                                  }} className="w-4 h-4 text-indigo-600 rounded" />
                                  <span className="text-sm text-gray-300 flex-1">{k.nama_komponen}</span>
                                  <div className="flex items-center gap-2">
                                    {sisaStok !== null && (
                                      <span className="text-xs text-gray-400 min-w-[48px] text-right">stok: {sisaStok}</span>
                                    )}
                                    <input
                                      type="number"
                                      min="1"
                                      disabled={!checked}
                                      className={`w-16 p-2 border border-gray-600 rounded bg-gray-800 text-white text-center ${checked ? 'opacity-100' : 'opacity-50'}`}
                                      value={selected ? selected.jumlah : ''}
                                      onChange={e => {
                                        const val = parseInt(e.target.value) || 1;
                                        setSelectedKomponen(prev => prev.map(s => s.id_komponen === k.id_komponen ? { ...s, jumlah: Math.max(1, val) } : s));
                                      }}
                                    />
                                  </div>
                                </label>
                              );
                            })
                         )}
                       </div>
                     </div>
                   )}

                    {repairFormData.id_kategori_sparepart === 'Accu' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-200 mb-2">Riwayat No. Kabel</label>
                          <input
                            type="text"
                            className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
                            placeholder="Masukkan riwayat nomor kabel"
                            value={repairFormData.riwayat_no_kabel}
                            onChange={e => setRepairFormData({ ...repairFormData, riwayat_no_kabel: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-200 mb-2">Riwayat Sisa</label>
                          <input
                            type="text"
                            className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
                            placeholder="Masukkan riwayat sisa"
                            value={repairFormData.riwayat_sisa}
                            onChange={e => setRepairFormData({ ...repairFormData, riwayat_sisa: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                    
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Lokasi</label>
                    <select className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={repairFormData.lokasiOperasi} onChange={e => setRepairFormData({...repairFormData, lokasiOperasi: e.target.value})}>
                      <option value="">Pilih Lokasi</option>
                      {locations.map(l => <option key={l.id_lokasi} value={l.nama_lokasi}>{l.nama_lokasi}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Tanggal Masuk</label>
                    <input type="date" className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white" required value={repairFormData.tgl_masuk} onChange={e => setRepairFormData({...repairFormData, tgl_masuk: e.target.value})} />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => { setShowRepairForm(false); setSelectedKomponen([]); setKomponenList([]); }} className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800">
                      Batal
                    </button>
                    <button type="submit" disabled={isCreatingTicket} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {isCreatingTicket && <Loader2 size={16} className="animate-spin" />}
                      Buat Tiket
                    </button>
                  </div>
                </form>
           </div>
         </div>
       )}
    </div>
  )}
  {page === 'stok' && (
      <StokPage onBack={() => setPage('dashboard')} isLoggedIn={isLoggedIn} />
    )}

    {page === 'terkirim' && (
      <TerkirimPage onBack={() => setPage('dashboard')} isLoggedIn={isLoggedIn} />
    )}

    {page === 'produkready' && (
      <ProdukReadyPage onBack={() => setPage('dashboard')} isLoggedIn={isLoggedIn} />
    )}

    {page !== 'dashboard' && (
      <button
        onClick={() => setPage(page === 'stok' ? 'perbaikan' : 'stok')}
        className={`fixed bottom-6 left-6 z-40 rounded-full shadow-lg px-5 py-3 flex items-center gap-2 font-medium transition-colors ${
          page === 'stok' ? 'bg-emerald-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
        }`}
      >
        <Package size={20} />
        {page === 'stok' ? 'Kembali' : 'Stok'}
      </button>
    )}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[60]">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center text-white">
              <h3 className="text-lg font-semibold">Login Admin</h3>
              <button onClick={() => setShowLoginModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="password"
                placeholder="Masukkan password admin"
                className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                onKeyDown={handleLoginKeyDown}
                autoFocus
              />
              <button onClick={handleLoginSubmit} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium">
                Login
              </button>
            </div>
          </div>
        </div>
      )}
   </>
 );
}


