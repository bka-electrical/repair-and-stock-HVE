const SS = SpreadsheetApp.getActiveSpreadsheet();

// ===== CORE / UTILITIES =====

/**
 * Router untuk GET requests berdasarkan action parameter
 */
function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'getActiveQueue') return getActiveQueue();
    if (action === 'getUnits') return getMasterData('tb_unit');
    if (action === 'getKategori') return getMasterData('tb_kategori_sparepart');
    if (action === 'getLocations') return getMasterData('tb_lokasi');
    if (action === 'getMesin') return getMesin();
    if (action === 'getComponents') return getComponents(e.parameter.id_kategori);
    if (action === 'getArchive') return getArchive();
    if (action === 'getStokElektrik') return getStokElektrik();
    if (action === 'getStokDinRad') return getStokDinRad();
    if (action === 'getRiwayatElektrik') return getRiwayatElektrik(e.parameter.id_stok);
    if (action === 'getRiwayatDinRad') return getRiwayatDinRad(e.parameter.id_stok);
    if (action === 'getSelectedComponents') return getSelectedComponents(e.parameter.id_perbaikan);
    return errorResponse("Action not found");
  } catch (err) {
    return errorResponse(err.toString());
  }
}

/**
 * Router untuk POST requests berdasarkan action di payload
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'createTicket') return createTicket(data);
    if (data.action === 'updateTicket') return updateTicket(data);
    if (data.action === 'addStokElektrik') return addStokElektrik(data);
    if (data.action === 'addStokDinRad') return addStokDinRad(data);
    if (data.action === 'addRiwayat') return addRiwayat(data);
    if (data.action === 'markAsDipesan') return markAsDipesanAPI(data);
    return errorResponse("Action not found");
  } catch (err) {
    return errorResponse(err.toString());
  }
}

/**
 * Generate prefix ID tiket berdasarkan nama kategori
 */
function getCategoryPrefix(namaKategori) {
  if (!namaKategori) return "TIK";
  const lower = String(namaKategori).toLowerCase().trim();
  const map = {
    "dinamo amper": "DA",
    "dinamo starter": "DS",
    "radiator": "RD",
    "elektrik spil": "SPIL",
    "elektrik maker": "MAKER"
  };
  return map[lower] || "TIK";
}

/**
 * Standard JSON response sukses
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Standard JSON response error
 */
function errorResponse(msg) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: msg })).setMimeType(ContentService.MimeType.JSON);
}

// ===== MASTER DATA =====

/**
 * Ambil semua data antrean perbaikan (belum selesai/afkir)
 */
function getActiveQueue() {
  const sheet = SS.getSheetByName('tb_perbaikan');
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const result = data
    .map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    })
    .filter(item => item.status_perbaikan !== 'Selesai' && item.status_perbaikan !== 'Afkir');
  return jsonResponse(result);
}

/**
 * Ambil semua data arsip perbaikan (sudah selesai/afkir)
 */
function getArchive() {
  const sheet = SS.getSheetByName('tb_perbaikan');
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const result = data
    .map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    })
    .filter(item => item.status_perbaikan === 'Selesai' || item.status_perbaikan === 'Afkir');
  return jsonResponse(result);
}

/**
 * Ambil master data umum dari sheet (unit, kategori, lokasi, dll)
 */
function getMasterData(sheetName) {
  const sheet = SS.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const result = data.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  return jsonResponse(result);
}

/**
 * Ambil master mesin dari sheet tb_mesin
 */
function getMesin() {
  const sheet = SS.getSheetByName('tb_mesin');
  if (!sheet) return jsonResponse([]);
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return jsonResponse([]);
  const headers = data[0];
  const result = data.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  return jsonResponse(result);
}

/**
 * Ambil master unit
 */
function getUnits() {
  const sheet = SS.getSheetByName('tb_unit');
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift();
  return jsonResponse(rows.map(r => ({
    id_unit: r[0],
    nama_unit: r[1]
  })));
}

/**
 * Ambil master kategori sparepart
 */
function getKategori() {
  const sheet = SS.getSheetByName('tb_kategori_sparepart');
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift();
  return jsonResponse(rows.map(r => ({
    id_kategori: r[0],
    nama_kategori: r[1]
  })));
}

/**
 * Ambil master lokasi
 */
function getLocations() {
  const sheet = SS.getSheetByName('tb_lokasi');
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift();
  return jsonResponse(rows.map(r => ({
    id_lokasi: r[0],
    nama_lokasi: r[1]
  })));
}

/**
 * Ambil komponen berdasarkan nama kategori sparepart
 */
function getComponents(namaKategori) {
  const sheet = SS.getSheetByName('tb_komponen_detail');
  const katSheet = SS.getSheetByName('tb_kategori_sparepart');
  const katData = katSheet.getDataRange().getValues();
  const katHeaders = katData.shift();
  const kategoriMap = {};
  katData.forEach(row => {
    kategoriMap[row[1]] = row[0]; // nama_kategori -> id_kategori
  });
  const idKategori = kategoriMap[namaKategori];
  if (!idKategori) return jsonResponse([]);
  
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const result = data
    .map(row => ({ id_komponen: row[0], id_kategori: row[1], nama_komponen: row[2] }))
    .filter(item => String(item.id_kategori) === String(idKategori));
  return jsonResponse(result);
}

/**
 * Ambil komponen yang dipilih pada tiket tertentu
 * Return: [{ id_komponen, jumlah }, ...]
 */
function getSelectedComponents(idPerbaikan) {
  const sheet = SS.getSheetByName('tb_detail_perbaikan');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.findIndex(h => String(h).toLowerCase() === 'id_perbaikan');
  const komponenCol = headers.findIndex(h => String(h).toLowerCase() === 'id_komponen');
  const jumlahCol = headers.findIndex(h => String(h).toLowerCase() === 'jumlah');
  
  const result = data.slice(1)
    .filter(row => String(row[idCol]) === String(idPerbaikan))
    .map(row => ({
      id_komponen: row[komponenCol],
      jumlah: jumlahCol > -1 ? row[jumlahCol] : 1
    }));
  return jsonResponse(result);
}

// ===== STOK ELEKTRIK =====

/**
 * Ambil seluruh data stok elektrik
 */
function getStokElektrik() {
  const sheet = SS.getSheetByName('tb_stok_elektrik');
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const result = data.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  return jsonResponse(result);
}

/**
 * Tambah data stok elektrik baru
 */
function addStokElektrik(data) {
  const sheet = SS.getSheetByName('tb_stok_elektrik');
  const allData = sheet.getDataRange().getValues();
  const count = allData.filter(row => String(row[0]).startsWith('STE')).length + 1;
  const id = "STE-" + String(count).padStart(3, '0');
  
  sheet.appendRow([
    id,
    data.id_komponen || '',
    data.nama_komponen || '',
    parseInt(data.stok_saat_ini) || 0,
    parseInt(data.batas_minimal) || 0
  ]);
  
  return jsonResponse({ status: 'success', id: id });
}

// ===== STOK DINAMO / RADIATOR =====

/**
 * Ambil seluruh data stok dinamo/radiator
 */
function getStokDinRad() {
  const sheet = SS.getSheetByName('tb_stok_din_rad');
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const result = data.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  return jsonResponse(result);
}

/**
 * Tambah data stok dinamo/radiator baru
 */
function addStokDinRad(data) {
  const sheet = SS.getSheetByName('tb_stok_din_rad');
  const allData = sheet.getDataRange().getValues();
  const count = allData.filter(row => String(row[0]).startsWith('SDR')).length + 1;
  const id = "SDR-" + String(count).padStart(3, '0');
  
  sheet.appendRow([
    id,
    data.id_komponen || '',
    data.kompabilitas_unit || '',
    data.nama_spesifikasi_barang || '',
    data.posisi_rak || '',
    parseInt(data.stok_saat_ini) || 0,
    parseInt(data.batas_minimal) || 0
  ]);
  
  return jsonResponse({ status: 'success', id: id });
}

// ===== RIWAYAT STOK =====

/**
 * Ambil riwayat stok elektrik berdasarkan id_stok_elektrik
 */
function getRiwayatElektrik(idStok) {
  const sheet = SS.getSheetByName('tb_riwayat_elektrik');
  if (!sheet) return jsonResponse([]);
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return jsonResponse([]);
  const headers = data[0];
  const idStokCol = headers.findIndex(h => String(h).toLowerCase() === 'id_stok_elektrik');
  if (idStokCol === -1) return jsonResponse([]);
  
  const result = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idStokCol]) === String(idStok)) {
      let obj = {};
      headers.forEach((h, idx) => obj[h] = data[i][idx]);
      result.push(obj);
    }
  }
  return jsonResponse(result);
}

/**
 * Ambil riwayat stok dinamo/radiator berdasarkan id_stok_din_rad
 */
function getRiwayatDinRad(idStok) {
  const sheet = SS.getSheetByName('tb_riwayat_din_rad');
  if (!sheet) return jsonResponse([]);
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return jsonResponse([]);
  const headers = data[0];
  const idStokCol = headers.findIndex(h => String(h).toLowerCase() === 'id_stok_din_rad');
  if (idStokCol === -1) return jsonResponse([]);
  
  const result = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idStokCol]) === String(idStok)) {
      let obj = {};
      headers.forEach((h, idx) => obj[h] = data[i][idx]);
      result.push(obj);
    }
  }
  return jsonResponse(result);
}

/**
 * Generate ID riwayat otomatis (RSTE-xxx / RSDR-xxx)
 */
function generateRiwayatId(isElektrik) {
  const sheet = SS.getSheetByName(isElektrik ? 'tb_riwayat_elektrik' : 'tb_riwayat_din_rad');
  if (!sheet) return (isElektrik ? 'RSTE' : 'RSDR') + '-001';
  const data = sheet.getDataRange().getValues();
  const prefix = isElektrik ? 'RSTE' : 'RSDR';
  const count = data.filter(row => String(row[0]).startsWith(prefix)).length + 1;
  return prefix + '-' + String(count).padStart(3, '0');
}

/**
 * Manual tambah transaksi stok dari halaman Stok
 * - Update stok_saat_ini
 * - Buat record riwayat dengan ID otomatis
 */
function addRiwayat(data) {
  try {
    const isElektrik = data.tipe === 'elektrik';
    const riwayatSheet = SS.getSheetByName(isElektrik ? 'tb_riwayat_elektrik' : 'tb_riwayat_din_rad');
    const stokSheet = SS.getSheetByName(isElektrik ? 'tb_stok_elektrik' : 'tb_stok_din_rad');
    
    if (!riwayatSheet) throw new Error('Sheet riwayat tidak ditemukan');
    if (!stokSheet) throw new Error('Sheet stok tidak ditemukan');

    const idStok = String(data.id_stok);
    const jumlah = parseInt(data.jumlah) || 0;
    const jenis = data.jenis_transaksi;
    
    const allStok = stokSheet.getDataRange().getValues();
    const headers = allStok[0];
    const idCol = headers.findIndex(h => String(h).toLowerCase() === (isElektrik ? 'id_stok_elektrik' : 'id_stok_din_rad'));
    const stokCol = headers.findIndex(h => String(h).toLowerCase() === 'stok_saat_ini');
    const batasMinimalCol = headers.findIndex(h => String(h).toLowerCase() === 'batas_minimal');
    const namaCol = headers.findIndex(h => String(h).toLowerCase() === (isElektrik ? 'nama_komponen' : 'nama_spesifikasi_barang'));
    const idKomponenCol = headers.findIndex(h => String(h).toLowerCase() === 'id_komponen');
    
    if (idCol === -1) throw new Error('Kolom ID stok tidak ditemukan');
    if (stokCol === -1) throw new Error('Kolom stok_saat_ini tidak ditemukan');
    
    let stokSaaIni = 0;
    let oldStok = 0;
    let updated = false;
    let namaKomponen = '';
    let idKomponen = '';
    let batasMinimal = 0;
    for (let i = 1; i < allStok.length; i++) {
      if (String(allStok[i][idCol]) === idStok) {
        oldStok = parseInt(allStok[i][stokCol]) || 0;
        batasMinimal = batasMinimalCol > -1 ? parseInt(allStok[i][batasMinimalCol]) || 0 : 0;
        namaKomponen = namaCol > -1 ? String(allStok[i][namaCol] || '') : '';
        idKomponen = idKomponenCol > -1 ? String(allStok[i][idKomponenCol] || '') : idStok;
        
        if (jenis === 'Masuk') stokSaaIni = oldStok + jumlah;
        else if (jenis === 'Keluar') stokSaaIni = Math.max(0, oldStok - jumlah);
        allStok[i][stokCol] = stokSaaIni;
        updated = true;
        break;
      }
    }
    
    if (!updated) throw new Error('ID Stok tidak ditemukan: ' + idStok);
    
    stokSheet.getRange(1, 1, allStok.length, allStok[0].length).setValues(allStok);
    
    const idRiwayat = generateRiwayatId(isElektrik);
    riwayatSheet.appendRow([idRiwayat, idStok, jenis, jumlah, data.tgl_transaksi, data.keterangan || '']);
    
    if (jenis === 'Keluar') {
      handleStockNotification(idKomponen, stokSaaIni, batasMinimal, isElektrik ? 'elektrik' : 'din_rad', namaKomponen);
    } else if (jenis === 'Masuk') {
      handleRecoveryNotification(idKomponen, oldStok, stokSaaIni, batasMinimal, isElektrik ? 'elektrik' : 'din_rad', namaKomponen);
      if (oldStok <= batasMinimal) {
        recordRestockDate(idKomponen, isElektrik ? 'elektrik' : 'din_rad');
      }
    }
    
    return jsonResponse({ status: 'success', stok_saa_ini: stokSaaIni });
  } catch (e) {
    return jsonResponse({ status: 'error', message: e.toString() });
  }
}
// ===== TICKET / PERBAIKAN =====

/**
 * Buat tiket perbaikan baru
 * - Insert ke tb_perbaikan
 * - Insert detail komponen ke tb_detail_perbaikan
 * - Auto-deduct stok elektrik/dinrad sesuai kategori
 */
function createTicket(data) {
  Logger.log('=== createTicket START ===');
  Logger.log('Payload: ' + JSON.stringify(data));
  Logger.log('komponen: ' + JSON.stringify(data.komponen));
  
  const sheet = SS.getSheetByName('tb_perbaikan');
  const prefix = getCategoryPrefix(data.id_kategori_sparepart);
  const allData = sheet.getDataRange().getValues();
  const count = allData.filter(row => String(row[0]).startsWith(prefix)).length + 1;
  const id = prefix + "-" + String(count).padStart(3, '0');
  
  Logger.log('Ticket ID: ' + id);
  
  sheet.appendRow([
    id, 
    data.nama_unit || '', 
    data.id_mesin || '', 
    data.id_kategori_sparepart,
    data.lokasiOperasi || '',
    data.tgl_masuk || new Date().toISOString().split('T')[0], 
    '', 
    'Menunggu Pengecekan', 
    data.deskripsiKerusakan || ''
  ]);
  
  if (data.komponen && Array.isArray(data.komponen)) {
    Logger.log('Komponen is array, length: ' + data.komponen.length);
    const detailSheet = SS.getSheetByName('tb_detail_perbaikan');
    const kategoriName = String(data.id_kategori_sparepart || '').toLowerCase();
    const isElektrik = kategoriName.includes('elektrik');
    const isDinRad = kategoriName.includes('dinamo') || kategoriName.includes('radiator');
    const idMesin = String(data.id_mesin || '').trim();
    Logger.log('isElektrik=' + isElektrik + ', isDinRad=' + isDinRad + ', idMesin=' + idMesin);
    
    data.komponen.forEach((comp, index) => {
      Logger.log('Processing komponen ' + index + ': ' + JSON.stringify(comp));
      detailSheet.appendRow([id, Number(comp.id_komponen), parseInt(comp.jumlah) || 1]);
      
      if (isElektrik) {
        Logger.log('Calling deductElektrikStock for ' + comp.id_komponen);
        deductElektrikStock(comp.id_komponen, parseInt(comp.jumlah) || 1, id);
      } else if (isDinRad) {
        Logger.log('Calling deductDinRadStock for ' + comp.id_komponen);
        deductDinRadStock(comp.id_komponen, parseInt(comp.jumlah) || 1, id, idMesin);
      }
    });
  } else {
    Logger.log('NO komponen data or not array');
  }
  
  Logger.log('=== createTicket END ===');
  return jsonResponse({ status: 'success', id: id });
}

/**
 * Update tiket perbaikan yang sudah ada
 */
function updateTicket(data) {
  const sheet = SS.getSheetByName('tb_perbaikan');
  const rows = sheet.getDataRange().getValues();
  const rowIndex = rows.findIndex(r => r[0] === data.id_perbaikan);
  
  if (rowIndex > -1) {
    const rowNum = rowIndex + 1;
    sheet.getRange(rowNum, 2).setValue(data.nama_unit || '');
    sheet.getRange(rowNum, 3).setValue(data.id_mesin || '');
    sheet.getRange(rowNum, 8).setValue(data.status);
    sheet.getRange(rowNum, 9).setValue(data.catatan);
    if (data.tgl_keluar) sheet.getRange(rowNum, 7).setValue(data.tgl_keluar);

    if (data.komponen && Array.isArray(data.komponen)) {
      const detailSheet = SS.getSheetByName('tb_detail_perbaikan');
      const details = detailSheet.getDataRange().getValues();
      const headers = details[0];
      const idCol = headers.findIndex(h => String(h).toLowerCase() === 'id_perbaikan');
      
      for (let i = details.length - 1; i >= 1; i--) {
        if (String(details[i][idCol]) === data.id_perbaikan) {
          detailSheet.deleteRow(i + 1);
        }
      }
      
      const kategoriName = String(data.id_kategori_sparepart || '').toLowerCase();
      const isElektrik = kategoriName.includes('elektrik');
      const isDinRad = kategoriName.includes('dinamo') || kategoriName.includes('radiator');
      const idMesin = String(data.id_mesin || '').trim();
      
      data.komponen.forEach(comp => {
        detailSheet.appendRow([data.id_perbaikan, Number(comp.id_komponen), parseInt(comp.jumlah) || 1]);
        
        if (isElektrik) {
          deductElektrikStock(comp.id_komponen, parseInt(comp.jumlah) || 1, data.id_perbaikan);
        } else if (isDinRad) {
          deductDinRadStock(comp.id_komponen, parseInt(comp.jumlah) || 1, data.id_perbaikan, idMesin);
        }
      });
    }
    
    return jsonResponse({ status: 'success' });
  }
  throw new Error("Ticket not found");
}

// ===== AUTO-DEDUCT STOCK =====

/**
 * Kurangi stok elektrik dan catat ke tb_riwayat_elektrik
 */
function deductElektrikStock(idKomponen, jumlah, idPerbaikan) {
  const sheet = SS.getSheetByName('tb_stok_elektrik');
  if (!sheet) {
    Logger.log('Sheet tb_stok_elektrik NOT FOUND');
    return;
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.findIndex(h => String(h).toLowerCase() === 'id_komponen');
  const stokCol = headers.findIndex(h => String(h).toLowerCase() === 'stok_saat_ini');
  const batasMinimalCol = headers.findIndex(h => String(h).toLowerCase() === 'batas_minimal');
  
  Logger.log('deductElektrikStock: idKomponen=' + idKomponen + ', jumlah=' + jumlah);
  Logger.log('Headers: ' + JSON.stringify(headers));
  Logger.log('idCol=' + idCol + ', stokCol=' + stokCol + ', batasMinimalCol=' + batasMinimalCol);
  
  if (idCol === -1 || stokCol === -1) {
    Logger.log('Required columns not found');
    return;
  }
  
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(idKomponen)) {
      found = true;
      Logger.log('Found komponen at row ' + (i+1) + ', current stok=' + data[i][stokCol]);
      const stokSaatIni = parseInt(data[i][stokCol]) || 0;
      const newStok = Math.max(0, stokSaatIni - jumlah);
      data[i][stokCol] = newStok;
      const idStokElektrik = String(data[i][0]); // kolom 0 = id_stok_elektrik
      const namaKomponen = String(data[i][2] || '');
      const batasMinimal = batasMinimalCol > -1 ? parseInt(data[i][batasMinimalCol]) || 0 : 0;
      sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
      Logger.log('Stock updated from ' + stokSaaIni + ' to ' + newStok);
      
      handleStockNotification(idKomponen, newStok, batasMinimal, 'elektrik', namaKomponen);
      
      const riwayatSheet = SS.getSheetByName('tb_riwayat_elektrik');
      if (riwayatSheet) {
        const idRiwayat = generateRiwayatId(true);
        riwayatSheet.appendRow([idRiwayat, idStokElektrik, 'Keluar', jumlah, new Date().toISOString().split('T')[0], 'Auto-deduct from ticket']);
        Logger.log('Riwayat appended: ' + idRiwayat);
      }
      break;
    }
  }
  
  if (!found) {
    Logger.log('Komponen ' + idKomponen + ' NOT FOUND in tb_stok_elektrik');
  }
}

/**
 * Kurangi stok dinamo/radiator dan catat ke tb_riwayat_din_rad
 * - Cek kompatibilitas_unit: harus 'UNIVERSAL' atau mengandung idMesin
 */
function deductDinRadStock(idKomponen, jumlah, idPerbaikan, idMesin) {
  const sheet = SS.getSheetByName('tb_stok_din_rad');
  if (!sheet) {
    Logger.log('Sheet tb_stok_din_rad NOT FOUND');
    return;
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.findIndex(h => String(h).toLowerCase() === 'id_komponen');
  const stokCol = headers.findIndex(h => String(h).toLowerCase() === 'stok_saat_ini');
  const batasMinimalCol = headers.findIndex(h => String(h).toLowerCase() === 'batas_minimal');
  
  // FLEXIBLE: terima both spellings untuk kompatibilitas
  const kompatibilitasCol = headers.findIndex(h => {
    const name = String(h).toLowerCase();
    return name === 'kompatibilitas_unit' || name === 'kompabilitas_unit';
  });
  
  Logger.log('deductDinRadStock: idKomponen=' + idKomponen + ', jumlah=' + jumlah + ', idMesin=' + idMesin);
  Logger.log('Headers: ' + JSON.stringify(headers));
  Logger.log('idCol=' + idCol + ', stokCol=' + stokCol + ', kompatibilitasCol=' + kompatibilitasCol + ', batasMinimalCol=' + batasMinimalCol);
  
  if (idCol === -1 || stokCol === -1) {
    Logger.log('Required columns not found');
    return;
  }
  
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(idKomponen)) {
      found = true;
      const kompatibilitas = kompatibilitasCol > -1 ? String(data[i][kompatibilitasCol] || '').toUpperCase() : '';
      const mesinUpper = String(idMesin || '').toUpperCase();
      Logger.log('Found at row ' + (i+1) + ', kompatibilitas=' + kompatibilitas + ', mesinUpper=' + mesinUpper);
      
      if (kompatibilitas === 'UNIVERSAL' || (mesinUpper && kompatibilitas.includes(mesinUpper))) {
        Logger.log('Compatibility MATCH, deducting...');
        const stokSaatIni = parseInt(data[i][stokCol]) || 0;
        const newStok = Math.max(0, stokSaatIni - jumlah);
        data[i][stokCol] = newStok;
        const idStokDinRad = String(data[i][0]); // kolom 0 = id_stok_din_rad
        const namaKomponen = String(data[i][3] || data[i][2] || '');
        const batasMinimal = batasMinimalCol > -1 ? parseInt(data[i][batasMinimalCol]) || 0 : 0;
        sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
        Logger.log('Stock updated from ' + stokSaaIni + ' to ' + newStok);
        
        handleStockNotification(idKomponen, newStok, batasMinimal, 'din_rad', namaKomponen);
        
        const riwayatSheet = SS.getSheetByName('tb_riwayat_din_rad');
        if (riwayatSheet) {
          const idRiwayat = generateRiwayatId(false);
          riwayatSheet.appendRow([idRiwayat, idStokDinRad, 'Keluar', jumlah, new Date().toISOString().split('T')[0], 'Auto-deduct from ticket']);
          Logger.log('Riwayat appended: ' + idRiwayat);
        }
      } else {
        Logger.log('Compatibility NO MATCH, skipping deduction');
      }
      break;
    }
  }
  
  if (!found) {
    Logger.log('Komponen ' + idKomponen + ' NOT FOUND in tb_stok_din_rad');
  }
}

// ===== WHATSAPP NOTIFICATION =====

const WHATSAPP_PHONE = '';
const WHATSAPP_API_KEY = '';

function ensureNotifikasiSheet() {
  let sheet = SS.getSheetByName('tb_notifikasi_stok');
  if (!sheet) {
    sheet = SS.insertSheet('tb_notifikasi_stok');
    sheet.appendRow(['id_komponen', 'tipe_stok', 'last_notified']);
  }
  return sheet;
}

function sendWhatsAppNotification(message) {
  try {
    if (!WHATSAPP_PHONE || !WHATSAPP_API_KEY) {
      Logger.log('WhatsApp not configured, skipping notification');
      return;
    }
    const url = 'https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent(WHATSAPP_PHONE) + '&text=' + encodeURIComponent(message) + '&apikey=' + encodeURIComponent(WHATSAPP_API_KEY);
    UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  } catch (e) {
    Logger.log('WhatsApp notification failed: ' + e.toString());
  }
}

function shouldSendNotification(idKomponen, tipeStok) {
  const sheet = ensureNotifikasiSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return true;
  const headers = data[0];
  const idCol = headers.findIndex(h => String(h).toLowerCase() === 'id_komponen');
  const tipeCol = headers.findIndex(h => String(h).toLowerCase() === 'tipe_stok');
  const lastNotifiedCol = headers.findIndex(h => String(h).toLowerCase() === 'last_notified');
  if (idCol === -1 || tipeCol === -1 || lastNotifiedCol === -1) return true;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(idKomponen) && String(data[i][tipeCol]) === String(tipeStok)) {
      const lastNotified = new Date(data[i][lastNotifiedCol]);
      if (isNaN(lastNotified.getTime())) return true;
      const hoursDiff = (new Date() - lastNotified) / (1000 * 60 * 60);
      return hoursDiff >= 168;
    }
  }
  return true;
}

function markNotificationSent(idKomponen, tipeStok) {
  const sheet = ensureNotifikasiSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.findIndex(h => String(h).toLowerCase() === 'id_komponen');
  const tipeCol = headers.findIndex(h => String(h).toLowerCase() === 'tipe_stok');
  const lastNotifiedCol = headers.findIndex(h => String(h).toLowerCase() === 'last_notified');
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(idKomponen) && String(data[i][tipeCol]) === String(tipeStok)) {
      sheet.getRange(i + 1, lastNotifiedCol + 1).setValue(new Date().toISOString());
      found = true;
      break;
    }
  }
  if (!found) {
    sheet.appendRow([idKomponen, tipeStok, new Date().toISOString()]);
  }
}

function handleStockNotification(idKomponen, newStok, batasMinimal, tipeStok, namaKomponen) {
  if (!namaKomponen) namaKomponen = idKomponen;
  const label = tipeStok === 'elektrik' ? 'Elektrik' : 'Dinamo/Radiator';
  if (newStok === 0) {
    sendWhatsAppNotification('🚨 STOK HABIS: ' + namaKomponen + ' (' + label + ')');
    recordFirstAlert(idKomponen, tipeStok);
  } else if (newStok <= batasMinimal) {
    if (shouldSendNotification(idKomponen, tipeStok)) {
      sendWhatsAppNotification('⚠️ STOK MENIPIS: ' + namaKomponen + ' (' + label + ') - Sisa: ' + newStok + ', Batas Minimal: ' + batasMinimal);
      markNotificationSent(idKomponen, tipeStok);
    }
    recordFirstAlert(idKomponen, tipeStok);
  }
}

function handleRecoveryNotification(idKomponen, oldStok, newStok, batasMinimal, tipeStok, namaKomponen) {
  if (!namaKomponen) namaKomponen = idKomponen;
  if (oldStok <= batasMinimal && newStok > batasMinimal) {
    if (shouldSendNotification(idKomponen, tipeStok)) {
      const label = tipeStok === 'elektrik' ? 'Elektrik' : 'Dinamo/Radiator';
      sendWhatsAppNotification('✅ STOK RECOVERY: ' + namaKomponen + ' (' + label + ') - Stok kembali normal: ' + newStok);
      markNotificationSent(idKomponen, tipeStok);
    }
    recordRestockDate(idKomponen, tipeStok);
  }
}

// ===== RESTOCK STATUS TRACKING =====

function ensureStatusRestokSheet() {
  let sheet = SS.getSheetByName('tb_status_restok');
  if (!sheet) {
    sheet = SS.insertSheet('tb_status_restok');
    sheet.appendRow(['id_komponen', 'tipe_stok', 'first_alert', 'last_reminder', 'status_dipesan', 'tanggal_restok']);
  }
  return sheet;
}

function getAllStokElektrikData() {
  const sheet = SS.getSheetByName('tb_stok_elektrik');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function getAllStokDinRadData() {
  const sheet = SS.getSheetByName('tb_stok_din_rad');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function recordFirstAlert(idKomponen, tipeStok) {
  const sheet = ensureStatusRestokSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.findIndex(h => String(h).toLowerCase() === 'id_komponen');
  const tipeCol = headers.findIndex(h => String(h).toLowerCase() === 'tipe_stok');
  const firstCol = headers.findIndex(h => String(h).toLowerCase() === 'first_alert');
  
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(idKomponen) && String(data[i][tipeCol]) === String(tipeStok)) {
      if (!data[i][firstCol]) {
        sheet.getRange(i + 1, firstCol + 1).setValue(new Date().toISOString());
      }
      found = true;
      break;
    }
  }
  
  if (!found) {
    sheet.appendRow([idKomponen, tipeStok, new Date().toISOString(), '', '', '']);
  }
}

function updateLastReminder(idKomponen, tipeStok) {
  const sheet = ensureStatusRestokSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.findIndex(h => String(h).toLowerCase() === 'id_komponen');
  const tipeCol = headers.findIndex(h => String(h).toLowerCase() === 'tipe_stok');
  const lastCol = headers.findIndex(h => String(h).toLowerCase() === 'last_reminder');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(idKomponen) && String(data[i][tipeCol]) === String(tipeStok)) {
      sheet.getRange(i + 1, lastCol + 1).setValue(new Date().toISOString());
      return;
    }
  }
}

function markAsDipesan(idKomponen, tipeStok) {
  const sheet = ensureStatusRestokSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.findIndex(h => String(h).toLowerCase() === 'id_komponen');
  const tipeCol = headers.findIndex(h => String(h).toLowerCase() === 'tipe_stok');
  const statusCol = headers.findIndex(h => String(h).toLowerCase() === 'status_dipesan');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(idKomponen) && String(data[i][tipeCol]) === String(tipeStok)) {
      sheet.getRange(i + 1, statusCol + 1).setValue('dipesan');
      return;
    }
  }
}

function recordRestockDate(idKomponen, tipeStok) {
  const sheet = ensureStatusRestokSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.findIndex(h => String(h).toLowerCase() === 'id_komponen');
  const tipeCol = headers.findIndex(h => String(h).toLowerCase() === 'tipe_stok');
  const restokCol = headers.findIndex(h => String(h).toLowerCase() === 'tanggal_restok');
  const statusCol = headers.findIndex(h => String(h).toLowerCase() === 'status_dipesan');
  const firstCol = headers.findIndex(h => String(h).toLowerCase() === 'first_alert');
  const lastCol = headers.findIndex(h => String(h).toLowerCase() === 'last_reminder');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(idKomponen) && String(data[i][tipeCol]) === String(tipeStok)) {
      sheet.getRange(i + 1, restokCol + 1).setValue(new Date().toISOString().split('T')[0]);
      sheet.getRange(i + 1, statusCol + 1).setValue('');
      sheet.getRange(i + 1, firstCol + 1).setValue('');
      sheet.getRange(i + 1, lastCol + 1).setValue('');
      return;
    }
  }
  
  sheet.appendRow([idKomponen, tipeStok, '', '', '', new Date().toISOString().split('T')[0]);
}

function shouldSendReminder(idKomponen, tipeStok) {
  const sheet = ensureStatusRestokSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.findIndex(h => String(h).toLowerCase() === 'id_komponen');
  const tipeCol = headers.findIndex(h => String(h).toLowerCase() === 'tipe_stok');
  const firstCol = headers.findIndex(h => String(h).toLowerCase() === 'first_alert');
  const lastCol = headers.findIndex(h => String(h).toLowerCase() === 'last_reminder');
  const statusCol = headers.findIndex(h => String(h).toLowerCase() === 'status_dipesan');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(idKomponen) && String(data[i][tipeCol]) === String(tipeStok)) {
      const statusDipesan = String(data[i][statusCol] || '').toLowerCase();
      if (statusDipesan === 'dipesan') return false;
      
      const firstAlert = new Date(data[i][firstCol]);
      if (isNaN(firstAlert.getTime())) return false;
      
      const now = new Date();
      const daysDiff = (now - firstAlert) / (1000 * 60 * 60 * 24);
      if (daysDiff < 7) return false;
      
      const lastReminder = data[i][lastCol];
      if (lastReminder) {
        const lastReminderDate = new Date(lastReminder);
        if (!isNaN(lastReminderDate.getTime())) {
          const daysSinceReminder = (now - lastReminderDate) / (1000 * 60 * 60 * 24);
          if (daysSinceReminder < 7) return false;
        }
      }
      
      return true;
    }
  }
  return false;
}

function checkRestokStatusDaily() {
  const restokSheet = ensureStatusRestokSheet();
  const restokData = restokSheet.getDataRange().getValues();
  const restokHeaders = restokData[0];
  const rIdCol = restokHeaders.findIndex(h => String(h).toLowerCase() === 'id_komponen');
  const rTipeCol = restokHeaders.findIndex(h => String(h).toLowerCase() === 'tipe_stok');
  const rFirstCol = restokHeaders.findIndex(h => String(h).toLowerCase() === 'first_alert');
  const rLastCol = restokHeaders.findIndex(h => String(h).toLowerCase() === 'last_reminder');
  const rStatusCol = restokHeaders.findIndex(h => String(h).toLowerCase() === 'status_dipesan');
  
  const allStok = [...getAllStokElektrikData(), ...getAllStokDinRadData()];
  const now = new Date();
  
  allStok.forEach(item => {
    const idKomponen = String(item.id_komponen || item.id_stok_elektrik || item.id_stok_din_rad || '');
    const tipeStok = String(item.id_stok_elektrik ? 'elektrik' : 'din_rad');
    const stokSaatIni = parseInt(item.stok_saat_ini) || 0;
    const batasMinimal = parseInt(item.batas_minimal) || 0;
    const namaKomponen = String(item.nama_komponen || item.nama_spesifikasi_barang || idKomponen);
    
    if (stokSaaIni === 0 || stokSaaIni <= batasMinimal) {
      let statusRow = -1;
      for (let i = 1; i < restokData.length; i++) {
        if (String(restokData[i][rIdCol]) === idKomponen && String(restokData[i][rTipeCol]) === tipeStok) {
          statusRow = i;
          break;
        }
      }
      
      if (statusRow === -1) {
        const label = tipeStok === 'elektrik' ? 'Elektrik' : 'Dinamo/Radiator';
        if (stokSaaIni === 0) {
          sendWhatsAppNotification('🚨 STOK HABIS: ' + namaKomponen + ' (' + label + ')');
        } else if (shouldSendNotification(idKomponen, tipeStok)) {
          sendWhatsAppNotification('⚠️ STOK MENIPIS: ' + namaKomponen + ' (' + label + ') - Sisa: ' + stokSaaIni + ', Batas Minimal: ' + batasMinimal);
          markNotificationSent(idKomponen, tipeStok);
        }
        restokSheet.appendRow([idKomponen, tipeStok, new Date().toISOString(), '', '', '']);
      } else {
        const statusDipesan = String(restokData[statusRow][rStatusCol] || '').toLowerCase();
        if (statusDipesan === 'dipesan') return;
        
        const firstAlert = new Date(restokData[statusRow][rFirstCol]);
        if (isNaN(firstAlert.getTime())) return;
        
        const daysDiff = (now - firstAlert) / (1000 * 60 * 60 * 24);
        if (daysDiff < 7) return;
        
        const lastReminder = restokData[statusRow][rLastCol];
        let shouldRemind = true;
        if (lastReminder) {
          const lastReminderDate = new Date(lastReminder);
          if (!isNaN(lastReminderDate.getTime())) {
            const daysSinceReminder = (now - lastReminderDate) / (1000 * 60 * 60 * 24);
            if (daysSinceReminder < 7) shouldRemind = false;
          }
        }
        
        if (shouldRemind) {
          const label = tipeStok === 'elektrik' ? 'Elektrik' : 'Dinamo/Radiator';
          sendWhatsAppNotification('🔔 Reminder: Stok ' + namaKomponen + ' (' + label + ') sudah menipis sejak ' + Math.floor(daysDiff) + ' hari lalu dan belum dipesan. Segera lakukan procurement!');
          restokSheet.getRange(statusRow + 1, rLastCol + 1).setValue(new Date().toISOString());
        }
      }
    }
  });
}

function setupRestokTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'checkRestokStatusDaily') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  
  ScriptApp.newTrigger('checkRestokStatusDaily')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();
}

function markAsDipesanAPI(data) {
  try {
    const idKomponen = String(data.id_komponen);
    const tipeStok = String(data.tipe_stok);
    markAsDipesan(idKomponen, tipeStok);
    return jsonResponse({ status: 'success' });
  } catch (e) {
    return jsonResponse({ status: 'error', message: e.toString() });
  }
}
