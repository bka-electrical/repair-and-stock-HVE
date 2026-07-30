import { createClient } from '@supabase/supabase-js';

// Supabase configuration (from environment variables)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

const isRealSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!isRealSupabase) {
  console.warn('⚠️ Mode UI/UX Standalone (LocalStorage Active): Supabase credentials tidak ditemukan, menggunakan penyimpanan lokal.');
}

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// LOCAL STORAGE MOCK DATA & HELPERS
// ============================================

const TODAY = new Date().toISOString().split('T')[0];
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const TWO_DAYS_AGO = new Date(Date.now() - 172800000).toISOString().split('T')[0];

const INITIAL_REPORTS = [
  {
    id: 'rep-1',
    date: TODAY,
    unit_alat: 'Container Crane 01 (CC-01)',
    lokasi: 'Dermaga 1 - Dermaga Utama',
    jenis_kegiatan: 'Inspeksi Kelistrikan & Maintenance Rutin',
    deskripsi: 'Pengecekan kelistrikan panel utama, perapihan wiring, dan pergantian kabel kontrol hoist.',
    petugas: 'Tim Electrical SPIL',
    created_at: new Date().toISOString(),
  },
  {
    id: 'rep-2',
    date: YESTERDAY,
    unit_alat: 'Reach Stacker 05 (RS-05)',
    lokasi: 'Depo 2 - Area Kontainer',
    jenis_kegiatan: 'Perbaikan Sensor Boom',
    deskripsi: 'Penggantian sensor proximity boom dan kalibrasi ulang indikator beban spreader.',
    petugas: 'Teknisi SPIL',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'rep-3',
    date: TWO_DAYS_AGO,
    unit_alat: 'RTG Crane 03 (RTG-03)',
    lokasi: 'Lapangan Penumpukan B',
    jenis_kegiatan: 'Overhaul Genset Auxiliary',
    deskripsi: 'Pembersihan kontaktor, pengecekan modul inverter, dan penyetelan ulang AVR generator.',
    petugas: 'Tim HVE Electrical',
    created_at: new Date(Date.now() - 172800000).toISOString(),
  }
];

const INITIAL_TASKS = [
  {
    id: 'task-1',
    title: 'Kalibrasi Inverter RTG-02',
    description: 'Setting ulang parameter frekuensi drive dan tune-up respon motor trolley.',
    unit_alat: 'RTG-02',
    priority: 'High',
    status: 'Ongoing',
    progress: 60,
    deadline: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  },
  {
    id: 'task-2',
    title: 'Penggantian Kabel Main Feed Quay Crane 04',
    description: 'Penataan ulang kabel festoon system dan penggantian terminal blok yang korosi.',
    unit_alat: 'QC-04',
    priority: 'Critical',
    status: 'Pending',
    progress: 10,
    deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  },
  {
    id: 'task-3',
    title: 'Pengecekan Motor Hoist RS-01',
    description: 'Inspeksi rutin ketebalan isolasi rotor dan pembersihan sikat karbon.',
    unit_alat: 'RS-01',
    priority: 'Normal',
    status: 'Completed',
    progress: 100,
    deadline: YESTERDAY,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  }
];

const INITIAL_PROGRESS_LOGS = [
  {
    id: 'log-1',
    task_id: 'task-1',
    notes: 'Sudah dilakukan pengecekan sinyal analog encoder, nilai respon stabil.',
    progress: 40,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'log-2',
    task_id: 'task-1',
    notes: 'Pengujian jalan tanpa beban berhasil, persiapan uji jalan beban penuh.',
    progress: 60,
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  }
];

const INITIAL_SPAREPARTS = [
  {
    id: 'sp-1',
    item_name: 'Contactor 220V 50A Schneider',
    part_number: 'LC1D50AM7',
    quantity: 4,
    unit_alat: 'RS-05',
    order_date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
    status: 'Barang Diterima',
    arrival_date: YESTERDAY,
    notes: 'Sudah diterima oleh gudang teknik.',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'sp-2',
    item_name: 'Relay Omron MY4N 24VDC',
    part_number: 'MY4N-DC24',
    quantity: 10,
    unit_alat: 'RTG-02',
    order_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    status: 'Dipesan',
    arrival_date: '',
    notes: 'Estimasi pengiriman 3 hari kerja.',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  }
];

const INITIAL_REPAIRS = [
  {
    id: 'rep-item-1',
    repair_item: 'Ganti Bearing Motor Fan Cooling System',
    unit_alat: 'RTG-01',
    operating_location: 'Lapangan Penumpukan A',
    damage_description: 'Suara kasar pada motor fan cooling inverter.',
    status: 'Sedang Dikerjakan',
    date_received: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    date_completed: '',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'rep-item-2',
    repair_item: 'Modul PLC S7-1200 Error Communication',
    unit_alat: 'CC-02',
    operating_location: 'Dermaga 2',
    damage_description: 'Lampu indikator SF berkedip merah saat operasi gantry.',
    status: 'Barang Diterima',
    date_received: YESTERDAY,
    date_completed: '',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  }
];

function getStorage(key, initial) {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(item);
  } catch (e) {
    return initial;
  }
}

function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('LocalStorage save error:', e);
  }
}

// Helper to generate simple unique IDs
function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// ============================================
// REPORTS API
// ============================================

export const reportsAPI = {
  async getAll() {
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .order('date', { ascending: false });
        if (!error && data) return data;
      } catch (e) {
        console.warn('Fallback to LocalStorage for reports');
      }
    }
    const items = getStorage('hve_reports', INITIAL_REPORTS);
    return [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  async getById(id) {
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('id', id)
          .single();
        if (!error && data) return data;
      } catch (e) { }
    }
    const items = getStorage('hve_reports', INITIAL_REPORTS);
    return items.find((r) => r.id === id) || null;
  },

  async create(report) {
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('reports')
          .insert([report])
          .select()
          .single();
        if (!error && data) return data;
      } catch (e) { }
    }
    const items = getStorage('hve_reports', INITIAL_REPORTS);
    const newReport = {
      ...report,
      id: report.id || generateId('rep'),
      created_at: report.created_at || new Date().toISOString(),
    };
    items.unshift(newReport);
    setStorage('hve_reports', items);
    return newReport;
  },

  async update(id, updates) {
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('reports')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return data;
      } catch (e) { }
    }
    const items = getStorage('hve_reports', INITIAL_REPORTS);
    const index = items.findIndex((r) => r.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      setStorage('hve_reports', items);
      return items[index];
    }
    return updates;
  },

  async delete(id) {
    if (isRealSupabase) {
      try {
        const { error } = await supabase.from('reports').delete().eq('id', id);
        if (!error) return;
      } catch (e) { }
    }
    const items = getStorage('hve_reports', INITIAL_REPORTS);
    const filtered = items.filter((r) => r.id !== id);
    setStorage('hve_reports', filtered);
  },

  subscribe(callback) {
    if (isRealSupabase) {
      try {
        return supabase
          .channel('reports_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, callback)
          .subscribe();
      } catch (e) { }
    }
    return { unsubscribe: () => { } };
  },
};

// ============================================
// TASKS API
// ============================================

export const tasksAPI = {
  async getAll() {
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('deadline', { ascending: true });
        if (!error && data) return data;
      } catch (e) { }
    }
    const items = getStorage('hve_tasks', INITIAL_TASKS);
    return [...items].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  },

  async getById(id) {
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', id)
          .single();
        if (!error && data) return data;
      } catch (e) { }
    }
    const items = getStorage('hve_tasks', INITIAL_TASKS);
    return items.find((t) => t.id === id) || null;
  },

  async create(task) {
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .insert([task])
          .select()
          .single();
        if (!error && data) return data;
      } catch (e) { }
    }
    const items = getStorage('hve_tasks', INITIAL_TASKS);
    const newTask = {
      ...task,
      id: task.id || generateId('task'),
      created_at: task.created_at || new Date().toISOString(),
    };
    items.unshift(newTask);
    setStorage('hve_tasks', items);
    return newTask;
  },

  async update(id, updates) {
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return data;
      } catch (e) { }
    }
    const items = getStorage('hve_tasks', INITIAL_TASKS);
    const index = items.findIndex((t) => t.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      setStorage('hve_tasks', items);
      return items[index];
    }
    return updates;
  },

  async delete(id) {
    if (isRealSupabase) {
      try {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (!error) return;
      } catch (e) { }
    }
    const items = getStorage('hve_tasks', INITIAL_TASKS);
    const filtered = items.filter((t) => t.id !== id);
    setStorage('hve_tasks', filtered);
  },

  subscribe(callback) {
    if (isRealSupabase) {
      try {
        return supabase
          .channel('tasks_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, callback)
          .subscribe();
      } catch (e) { }
    }
    return { unsubscribe: () => { } };
  },
};

// ============================================
// PROGRESS LOGS API
// ============================================

export const progressLogsAPI = {
  async getByTaskId(taskId) {
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('progress_logs')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (e) { }
    }
    const logs = getStorage('hve_progress_logs', INITIAL_PROGRESS_LOGS);
    return logs
      .filter((l) => String(l.task_id) === String(taskId))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async create(log) {
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('progress_logs')
          .insert([log])
          .select()
          .single();
        if (!error && data) return data;
      } catch (e) { }
    }
    const logs = getStorage('hve_progress_logs', INITIAL_PROGRESS_LOGS);
    const newLog = {
      ...log,
      id: log.id || generateId('log'),
      created_at: log.created_at || new Date().toISOString(),
    };
    logs.unshift(newLog);
    setStorage('hve_progress_logs', logs);
    return newLog;
  },

  async update(id, updates) {
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('progress_logs')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return data;
      } catch (e) { }
    }
    const logs = getStorage('hve_progress_logs', INITIAL_PROGRESS_LOGS);
    const index = logs.findIndex((l) => l.id === id);
    if (index !== -1) {
      logs[index] = { ...logs[index], ...updates };
      setStorage('hve_progress_logs', logs);
      return logs[index];
    }
    return updates;
  },

  async delete(id) {
    if (isRealSupabase) {
      try {
        const { error } = await supabase.from('progress_logs').delete().eq('id', id);
        if (!error) return;
      } catch (e) { }
    }
    const logs = getStorage('hve_progress_logs', INITIAL_PROGRESS_LOGS);
    const filtered = logs.filter((l) => l.id !== id);
    setStorage('hve_progress_logs', filtered);
  },
};

// ============================================
// SPAREPARTS API
// ============================================

export const sparepartsAPI = {
  async getAll() {
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('spareparts')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (e) { }
    }
    const items = getStorage('hve_spareparts', INITIAL_SPAREPARTS);
    return [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getById(id) {
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('spareparts')
          .select('*')
          .eq('id', id)
          .single();
        if (!error && data) return data;
      } catch (e) { }
    }
    const items = getStorage('hve_spareparts', INITIAL_SPAREPARTS);
    return items.find((s) => s.id === id) || null;
  },

  async create(sparepart) {
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('spareparts')
          .insert([sparepart])
          .select()
          .single();
        if (!error && data) return data;
      } catch (e) { }
    }
    const items = getStorage('hve_spareparts', INITIAL_SPAREPARTS);
    const newSparepart = {
      ...sparepart,
      id: sparepart.id || generateId('sp'),
      created_at: sparepart.created_at || new Date().toISOString(),
    };
    items.unshift(newSparepart);
    setStorage('hve_spareparts', items);
    return newSparepart;
  },

  async update(id, updates) {
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('spareparts')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return data;
      } catch (e) { }
    }
    const items = getStorage('hve_spareparts', INITIAL_SPAREPARTS);
    const index = items.findIndex((s) => s.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      setStorage('hve_spareparts', items);
      return items[index];
    }
    return updates;
  },

  async delete(id) {
    if (isRealSupabase) {
      try {
        const { error } = await supabase.from('spareparts').delete().eq('id', id);
        if (!error) return;
      } catch (e) { }
    }
    const items = getStorage('hve_spareparts', INITIAL_SPAREPARTS);
    const filtered = items.filter((s) => s.id !== id);
    setStorage('hve_spareparts', filtered);
  },

  subscribe(callback) {
    if (isRealSupabase) {
      try {
        return supabase
          .channel('spareparts_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'spareparts' }, callback)
          .subscribe();
      } catch (e) { }
    }
    return { unsubscribe: () => { } };
  },
};

// ============================================
// REPAIRS API
// ============================================

export const repairsAPI = {
  async getAll() {
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('repairs')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (e) { }
    }
    const items = getStorage('hve_repairs', INITIAL_REPAIRS);
    return [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getById(id) {
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('repairs')
          .select('*')
          .eq('id', id)
          .single();
        if (!error && data) return data;
      } catch (e) { }
    }
    const items = getStorage('hve_repairs', INITIAL_REPAIRS);
    return items.find((r) => r.id === id) || null;
  },

  async create(repair) {
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('repairs')
          .insert([repair])
          .select()
          .single();
        if (!error && data) return data;
      } catch (e) { }
    }
    const items = getStorage('hve_repairs', INITIAL_REPAIRS);
    const newRepair = {
      ...repair,
      id: repair.id || generateId('rep-item'),
      created_at: repair.created_at || new Date().toISOString(),
    };
    items.unshift(newRepair);
    setStorage('hve_repairs', items);
    return newRepair;
  },

  async update(id, updates) {
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('repairs')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return data;
      } catch (e) { }
    }
    const items = getStorage('hve_repairs', INITIAL_REPAIRS);
    const index = items.findIndex((r) => r.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      setStorage('hve_repairs', items);
      return items[index];
    }
    return updates;
  },

  async delete(id) {
    if (isRealSupabase) {
      try {
        const { error } = await supabase.from('repairs').delete().eq('id', id);
        if (!error) return;
      } catch (e) { }
    }
    const items = getStorage('hve_repairs', INITIAL_REPAIRS);
    const filtered = items.filter((r) => r.id !== id);
    setStorage('hve_repairs', filtered);
  },

  subscribe(callback) {
    if (isRealSupabase) {
      try {
        return supabase
          .channel('repairs_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'repairs' }, callback)
          .subscribe();
      } catch (e) { }
    }
    return { unsubscribe: () => { } };
  },
};

// ============================================
// STATISTICS API
// ============================================

export const statisticsAPI = {
  async getTasks() {
    const tasks = await tasksAPI.getAll();
    return {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === 'Completed').length,
      ongoing: tasks.filter((t) => t.status === 'Ongoing').length,
      pending: tasks.filter((t) => t.status === 'Pending').length,
    };
  },

  async getSpareparts() {
    const items = await sparepartsAPI.getAll();
    return {
      total: items.length,
      ordered: items.filter((s) => s.status === 'Dipesan').length,
      received: items.filter((s) => s.status === 'Barang Diterima').length,
    };
  },

  async getRepairs() {
    const items = await repairsAPI.getAll();
    return {
      total: items.length,
      in_progress: items.filter((r) => r.status === 'Sedang Dikerjakan').length,
      completed: items.filter((r) => r.status === 'Selesai').length,
    };
  },
};
