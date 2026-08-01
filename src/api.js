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
  create: (data) => spreadsheetAPI.postData('createTicket', data),
  update: (data) => spreadsheetAPI.postData('updateTicket', data),
  getComponents: (idKategori) => spreadsheetAPI.fetchData('getComponents', { id_kategori: idKategori }),
  getSelectedComponents: (idPerbaikan) => spreadsheetAPI.fetchData('getSelectedComponents', { id_perbaikan: idPerbaikan }),
  getMasterUnits: () => spreadsheetAPI.fetchData('getUnits'),
  getMasterKategori: () => spreadsheetAPI.fetchData('getKategori'),
  getMasterLocations: () => spreadsheetAPI.fetchData('getLocations')
};
