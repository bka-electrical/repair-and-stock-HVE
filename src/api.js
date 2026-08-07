// src/api.js
// Memanggil backend Vercel (/api/repairs dan /api/stok) yang sudah pakai Supabase,
// bukan lagi Google Apps Script secara langsung.

const IS_DEV = import.meta.env.DEV;
const REPAIRS_URL = IS_DEV ? "/dev-api/repairs" : "/api/repairs";
const STOK_URL = IS_DEV ? "/dev-api/stok" : "/api/stok";

async function parseJsonSafe(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export const repairsAPI = {
  getActive: async () => {
    const res = await fetch(REPAIRS_URL);
    const json = await parseJsonSafe(res);
    return json.data || [];
  },

  getArchive: async () => {
    const res = await fetch(`${REPAIRS_URL}?action=getArchive`);
    const json = await parseJsonSafe(res);
    return json.data || [];
  },

  getMasterKategori: async () => {
    const res = await fetch(`${REPAIRS_URL}?action=getKategori`);
    const json = await parseJsonSafe(res);
    return json.data || [];
  },

  getMasterLocations: async () => {
    const res = await fetch(`${REPAIRS_URL}?action=getLocations`);
    const json = await parseJsonSafe(res);
    return json.data || [];
  },

  getMasterMesin: async () => {
    const res = await fetch(`${REPAIRS_URL}?action=getMesin`);
    const json = await parseJsonSafe(res);
    return json.data || [];
  },

  getComponents: async (idKategori) => {
    const res = await fetch(`${REPAIRS_URL}?action=getComponents&id_kategori=${encodeURIComponent(idKategori)}`);
    const json = await parseJsonSafe(res);
    return json.data || [];
  },

  getSelectedComponents: async (idPerbaikan) => {
    const res = await fetch(`${REPAIRS_URL}?action=getSelectedComponents&id_perbaikan=${encodeURIComponent(idPerbaikan)}`);
    const json = await parseJsonSafe(res);
    return json.data || [];
  },

  create: async (data) => {
    const res = await fetch(REPAIRS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonSafe(res);
  },

  update: async (data) => {
    const res = await fetch(REPAIRS_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonSafe(res);
  },

  getStokElektrik: async () => {
    const res = await fetch(`${STOK_URL}?action=getStokElektrik`);
    const json = await parseJsonSafe(res);
    return json.data || [];
  },

  getStokDinRad: async () => {
    const res = await fetch(`${STOK_URL}?action=getStokDinRad`);
    const json = await parseJsonSafe(res);
    return json.data || [];
  },

  getRiwayatElektrik: async (idStok) => {
    const res = await fetch(`${STOK_URL}?action=getRiwayatElektrik&id_stok=${encodeURIComponent(idStok)}`);
    const json = await parseJsonSafe(res);
    return json.data || [];
  },

  getRiwayatDinRad: async (idStok) => {
    const res = await fetch(`${STOK_URL}?action=getRiwayatDinRad&id_stok=${encodeURIComponent(idStok)}`);
    const json = await parseJsonSafe(res);
    return json.data || [];
  },

  addStokElektrik: async (data) => {
    const res = await fetch(`${STOK_URL}?action=addStokElektrik`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonSafe(res);
  },

  addStokDinRad: async (data) => {
    const res = await fetch(`${STOK_URL}?action=addStokDinRad`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonSafe(res);
  },

  addRiwayat: async (data) => {
    const res = await fetch(`${STOK_URL}?action=addRiwayat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonSafe(res);
  },

  markAsDipesan: async (idKomponen, tipeStok) => {
    const res = await fetch(`${STOK_URL}?action=markAsDipesan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_komponen: idKomponen, tipe_stok: tipeStok }),
    });
    return parseJsonSafe(res);
  },

  getStockInfo: async () => {
    const [elektrik, dinrad] = await Promise.all([
      repairsAPI.getStokElektrik(),
      repairsAPI.getStokDinRad(),
    ]);
    const map = {};
    (elektrik || []).forEach((row) => {
      map[row.id_komponen] = { stok: row.stok_saat_ini, batas: row.batas_minimal };
    });
    (dinrad || []).forEach((row) => {
      map[row.id_komponen] = { stok: row.stok_saat_ini, batas: row.batas_minimal };
    });
    return map;
  },

  getSuratJalan: async () => {
    const res = await fetch(`${REPAIRS_URL}?action=getSuratJalan`);
    const json = await parseJsonSafe(res);
    return json.data || [];
  },

  addSuratJalan: async (data) => {
    const res = await fetch(`${REPAIRS_URL}?action=addSuratJalan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonSafe(res);
  },

  updateSuratJalan: async (data) => {
    const res = await fetch(`${REPAIRS_URL}?action=updateSuratJalan`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonSafe(res);
  },

  getProdukReady: async () => {
    const res = await fetch(`${REPAIRS_URL}?action=getProdukReady`);
    const json = await parseJsonSafe(res);
    return json.data || [];
  },

  addProdukReady: async (data) => {
    const res = await fetch(`${REPAIRS_URL}?action=addProdukReady`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonSafe(res);
  },

  updateProdukReady: async (data) => {
    const res = await fetch(`${REPAIRS_URL}?action=updateProdukReady`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonSafe(res);
  },

  deleteProdukReady: async (id) => {
    const res = await fetch(`${REPAIRS_URL}?action=deleteProdukReady`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_produk_ready: id }),
    });
    return parseJsonSafe(res);
  },

  getRiwayatProduk: async (idProdukReady) => {
    const qs = idProdukReady
      ? `&id_produk_ready=${encodeURIComponent(idProdukReady)}`
      : "";
    const res = await fetch(`${REPAIRS_URL}?action=getRiwayatProduk${qs}`);
    const json = await parseJsonSafe(res);
    return json.data || [];
  },

  addRiwayatProduk: async (data) => {
    const res = await fetch(`${REPAIRS_URL}?action=addRiwayatProduk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonSafe(res);
  },

  updateRiwayatProduk: async (data) => {
    const res = await fetch(`${REPAIRS_URL}?action=updateRiwayatProduk`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonSafe(res);
  },

  deleteRiwayatProduk: async (id) => {
    const res = await fetch(`${REPAIRS_URL}?action=deleteRiwayatProduk`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_riwayat_produk: id }),
    });
    return parseJsonSafe(res);
  },
};