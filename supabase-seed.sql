-- Data yang BELUM ADA di Supabase
-- Kategori sparepart sudah terisi, jadi hanya insert data lain

-- 1. Lokasi
INSERT INTO public.tb_lokasi (id_lokasi, nama_lokasi) VALUES
  ('LOK-001', 'Depo 4'),
  ('LOK-002', 'Workshop'),
  ('LOK-003', 'Lapangan')
ON CONFLICT (id_lokasi) DO NOTHING;

-- 2. Mesin
INSERT INTO public.tb_mesin (id_mesin, nama_mesin) VALUES
  ('MES-001', 'PK260'),
  ('MES-002', 'Excavator 01'),
  ('MES-003', 'Dump Truck 02')
ON CONFLICT (id_mesin) DO NOTHING;

-- 3. Stok Elektrik
INSERT INTO public.tb_stok_elektrik (id_stok_elektrik, id_komponen, nama_komponen, stok_saat_ini, batas_minimal) VALUES
  ('STE-001', 'KOM-001', 'Arduino Mega', 5, 2),
  ('STE-002', 'KOM-002', 'ESP32', 12, 5),
  ('STE-003', 'KOM-007', 'Relay Module', 3, 2)
ON CONFLICT (id_stok_elektrik) DO NOTHING;

-- 4. Stok Dinamo/Radiator
INSERT INTO public.tb_stok_din_rad (id_stok_din_rad, id_komponen, kompatibilitas_unit, nama_spesifikasi_barang, posisi_rak, stok_saat_ini, batas_minimal) VALUES
  ('SDR-001', 'KOM-004', 'UNIVERSAL', 'Radiator Aluminium', 'Rak A1', 8, 3),
  ('SDR-002', 'KOM-003', 'PK260', 'Dinamo Amper 24V', 'Rak B2', 2, 1)
ON CONFLICT (id_stok_din_rad) DO NOTHING;

-- 5. Sample data perbaikan (jika tabel tb_perbaikan masih kosong)
--    Format ID: PREFIX-XXXX (4 digit, auto-increment via generateTicketId)
INSERT INTO public.tb_perbaikan (id_perbaikan, nama_unit, id_mesin, id_kategori_sparepart, lokasi_operasi, tgl_masuk, status_perbaikan, catatan) VALUES
  ('DA-0001', 'Excavator 01', 'MES-001', 'Dinamo Amper', 'Depo 4', '2024-01-15', 'Menunggu Pengecekan', 'Cek dinamo amper'),
  ('DS-0001', 'Dump Truck 02', 'MES-002', 'Dinamo Starter', 'Workshop', '2024-01-16', 'Dalam Pengerjaan', 'Ganti starter'),
  ('RD-0001', 'Excavator 01', 'MES-001', 'Radiator', 'Lapangan', '2024-01-17', 'Selesai', 'Selesai radiator')
ON CONFLICT (id_perbaikan) DO NOTHING;

-- 6. Sample data dinamo ready (jika tabel tb_dinamo_ready masih kosong)
INSERT INTO public.tb_dinamo_ready (id_dinamo_ready, tipe_dinamo, id_mesin, kondisi, keterangan) VALUES
  ('DRD-001', 'Dinamo Starter', 'MES-001', 'Bagus / Utuh', 'Siap pasang langsung'),
  ('DRD-002', 'Dinamo Amper (Alternator)', 'MES-002', 'Terkanibal Sebagian', 'Stator masih bagus'),
  ('DRD-003', 'Dinamo Starter', 'MES-003', 'Habis / Afkir', 'Sudah habis dikanibal')
ON CONFLICT (id_dinamo_ready) DO NOTHING;

-- 7. Sample data riwayat kanibal (jika tabel tb_riwayat_kanibal masih kosong)
INSERT INTO public.tb_riwayat_kanibal (id_kanibal, id_dinamo_ready, id_perbaikan, id_komponen, tanggal_kanibal, keterangan) VALUES
  ('KAN-001', 'DRD-002', 'DA-0001', 'KOM-001', '2024-01-15', 'Copot rotor dari DRD-002 untuk DA-0001'),
  ('KAN-002', 'DRD-003', 'DS-0001', 'KOM-003', '2024-01-16', 'Ambil angker dari DRD-003 untuk DS-0001')
ON CONFLICT (id_kanibal) DO NOTHING;

-- Cek data yang sudah ada:
-- SELECT * FROM tb_kategori_sparepart;
-- SELECT * FROM tb_lokasi;
-- SELECT * FROM tb_mesin;
-- SELECT * FROM tb_komponen_detail;
-- SELECT * FROM tb_perbaikan;
