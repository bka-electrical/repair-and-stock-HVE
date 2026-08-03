// src/api.js
// Manggil backend Vercel (/api/repairs dan /api/stok) yang sudah pakai Supabase,
// bukan lagi Google Apps Script secara langsung.

const REPAIRS_URL = "/api/repairs";
const STOK_URL = "/api/stok";

export const repairsAPI = {
  getActive: async () => {
    const res = await fetch(REPAIRS_URL);
    const json = await res.json();
    return json.data;
  },

  getArchive: async () => {
    const res = await fetch(`${REPAIRS_URL}?action=getArchive`);
    const json = await res.json();
    return json.data;
  },

  getMasterKategori: async () => {
    const res = await fetch(`${REPAIRS_URL}?action=getKategori`);
    const json = await res.json();
    return json.data;
  },

  getMasterLocations: async () => {
    const res = await fetch(`${REPAIRS_URL}?action=getLocations`);
    const json = await res.json();
    return json.data;
  },

  getMasterMesin: async () => {
    const res = await fetch(`${REPAIRS_URL}?action=getMesin`);
    const json = await res.json();
    return json.data;
  },

  getComponents: async (idKategori) => {
    const res = await fetch(`${REPAIRS_URL}?action=getComponents&id_kategori=${encodeURIComponent(idKategori)}`);
    const json = await res.json();
    return json.data;
  },

  getSelectedComponents: async (idPerbaikan) => {
    const res = await fetch(`${REPAIRS_URL}?action=getSelectedComponents&id_perbaikan=${encodeURIComponent(idPerbaikan)}`);
    const json = await res.json();
    return json.data;
  },

  create: async (data) => {
    const res = await fetch(REPAIRS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  update: async (data) => {
    const res = await fetch(REPAIRS_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // ===== STOK =====

  getStokElektrik: async () => {
    const res = await fetch(`${STOK_URL}?action=getStokElektrik`);
    const json = await res.json();
    return json.data;
  },

  getStokDinRad: async () => {
    const res = await fetch(`${STOK_URL}?action=getStokDinRad`);
    const json = await res.json();
    return json.data;
  },

  getRiwayatElektrik: async (idStok) => {
    const res = await fetch(`${STOK_URL}?action=getRiwayatElektrik&id_stok=${encodeURIComponent(idStok)}`);
    const json = await res.json();
    return json.data;
  },

  getRiwayatDinRad: async (idStok) => {
    const res = await fetch(`${STOK_URL}?action=getRiwayatDinRad&id_stok=${encodeURIComponent(idStok)}`);
    const json = await res.json();
    return json.data;
  },

  addStokElektrik: async (data) => {
    const res = await fetch(`${STOK_URL}?action=addStokElektrik`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  addStokDinRad: async (data) => {
    const res = await fetch(`${STOK_URL}?action=addStokDinRad`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  addRiwayat: async (data) => {
    const res = await fetch(`${STOK_URL}?action=addRiwayat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  markAsDipesan: async (idKomponen, tipeStok) => {
    const res = await fetch(`${STOK_URL}?action=markAsDipesan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_komponen: idKomponen, tipe_stok: tipeStok }),
    });
    return res.json();
  },
};