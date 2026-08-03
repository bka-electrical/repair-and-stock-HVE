// src/api.js
// Diperbarui: sekarang manggil backend Vercel (/api/repairs) yang sudah pakai Supabase,
// bukan lagi Google Apps Script secara langsung.

const REPAIRS_URL = "/api/repairs";

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
    const json = await res.json();
    return json;
  },

  update: async (data) => {
    const res = await fetch(REPAIRS_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return json;
  },
};