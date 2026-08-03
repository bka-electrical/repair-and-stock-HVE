const API_URL = "https://script.google.com/macros/s/AKfycbxR9mPbzdKH93m-CzqO0IOnthYoMz4bS7pbZvM2LlBTLW1bR8_viIUcwtpn_XLOwAzjdQ/exec";

export const spreadsheetAPI = {
  fetchData: async (action, params = {}) => {
    const url = new URL(API_URL);
    url.searchParams.append('action', action);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    const res = await fetch(url);
    return res.json();
  },

  postData: async (action, body) => {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action, ...body })
    });
    return res.json();
  }
};

export const repairsAPI = {
  getActive: () => spreadsheetAPI.fetchData('getActiveQueue'),
  getArchive: () => spreadsheetAPI.fetchData('getArchive'),
  getStokElektrik: () => spreadsheetAPI.fetchData('getStokElektrik'),
  getStokDinRad: () => spreadsheetAPI.fetchData('getStokDinRad'),
  getRiwayatElektrik: (idStok) => spreadsheetAPI.fetchData('getRiwayatElektrik', { id_stok: idStok }),
  getRiwayatDinRad: (idStok) => spreadsheetAPI.fetchData('getRiwayatDinRad', { id_stok: idStok }),
  getMasterKategori: () => spreadsheetAPI.fetchData('getKategori'),
  create: (data) => spreadsheetAPI.postData('createTicket', data),
  update: (data) => spreadsheetAPI.postData('updateTicket', data),
  addStokElektrik: (data) => spreadsheetAPI.postData('addStokElektrik', data),
  addStokDinRad: (data) => spreadsheetAPI.postData('addStokDinRad', data),
  addRiwayat: (data) => spreadsheetAPI.postData('addRiwayat', data),
  markAsDipesan: (idKomponen, tipeStok) => spreadsheetAPI.postData('markAsDipesan', { id_komponen: idKomponen, tipe_stok: tipeStok }),
  getComponents: (idKategori) => spreadsheetAPI.fetchData('getComponents', { id_kategori: idKategori }),
  getSelectedComponents: (idPerbaikan) => spreadsheetAPI.fetchData('getSelectedComponents', { id_perbaikan: idPerbaikan }),
  getMasterLocations: () => spreadsheetAPI.fetchData('getLocations'),
  getMasterMesin: () => spreadsheetAPI.fetchData('getMesin')
};
