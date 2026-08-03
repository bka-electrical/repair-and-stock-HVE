import React, { useState, useEffect } from "react";
import { Plus, X, RefreshCw, Wrench, Package, CheckCircle, Search, ArrowLeft } from "lucide-react";
import { repairsAPI } from "./api";
import StokPage from "./pages/StokPage";

export default function LaporanPekerjaan() {
  const [repairs, setRepairs] = useState([]);
  const [archive, setArchive] = useState([]);
  const [showRepairForm, setShowRepairForm] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [view, setView] = useState('active'); // 'active' | 'archive'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupBy, setGroupBy] = useState('none'); // 'none' | 'id_perbaikan' | 'id_kategori_sparepart' | 'lokasiOperasi'
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [mesin, setMesin] = useState([]);
  const [komponenList, setKomponenList] = useState([]);
  const [selectedKomponen, setSelectedKomponen] = useState([]);
  const [page, setPage] = useState('perbaikan'); // 'perbaikan' | 'stok'
  const [repairFormData, setRepairFormData] = useState({
    nama_unit: "",
    id_mesin: "",
    id_kategori_sparepart: "",
    lokasiOperasi: "",
    deskripsiKerusakan: "",
    status_perbaikan: "Menunggu Pengecekan",
    catatan: "",
    tgl_masuk: new Date().toISOString().split("T")[0],
    tgl_keluar: ""
  });

  // Theme state
  const THEME_KEY = "theme";
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || "system"; } 
    catch (e) { return "system"; }
  });

  useEffect(() => {
    loadQueue();
    loadMasterData();
  }, []);

  useEffect(() => {
    if (view === 'archive') loadArchive();
  }, [view]);

  useEffect(() => {
    const root = document.documentElement;
    const apply = (t) => {
      if (t === "system") {
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", prefersDark);
      } else {
        root.classList.toggle("dark", t === "dark");
      }
    };
    apply(theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  }, [theme]);

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

  const handleCreateTicket = async (e) => {
    e.preventDefault();
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
        tgl_keluar: ""
      });
      setSelectedKomponen([]);
      setKomponenList([]);
    } catch (error) { alert("Gagal membuat tiket"); }
  };

  const handleKategoriChange = async (e) => {
    const kategori = e.target.value;
    setRepairFormData({ ...repairFormData, id_kategori_sparepart: kategori });
    setSelectedKomponen([]);
    setKomponenList([]);
    if (kategori) {
      try {
        const comps = await repairsAPI.getComponents(kategori);
        setKomponenList(comps);
      } catch (err) { console.error(err); }
    }
  };

  const handleUpdateTicket = async () => {
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
        id_mesin: selectedRepair.id_mesin || ''
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
    } catch (error) { alert("Gagal update tiket"); }
  };

  const handleCardClick = async (repair) => {
    setSelectedRepair({ ...repair, selectedKomponen: [] });
    if (repair.id_kategori_sparepart) {
      try {
        const [comps, selected] = await Promise.all([
          repairsAPI.getComponents(repair.id_kategori_sparepart),
          repairsAPI.getSelectedComponents(repair.id_perbaikan)
        ]);
        setKomponenList(comps);
        setSelectedRepair(prev => ({ ...prev, selectedKomponen: selected }));
      } catch (e) { console.error(e); }
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
    return matchStatus && matchSearch;
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
    return matchStatus && matchSearch;
  });

  const groupData = (data, groupByField) => {
    if (groupByField === 'none') return [{ key: 'all', label: '', items: data }];
    
    const groups = {};
    data.forEach(item => {
      let key = item[groupByField] || 'Tidak Diketahui';
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
    {page === 'perbaikan' && (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with original style */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Wrench className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Sistem Servis Bengkel</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Monitoring Perbaikan</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={loadQueue} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <RefreshCw size={20} />
              </button>
              <button onClick={() => setShowRepairForm(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                <Plus size={20} />
                Perbaikan Baru
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Keep original layout style */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* View Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('active')} className={`px-4 py-2 rounded-lg font-medium ${view === 'active' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border'}`}>Antrean Aktif</button>
          <button onClick={() => setView('archive')} className={`px-4 py-2 rounded-lg font-medium ${view === 'archive' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border'}`}>Riwayat</button>
        </div>

        {/* Search & Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input type="text" placeholder="Cari ID tiket, unit, kategori, lokasi..." className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div>
              <select className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">Semua Status</option>
                <option value="Menunggu Pengecekan">Menunggu Pengecekan</option>
                <option value="Dalam Pengerjaan">Dalam Pengerjaan</option>
                <option value="Menunggu Sparepart">Menunggu Sparepart</option>
                <option value="Selesai">Selesai</option>
                <option value="Afkir">Afkir</option>
              </select>
            </div>
            <div>
              <select className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
                <option value="none">Tidak Dikelompokkan</option>
                <option value="id_perbaikan">Kelompokkan: ID Tiket</option>
                <option value="id_kategori_sparepart">Kelompokkan: Kategori</option>
                <option value="lokasiOperasi">Kelompokkan: Lokasi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Queue Table */}
        {view === 'active' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Antrean Aktif</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tiket perbaikan yang sedang dalam proses</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID Tiket</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Unit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Mesin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Kategori</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Lokasi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tanggal Masuk</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {groupedRepairs.map(group => (
                    <React.Fragment key={group.key}>
                      {groupBy !== 'none' && (
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <td colSpan="7" className="px-6 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase">
                            {group.label} ({group.items.length} tiket)
                          </td>
                        </tr>
                      )}
                        {groupBy !== 'none' && (
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <td colSpan="8" className="px-6 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase">
                            {group.label} ({group.items.length} tiket)
                          </td>
                        </tr>
                      )}
                      {group.items.map(repair => {
                        const kategori = categories.find(c => c.nama_kategori === repair.id_kategori_sparepart);
                        const mesinData = mesin.find(m => String(m.id_mesin) === String(repair.id_mesin));
                        const StatusIcon = statusConfig[repair.status_perbaikan]?.icon || Wrench;
                        const statusColor = statusConfig[repair.status_perbaikan]?.color || "text-gray-500";
                        return (
                          <tr key={repair.id_perbaikan} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => handleCardClick(repair)}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {repair.id_perbaikan}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              {repair.nama_unit || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              {mesinData?.nama_mesin || repair.id_mesin || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              {kategori?.nama_kategori || repair.id_kategori_sparepart}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              {repair.lokasiOperasi || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor} bg-gray-100 dark:bg-gray-700`}>
                                <StatusIcon size={12} />
                                {repair.status_perbaikan}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              {repair.tgl_masuk ? new Date(repair.tgl_masuk).toLocaleDateString("id-ID") : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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

        {/* Archive Table */}
        {view === 'archive' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Riwayat Perbaikan</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tiket yang sudah selesai atau di-afkir</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID Tiket</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Unit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Mesin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Kategori</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Lokasi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tanggal Masuk</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tanggal Keluar</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {groupedArchive.map(group => (
                    <React.Fragment key={group.key}>
                      {groupBy !== 'none' && (
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <td colSpan="7" className="px-6 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase">
                            {group.label} ({group.items.length} tiket)
                          </td>
                        </tr>
                      )}
                      {group.items.map(repair => {
                        const kategori = categories.find(c => c.nama_kategori === repair.id_kategori_sparepart);
                        const mesinData = mesin.find(m => String(m.id_mesin) === String(repair.id_mesin));
                        const StatusIcon = statusConfig[repair.status_perbaikan]?.icon || CheckCircle;
                        const statusColor = statusConfig[repair.status_perbaikan]?.color || "text-gray-500";
                        return (
                          <tr key={repair.id_perbaikan} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {repair.id_perbaikan}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              {repair.nama_unit || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              {mesinData?.nama_mesin || repair.id_mesin || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              {kategori?.nama_kategori || repair.id_kategori_sparepart}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              {repair.lokasiOperasi || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor} bg-gray-100 dark:bg-gray-700`}>
                                <StatusIcon size={12} />
                                {repair.status_perbaikan}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              {repair.tgl_masuk ? new Date(repair.tgl_masuk).toLocaleDateString("id-ID") : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              {repair.tgl_keluar ? new Date(repair.tgl_keluar).toLocaleDateString("id-ID") : "-"}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Detail Perbaikan</h2>
              <button onClick={() => { setSelectedRepair(null); setKomponenList([]); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <p className="text-xs font-bold text-gray-400 mb-2 uppercase">ID Perbaikan</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedRepair.id_perbaikan}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Status Perbaikan</p>
                <select className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={selectedRepair.status_perbaikan} onChange={e => setSelectedRepair({...selectedRepair, status_perbaikan: e.target.value})}>
                  {Object.keys(statusConfig).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {selectedRepair.status_perbaikan === 'Selesai' && (
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Tanggal Keluar</p>
                  <input type="date" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={selectedRepair.tgl_keluar || ""} onChange={e => setSelectedRepair({...selectedRepair, tgl_keluar: e.target.value})} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Nama Unit</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedRepair.nama_unit || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Nama Mesin</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {(() => {
                      const m = mesin.find(item => String(item.id_mesin) === String(selectedRepair.id_mesin));
                      return m ? m.nama_mesin : (selectedRepair.id_mesin || "-");
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Lokasi</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedRepair.lokasiOperasi || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Kategori</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedRepair.id_kategori_sparepart || "-"}</p>
                </div>
              </div>

              {komponenList.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-3 uppercase">Komponen yang diganti</p>
                  <div className="space-y-2">
                    {komponenList.map(k => {
                      const selected = selectedRepair.selectedKomponen?.find(s => (typeof s === 'object' ? s.id_komponen : s) === k.id_komponen);
                      const checked = !!selected;
                      const jumlah = typeof selected === 'object' ? selected.jumlah : 1;
                      return (
                        <label key={k.id_komponen} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={e => {
                            const current = selectedRepair.selectedKomponen || [];
                            const updated = e.target.checked
                              ? [...current, { id_komponen: k.id_komponen, jumlah: 1 }]
                              : current.filter(s => (typeof s === 'object' ? s.id_komponen : s) !== k.id_komponen);
                            setSelectedRepair({...selectedRepair, selectedKomponen: updated});
                          }} className="w-4 h-4 text-indigo-600 rounded" />
                          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{k.nama_komponen}</span>
                          <input
                            type="number"
                            min="1"
                            disabled={!checked}
                            className={`w-16 p-2 border border-gray-300 dark:border-gray-600 rounded bg-slate-700 text-white text-center ${checked ? 'opacity-100' : 'opacity-50'}`}
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
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Catatan</p>
                <textarea className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-24 resize-none" placeholder="Tambahkan catatan..." value={selectedRepair.catatan || ""} onChange={e => setSelectedRepair({...selectedRepair, catatan: e.target.value})} />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3">
              <button onClick={() => setSelectedRepair(null)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Batal
              </button>
              <button onClick={handleUpdateTicket} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showRepairForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tiket Perbaikan Baru</h2>
              <button onClick={() => setShowRepairForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
               <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nama Unit</label>
                   <input type="text" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required placeholder="Contoh: EXCAVATOR 01" value={repairFormData.nama_unit} onChange={e => setRepairFormData({...repairFormData, nama_unit: e.target.value})} />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nama Mesin</label>
                   <select className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required value={repairFormData.id_mesin} onChange={e => setRepairFormData({...repairFormData, id_mesin: e.target.value})}>
                     <option value="">Pilih Mesin</option>
                     {mesin.map(m => <option key={m.id_mesin} value={m.id_mesin}>{m.nama_mesin}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kategori Sparepart</label>
                   <select className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required value={repairFormData.id_kategori_sparepart} onChange={handleKategoriChange}>
                     <option value="">Pilih Kategori</option>
                     {categories.map(c => <option key={c.id_kategori} value={c.nama_kategori}>{c.nama_kategori}</option>)}
                   </select>
                 </div>

                  {komponenList.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Komponen yang diganti</label>
                      <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        {komponenList.map(k => {
                          const selected = selectedKomponen.find(s => s.id_komponen === k.id_komponen);
                          const checked = !!selected;
                          return (
                            <label key={k.id_komponen} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                              <input type="checkbox" checked={checked} onChange={e => {
                                const updated = e.target.checked
                                  ? [...selectedKomponen, { id_komponen: k.id_komponen, jumlah: 1 }]
                                  : selectedKomponen.filter(s => s.id_komponen !== k.id_komponen);
                                setSelectedKomponen(updated);
                              }} className="w-4 h-4 text-indigo-600 rounded" />
                              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{k.nama_komponen}</span>
                              <input
                                type="number"
                                min="1"
                                disabled={!checked}
                                className={`w-16 p-2 border border-gray-300 dark:border-gray-600 rounded bg-slate-700 text-white text-center ${checked ? 'opacity-100' : 'opacity-50'}`}
                                value={selected ? selected.jumlah : ''}
                                onChange={e => {
                                  const val = parseInt(e.target.value) || 1;
                                  setSelectedKomponen(prev => prev.map(s => s.id_komponen === k.id_komponen ? { ...s, jumlah: Math.max(1, val) } : s));
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lokasi</label>
                   <select className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required value={repairFormData.lokasiOperasi} onChange={e => setRepairFormData({...repairFormData, lokasiOperasi: e.target.value})}>
                     <option value="">Pilih Lokasi</option>
                     {locations.map(l => <option key={l.id_lokasi} value={l.nama_lokasi}>{l.nama_lokasi}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tanggal Masuk</label>
                   <input type="date" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required value={repairFormData.tgl_masuk} onChange={e => setRepairFormData({...repairFormData, tgl_masuk: e.target.value})} />
                 </div>
                 <div className="flex gap-3 pt-4">
                   <button type="button" onClick={() => { setShowRepairForm(false); setSelectedKomponen([]); setKomponenList([]); }} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                     Batal
                   </button>
                   <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
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
      <StokPage onBack={() => setPage('perbaikan')} />
    )}

    <button
      onClick={() => setPage(page === 'stok' ? 'perbaikan' : 'stok')}
      className={`fixed bottom-6 left-6 z-40 rounded-full shadow-lg px-5 py-3 flex items-center gap-2 font-medium transition-colors ${
        page === 'stok' ? 'bg-emerald-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
      }`}
    >
      <Package size={20} />
      {page === 'stok' ? 'Kembali' : 'Stok'}
    </button>
  </>
);
}
