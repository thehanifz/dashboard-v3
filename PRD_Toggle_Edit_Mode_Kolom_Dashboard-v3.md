# PRD: Toggle Edit Mode per Kolom (Ikon Pensil di Header Tabel)
**Produk:** dashboard-v3 — thehanifz/dashboard-v3
**Modul:** Frontend Table Component (`frontend/src/components/table/`)
**Versi Dokumen:** 1.0 (Draft)
**Tanggal:** 13 Agustus 2026

---

## 1. Overview & Executive Summary

Dashboard-v3 saat ini memiliki mekanisme untuk mengatur kolom mana yang dapat diedit melalui `EditableColumnsModal.tsx` — sebuah modal checklist terpisah dari tabel utama. Fitur ini mengusulkan penggantian mekanisme tersebut dengan **ikon pensil inline di header setiap kolom**, sejajar dengan ikon filter dan pin yang sudah ada, mengikuti pola interaksi yang konsisten dan familiar bagi pengguna (mirip Notion/Airtable/Google Sheets).

Dengan pendekatan baru ini, pengguna (role Engineer dan PTL) dapat mengaktifkan mode edit langsung dari kolom yang diinginkan tanpa membuka popup atau modal — begitu ikon pensil kolom diklik, seluruh baris pada kolom tersebut langsung berubah menjadi input yang bisa diketik langsung (inline editing), tanpa konfirmasi tambahan.

## 2. Problem Statement

Mekanisme `EditableColumnsModal.tsx` saat ini memisahkan aksi "menentukan kolom mana yang bisa diedit" dari konteks visual tabel itu sendiri — pengguna harus membuka modal terpisah untuk melihat dan mencentang kolom yang ingin diaktifkan editnya, padahal aksi kolom lain (filter, pin) sudah tersedia langsung di header. Ketidakkonsistenan pola interaksi ini:

- Menambah friksi karena pengguna berpindah konteks (tabel → modal → tabel).
- Membuat status "kolom mana yang aktif diedit" tidak langsung terlihat di tabel tanpa membuka modal lagi.
- Tidak selaras dengan mental model pengguna yang sudah familiar dengan pola ikon aksi di header kolom.

## 3. Goals & Success Metrics (KPI/OKR)

| Goal | Metrik Keberhasilan |
|---|---|
| Menyederhanakan interaksi edit kolom | Pengguna dapat mengaktifkan mode edit kolom dalam 1 klik, tanpa membuka modal |
| Konsistensi UI/UX | Ikon pensil mengikuti pola visual & interaksi yang identik dengan ikon filter/pin (posisi, hover state, default hidden) |
| Tidak menurunkan performa | Tidak ada regresi waktu render tabel pada dataset besar (~19.000 baris) setelah mode edit kolom diaktifkan |
| Menjaga integritas permission | Ikon pensil hanya muncul pada kolom yang sesuai `canEditColumn()` untuk role aktif (Engineer/PTL) — nol insiden edit tidak sah |

## 4. Target Users & Personas

| Persona | Role di Sistem | Pain Point Utama |
|---|---|---|
| Engineer | `Engineer` | Perlu mengedit banyak kolom data teknis (status PA, Teskom, BAI) secara cepat tanpa bolak-balik modal |
| PTL (Pengawas) | `Ptl` | Bekerja di tabel/sheet berbeda (`ptl-sheet`) dengan set kolom editable yang berbeda dari Engineer; butuh kontrol cepat kolom mana yang sedang diedit |

Role Mitra dan Superuser tidak menjadi fokus utama pembahasan ini, namun perubahan harus tetap kompatibel dengan sistem permission mereka.

## 5. Scope (In-Scope / Out-of-Scope)

**In-Scope:**
- Menambahkan ikon pensil di `TableHeaderCell.tsx`, default hidden, muncul saat hover — sejajar dengan ikon filter dan pin yang sudah ada.
- Ikon pensil hanya dirender pada kolom yang lolos `useRole().canEditColumn(columnName)` untuk role user aktif (Engineer/PTL).
- Klik ikon pensil mengaktifkan/menonaktifkan mode edit untuk **seluruh kolom** tersebut (state per kolom, bukan per cell).
- Saat kolom aktif, setiap baris yang tampil (sesuai pagination aktif) langsung berubah dari `CellContent` (display) menjadi input inline — tanpa popup atau modal konfirmasi.
- Mendukung multi-kolom aktif secara bersamaan.
- Penyesuaian `useCellEditor.ts` agar state edit-mode disimpan per kolom, bukan per cell tunggal.
- Penyesuaian endpoint update sesuai konteks sheet aktif (`/records/` untuk Engineer, `/ptl-sheet/` untuk PTL).

**Out-of-Scope (untuk versi ini):**
- Perubahan sistem permission dasar di `rolePermissions.ts` (source of truth tetap dipakai, tidak diubah logikanya).
- Dukungan role Mitra dan Superuser secara eksplisit (mengikuti sistem existing, tidak dikembangkan baru).
- Fitur undo/redo untuk perubahan inline.
- Bulk-edit lintas baris (mengetik satu nilai lalu apply ke semua baris sekaligus).
- Migrasi/penghapusan `EditableColumnsModal.tsx` — keputusan retensi/deprecation dibahas di Open Questions.

## 6. User Stories & Use Cases

**US-1**
Sebagai seorang **Engineer**, saya ingin mengklik ikon pensil di header kolom, sehingga saya bisa langsung mengedit nilai di kolom tersebut untuk semua baris tanpa membuka modal.
*Acceptance Criteria:*
- Ikon pensil muncul saat hover pada header kolom yang editable untuk role Engineer.
- Klik ikon pensil mengubah state kolom menjadi "edit aktif" (ikon menjadi solid/berwarna).
- Semua cell pada kolom tersebut (baris yang tampil di halaman aktif) berubah menjadi input yang bisa langsung diketik.
- Tidak ada popup atau modal yang muncul saat proses ini.

**US-2**
Sebagai seorang **PTL**, saya ingin ikon pensil hanya muncul pada kolom yang memang saya berhak edit, sehingga saya tidak salah mengklik kolom yang bukan wewenang saya.
*Acceptance Criteria:*
- Ikon pensil tidak dirender sama sekali pada kolom yang `canEditColumn()` mengembalikan `false` untuk role PTL.
- Kolom yang boleh diedit PTL merujuk pada set permission yang sesuai konteks sheet PTL (`ptl-sheet`), bukan set permission Engineer.

**US-3**
Sebagai pengguna (Engineer/PTL), saya ingin bisa mengaktifkan mode edit di lebih dari satu kolom secara bersamaan, sehingga saya bisa mengisi beberapa field terkait tanpa toggle berulang kali.
*Acceptance Criteria:*
- State edit-mode disimpan sebagai kumpulan (set/array) nama kolom, bukan boolean tunggal.
- Mengaktifkan kolom B tidak menonaktifkan kolom A yang sudah aktif sebelumnya.

**US-4**
Sebagai pengguna, saya ingin klik ikon pensil kedua kalinya menonaktifkan mode edit kolom tersebut, sehingga saya bisa mengembalikan tampilan ke mode baca normal.
*Acceptance Criteria:*
- Klik ikon pensil pada kolom yang sedang aktif mengubah state kembali menjadi tidak aktif.
- Cell pada kolom tersebut kembali render sebagai `CellContent` (tampilan display biasa).

**US-5**
Sebagai pengguna, saya ingin perubahan yang saya ketik di cell tersimpan otomatis (tanpa tombol simpan manual), sehingga proses edit terasa cepat dan seamless.
*Acceptance Criteria:*
- Nilai tersimpan otomatis saat fokus input dilepas (`onBlur`) atau menekan Enter.
- Ada indikator visual jelas bila penyimpanan gagal (misalnya border merah pada cell terkait).

## 7. Functional Requirements

1. Sistem harus menampilkan ikon pensil pada `TableHeaderCell.tsx` dengan state default hidden, muncul saat hover, konsisten dengan pola ikon filter dan pin.
2. Sistem harus memfilter render ikon pensil berdasarkan hasil `useRole().canEditColumn(columnName)` sesuai role user aktif dan konteks sheet (Engineer vs PTL).
3. Sistem harus menyimpan state kolom aktif-edit dalam struktur data yang mendukung banyak kolom sekaligus (contoh: `Set<string>` atau `string[]`).
4. Sistem harus merender ulang cell pada kolom aktif dari mode `CellContent` (display) ke mode input (`EditableCell`) untuk semua baris yang sedang ditampilkan (sesuai pagination).
5. Sistem harus mengirim update ke endpoint yang sesuai konteks role (Engineer → `/records/{row_id}/cells`, PTL → `/ptl-sheet/{row_id}/cells`).
6. Sistem harus menyimpan perubahan secara otomatis (auto-save) tanpa memerlukan tombol simpan manual atau modal konfirmasi.
7. Sistem harus menampilkan indikator kegagalan simpan pada level cell jika API update gagal.

## 8. Non-Functional Requirements

- **Performa:** Tidak boleh terjadi penurunan signifikan pada waktu render tabel saat mode edit kolom diaktifkan, khususnya pada dataset besar (~19.000 baris, mengacu pada implementasi IndexedDB cache yang sudah ada). Disarankan render input hanya pada baris yang tampil di halaman aktif (sudah didukung oleh `TablePagination.tsx`).
- **Keamanan:** Validasi permission (`canEditColumn`) harus tetap dilakukan di sisi backend, tidak hanya di frontend — ikon pensil yang hilang di UI bukan satu-satunya lapisan pertahanan terhadap edit tidak sah.
- **Konsistensi UI:** Posisi, ukuran, dan perilaku hover ikon pensil harus identik dengan ikon filter dan pin yang sudah ada di `TableHeaderCell.tsx`.
- **Reliability:** Auto-save perlu mekanisme retry atau minimal notifikasi jelas saat gagal, mengingat tidak ada popup konfirmasi yang biasanya menampung pesan error.

## 9. Technical Considerations

Mengacu pada stack yang digunakan (React + TypeScript, Vite, TailwindCSS, backend FastAPI):

- **State management:** Perluasan `hooks/useCellEditor.ts` untuk menambah state `editModeColumns` (bertipe `Set<string>` atau `string[]`), dikelola di level yang sama dengan state filter dan pin agar arsitektur tetap konsisten.
- **Component target:** `TableHeaderCell.tsx` (tambah ikon), `EditableCell.tsx`/`CellContent.tsx` (logic conditional render berdasarkan status kolom, bukan lagi status cell individual).
- **Role & endpoint mapping:** Perlu dipastikan `useCellEditor.ts` dapat membedakan konteks sheet aktif (Engineer vs PTL) untuk menentukan endpoint update yang benar — ini krusial karena backend memisahkan router `engineer.py` dan `ptl.py` dengan path berbeda.
- **Debounce:** Pertimbangkan debounce atau save-on-blur (bukan save-per-keystroke) untuk mengurangi beban API call, terutama pada kolom yang aktif di banyak baris sekaligus.
- **Deprecation path:** Perlu keputusan teknis soal `EditableColumnsModal.tsx` — dipertahankan sebagai admin tool, atau dihapus penuh (lihat Open Questions).

## 10. UI/UX Requirements & Wireframe Notes

- Ikon pensil ditempatkan di header kolom, sejajar horizontal dengan ikon filter dan pin yang sudah ada — urutan dan spacing ikon harus konsisten dengan pola existing.
- Default state: hidden, muncul saat kolom di-hover (mengikuti perilaku ikon filter/pin saat ini).
- State aktif: ikon berubah warna/menjadi solid untuk menandakan kolom sedang dalam mode edit — perlu berbeda secara visual dari state hover biasa.
- Saat kolom aktif, seluruh cell di kolom itu langsung berubah menjadi elemen input (text/select/date sesuai tipe data kolom) tanpa transisi popup.
- Cell yang gagal tersimpan diberi indikator visual (contoh: border merah + ikon warning kecil) agar terlihat langsung di dalam tabel tanpa perlu notifikasi terpisah.

## 11. Dependencies & Risks

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Render input di banyak cell sekaligus menurunkan performa pada dataset besar | Tinggi | Batasi render input hanya pada baris yang tampil (pagination aktif), bukan seluruh dataset |
| Endpoint update salah sasaran antara konteks Engineer dan PTL | Tinggi | Pastikan `useCellEditor.ts` menerima parameter konteks sheet secara eksplisit sebelum fitur dirilis |
| Ambiguitas fungsi `EditableColumnsModal.tsx` pasca perubahan | Menengah | Putuskan status modal (retensi/deprecation) sebelum implementasi selesai — lihat Open Questions |
| Tidak ada indikator kegagalan simpan yang jelas tanpa popup | Menengah | Implementasi indikator visual per-cell sebagai pengganti pesan error modal |
| Dependensi pada `rolePermissions.ts` dan `useRole.ts` yang isi persisnya belum terverifikasi langsung dari kode | Menengah | Verifikasi manual signature `canEditColumn()` sebelum development dimulai |

## 12. Timeline & Milestones

Dokumen ini adalah rangkuman kebutuhan fungsional; timeline detail (sprint/tanggal) belum ditentukan dan disarankan dibahas terpisah bersama tim setelah scope dan Open Questions di bawah disepakati.

## 13. Open Questions

1. Apakah `EditableColumnsModal.tsx` akan dihapus total, atau dipertahankan untuk kasus lain (misalnya pengaturan default permission oleh Superuser)?
2. Apakah auto-save terjadi per keystroke (dengan debounce) atau saat `onBlur`/`Enter`?
3. Apakah state `editModeColumns` bersifat per-sesi (reset saat reload halaman) atau perlu persisten (tersimpan di localStorage/IndexedDB seperti cache records yang sudah ada)?
4. Bagaimana konfirmasi signature pasti `canEditColumn()` di `useRole.ts` — apakah sudah menerima parameter konteks sheet (Engineer vs PTL), atau perlu penyesuaian tambahan?
5. Apakah role Mitra dan Superuser perlu perilaku serupa di masa depan, atau tetap menggunakan mekanisme lama?

---

## Ringkasan Analisa

**Top 3 Risiko Terbesar:**
1. **Performa rendering** — mengubah banyak cell jadi input sekaligus pada dataset besar (~19.000 baris) berisiko memperlambat UI jika tidak dibatasi ke baris yang tampil saja.
2. **Endpoint mismatch Engineer vs PTL** — karena backend memisahkan route `/records/` dan `/ptl-sheet/`, kesalahan mapping context bisa membuat data tersimpan ke endpoint yang salah.
3. **Ketidakjelasan status permission function** — karena isi kode `useRole.ts`/`rolePermissions.ts` belum terverifikasi langsung, ada risiko asumsi signature fungsi tidak sesuai implementasi nyata.

**Rekomendasi MVP (v1):**
- Ikon pensil di header kolom (default hidden, hover to show) untuk role Engineer dan PTL saja.
- Toggle aktif/nonaktif per kolom dengan state `Set<string>`.
- Inline editing tanpa popup, auto-save on-blur.
- Filtering ikon berdasarkan `canEditColumn()` existing — tidak ada perubahan logic permission.

**Fitur yang Bisa Ditunda ke v2/v3:**
- Indikator kegagalan simpan yang lebih kaya (retry otomatis, toast notification).
- Dukungan role Mitra dan Superuser untuk mekanisme yang sama.
- Bulk-edit atau copy-paste antar baris dalam mode kolom aktif.
- Persistensi state edit-mode kolom antar sesi/reload.
- Deprecation resmi `EditableColumnsModal.tsx` beserta migrasi penuh.

---

Apakah ada bagian yang perlu diubah atau ditambahkan?
