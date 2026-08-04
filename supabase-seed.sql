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
INSERT INTO public.tb_perbaikan (id_perbaikan, nama_unit, id_mesin, id_kategori_sparepart, lokasi_operasi, tgl_masuk, status_perbaikan, catatan) VALUES
  ('DA-001', 'Excavator 01', 'MES-001', 'Dinamo Amper', 'Depo 4', '2024-01-15', 'Menunggu Pengecekan', 'Cek dinamo amper'),
  ('DS-001', 'Dump Truck 02', 'MES-002', 'Dinamo Starter', 'Workshop', '2024-01-16', 'Dalam Pengerjaan', 'Ganti starter'),
  ('RD-001', 'Excavator 01', 'MES-001', 'Radiator', 'Lapangan', '2024-01-17', 'Selesai', 'Selesai radiator')
ON CONFLICT (id_perbaikan) DO NOTHING;

-- Cek data yang sudah ada:
-- SELECT * FROM tb_kategori_sparepart;
-- SELECT * FROM tb_lokasi;
-- SELECT * FROM tb_mesin;
-- SELECT * FROM tb_komponen_detail;
-- SELECT * FROM tb_perbaikan;
