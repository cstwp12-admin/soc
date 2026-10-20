/* Set-Out Check - core, state, rendering, packages, register, setup, events, boot
   Classic script: shares one global scope with the other files. Load order: app.js, scanner.js, report.js (boot runs on window load). */
"use strict";
const APP_VERSION = "2.0.0-rc.4";
const APP_NAME = "Set-Out Check";
const APP_AUTHOR = "WPN";
const APP_CREDIT = `${APP_NAME} app developed by ${APP_AUTHOR}`;
const DEFAULT_MODEL = "gemini-3.5-flash";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const GEMINI_REV = "2026-05-20";

/* ---------------- helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const r1 = x => Math.round(x * 10) / 10;
function num(v) {
  if (v == null) return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  const s = String(v).trim().replace(/[\s,]/g, "");
  if (s === "" || s === "-" || s === ".") return null;
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
  const x = Number(s); return isFinite(x) ? x : null;
}
const tolNum = (v, fallback = 25) => { const x = num(v); return x == null ? fallback : Math.max(0, x); };
const diffMm = (m, d) => Math.round((m - d) * 10000) / 10;
const sgn = x => (x > 0 ? "+" : "") + x.toFixed(1);
const f3 = v => { const x = num(v); return x == null ? "-" : x.toFixed(3); };
function toast(msg, ms = 2600) { const el = $("#toast"); el.textContent = t(msg); el.classList.add("on"); clearTimeout(el._h); el._h = setTimeout(() => el.classList.remove("on"), ms); }
function debounce(fn, ms) { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; }
const loaded = {};
function loadScript(src) {
  if (loaded[src]) return loaded[src];
  return loaded[src] = new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => { delete loaded[src]; rej(new Error("Could not load " + src + (navigator.onLine ? "" : " (offline)"))); }; document.head.appendChild(s); });
}
async function loadPdfLibs() { await loadScript("lib/jspdf.umd.min.js"); await loadScript("lib/jspdf.plugin.autotable.min.js"); await loadScript("lib/qrcode.min.js"); }
const loadXlsx = () => loadScript("lib/xlsx.full.min.js");
function download(blob, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
async function shareOrDownload(blob, name, text) {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name, text }); return "shared"; }
    catch (e) { if (e.name === "AbortError") return "cancelled"; }
  }
  download(blob, name); return "downloaded";
}
const safeName = s => String(s).replace(/[^\w\-+.]+/g, "_");

/* ---------------- storage (IndexedDB) ---------------- */
const idb = {
  db: null,
  open() { return new Promise((res, rej) => { const r = indexedDB.open("wp12soc", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => { this.db = r.result; res(); }; r.onerror = () => rej(r.error); }); },
  get(k) { return new Promise((res, rej) => { const q = this.db.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); },
  set(k, v) { return new Promise((res, rej) => { const t = this.db.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); }
};

/* ---------------- state ---------------- */
const S = { setup: null, check: null, cfg: null, register: [], pkgs: [], pkg: "WP12", logo: {} };
const CFG_DEF = { gross: 500, marg: 80, smart: true, apiKey: "", model: DEFAULT_MODEL, presets: null, theme: "auto", appUrl: "", language: "en", reportTitle: "SETTING-OUT CHECK RECORD",
  photoPerPage: 2, reportOptions: { docRef: true, docDate: true, docRev: true, plots: true, plan: true, instrument: true, notes: true, photos: true, signoff: true },
  boardOptions: { project: true, result: true, metrics: true, attention: true, points: true, instrument: true, branding: true } };
const MS = {
  "Share": "Kongsi", "Register": "Rekod", "Setup": "Tetapan", "Help": "Bantuan", "Check details": "Butiran pemeriksaan",
  "Date": "Tarikh", "Team": "Pasukan", "Surveyed / prepared by": "Disurvei / disediakan oleh", "Name": "Nama", "Designation": "Jawatan",
  "RFI no.": "No. RFI", "Structure": "Struktur", "Chainage / location": "Rantai / lokasi", "Element / description": "Elemen / keterangan",
  "Chainage (optional)": "Chainage (pilihan)", "To": "Hingga", "No structure": "Tiada struktur", "Custom structures": "Struktur tersuai",
  "Other / enter a custom structure…": "Lain-lain / masukkan struktur tersuai…", "+ Add end chainage (optional)": "+ Tambah chainage akhir (pilihan)",
  "+ Add specific location / offset (optional)": "+ Tambah lokasi khusus / offset (pilihan)",
  "Structure (optional)": "Struktur (pilihan)", "Choose or enter a structure": "Pilih atau masukkan struktur", "+ Add to this project's list": "+ Tambah ke senarai projek ini",
  "Chainage range (optional)": "Julat chainage (pilihan)", "From": "Dari", "To": "Hingga", "Specific location / offset (optional)": "Lokasi khusus / offset (pilihan)",
  "Saved structure choices are for this project on this device.": "Pilihan struktur disimpan untuk projek ini pada peranti ini.",
  "Structure added to this project's list.": "Struktur ditambah ke senarai projek ini.", "Enter a structure first.": "Masukkan struktur dahulu.",
  "Type chainage digits; the + is inserted automatically (e.g. 12345 becomes 12+345).": "Taip digit chainage; tanda + dimasukkan secara automatik (cth. 12345 menjadi 12+345).",
  "Start a new check": "Mulakan pemeriksaan baharu", "↺ Start a new check": "↺ Mulakan pemeriksaan baharu",
  "PDF ready. You can start another check when you are done.": "PDF sedia. Anda boleh memulakan pemeriksaan lain apabila selesai.",
  "Check type": "Jenis pemeriksaan", "Horizontal (E, N)": "Mendatar (E, N)", "Level (RL)": "Aras (RL)", "Horizontal + Level": "Mendatar + Aras",
  "Element type (tolerance preset)": "Jenis elemen (pratetap toleransi)", "Horizontal tol. (mm, radial)": "Toleransi mendatar (mm, jejari)",
  "Level upper tol. (+ mm)": "Toleransi aras atas (+ mm)", "Level lower tol. (− mm)": "Toleransi aras bawah (− mm)",
  "Tolerance source": "Sumber toleransi", "Coordinate system": "Sistem koordinat", "Instrument, control points & checker": "Instrumen, titik kawalan & pemeriksa",
  "Instrument (make / model)": "Instrumen (jenama / model)", "Serial no.": "No. siri", "Calibration date": "Tarikh kalibrasi",
  "Instrument station (control pt)": "Stesen instrumen (titik kawalan)", "Backsight / orientation": "Pandangan belakang / orientasi",
  "BM / TBM used (RL)": "BM / TBM digunakan (RL)", "Checked by": "Disemak oleh", "Checker team": "Pasukan pemeriksa",
  "Points": "Titik", "📄 Import Excel / CSV": "📄 Import Excel / CSV", "📋 Paste": "📋 Tampal", "📷 Scan photo": "📷 Imbas foto",
  "⬇ Blank template": "⬇ Templat kosong", "Clear points": "Kosongkan titik", "+ Add point": "+ Tambah titik",
  "Summary": "Ringkasan", "Site photos & notes": "Foto tapak & nota", "Photos are resized for reports and saved on this device. Tap a thumbnail to preview it; add a short caption for the record.": "Foto dikecilkan untuk laporan dan disimpan pada peranti ini. Ketik imej kecil untuk pratonton; tambah kapsyen ringkas sebagai rekod.",
  "📷 Take photo": "📷 Ambil foto", "🖼 Add photos": "🖼 Tambah foto", "Notes / comments": "Nota / ulasan",
  "↺ New check": "↺ Pemeriksaan baharu", "Generate report": "Jana laporan", "Checking aid only.": "Alat semakan sahaja.",
  "Check before you share:": "Semak sebelum berkongsi:", "All details look complete.": "Semua butiran nampak lengkap.",
  "Customize this PDF": "Sesuaikan PDF ini", "A user-verification disclaimer is always included and cannot be turned off.": "Penafian pengesahan pengguna sentiasa disertakan dan tidak boleh dimatikan.",
  "Report title": "Tajuk laporan", "Plots and summary statistics": "Plot dan statistik ringkasan", "Instrument and control details": "Butiran instrumen dan kawalan",
  "Site notes": "Nota tapak", "Site photos": "Foto tapak", "Sign-off boxes": "Ruang pengesahan", "📤 Share PDF": "📤 Kongsi PDF",
  "👁 Preview PDF": "👁 Pratonton PDF", "⬇ Save PDF": "⬇ Simpan PDF", "📊 Save Excel": "📊 Simpan Excel",
  "🧾 Save CSV": "🧾 Simpan CSV", "💬 Copy WhatsApp text": "💬 Salin teks WhatsApp", "Copy link": "Salin pautan",
  "Share…": "Kongsi…", "Re-check failed points": "Semak semula titik gagal", "All results": "Semua keputusan", "All teams": "Semua pasukan", "Revision": "Semakan semula", "Show ref. no. in the header": "Papar no. rujukan di pengepala", "Show date in the header": "Papar tarikh di pengepala", "Show revision in the header": "Papar semakan semula di pengepala", "Ref. no.": "No. rujukan", "Details": "Butiran", "Points": "Titik", "Review": "Semakan", "Export": "Eksport", "Complete": "Lengkap", "Needs attention": "Perlu perhatian", "Generate report": "Jana laporan", "Appearance": "Penampilan", "Color theme": "Tema warna", "Data": "Data",
  "Tolerance presets (mm)": "Pratetap toleransi (mm)", "Checking rules": "Peraturan semakan", "Gross error limit (mm)": "Had ralat besar (mm)",
  "Marginal above (% of tol)": "Amaran hampir had (% toleransi)", "Quick entry": "Kemasukan pantas", "Save setup": "Simpan tetapan",
  "Project details & logos": "Butiran projek & logo", "User guide": "Panduan pengguna", "English": "Bahasa Inggeris",
  "Bahasa Malaysia": "Bahasa Malaysia", "Language": "Bahasa", "Checking aid only: this report is generated from user-provided inputs and is not acceptance or certification. The user is responsible for independently verifying source data, point identity, units, coordinate and vertical datums, tolerances and results against approved project documents and field observations before use.": "Alat semakan sahaja: laporan ini dijana daripada input pengguna dan bukan penerimaan atau pensijilan. Pengguna bertanggungjawab mengesahkan sendiri data sumber, identiti titik, unit, datum koordinat dan aras, toleransi serta keputusan berdasarkan dokumen projek yang diluluskan dan pemerhatian di tapak sebelum digunakan.",
  "Set-out check": "Semakan set-out", "Report": "Laporan", "tol": "toleransi", "Result": "Keputusan", "Max radial": "Jejari maksimum", "RMS": "RMS",
  "Max ΔZ": "ΔZ maksimum", "By": "Oleh", "RFI": "RFI", "Points": "Titik", "Pass": "Lulus", "Fail": "Gagal",
  "FIELD CHECK SUMMARY": "RINGKASAN SEMAKAN TAPAK", "Draft check": "Draf pemeriksaan", "Site check": "Semakan tapak",
  "WhatsApp summary board": "Kad ringkasan WhatsApp", "Preview the image and edit the caption before sharing. No point coordinates are included in the board.": "Pratonton imej dan sunting kapsyen sebelum berkongsi. Koordinat titik tidak disertakan dalam kad ini.",
  "Set-out check summary board": "Kad ringkasan semakan set-out", "WhatsApp caption": "Kapsyen WhatsApp", "Share image + caption": "Kongsi imej + kapsyen",
  "Board information": "Maklumat kad", "Project and location": "Projek dan lokasi", "Overall result and counts": "Keputusan keseluruhan dan bilangan",
  "Point results table": "Jadual keputusan titik", "App QR and WPN credit": "QR aplikasi dan kredit WPN",
  "Photo layout": "Susun atur foto", "2 photos per page": "2 foto setiap halaman", "4 photos per page": "4 foto setiap halaman",
  "Prepared / checked initials": "Inisial penyedia / penyemak", "Technical summary": "Ringkasan teknikal", "Check type": "Jenis pemeriksaan",
  "Date": "Tarikh", "marginal": "hampir had", "To check": "Perlu disemak", "Pending": "Belum lengkap",
  "Tol. source": "Sumber toleransi", "Max / mean / RMS ΔZ": "Maks / purata / RMS ΔZ",
  "Export check data": "Eksport data pemeriksaan", "Import this check": "Import pemeriksaan ini",
  "Initials:": "Inisial:", "Prepared by": "Disediakan oleh", "Prepared by (initials)": "Disediakan oleh (inisial)", "Checked by (initials)": "Disemak oleh (inisial)",
  "Generated document": "Dokumen dijana", "Generated document — no signature required.": "Dokumen dijana — tandatangan tidak diperlukan.",
  "Physical signatures may be added after printing if required.": "Tandatangan fizikal boleh ditambah selepas dicetak jika perlu.",
  "Scan to open this web app": "Imbas untuk buka web app ini",
  "Scan to open the app": "Imbas untuk buka app",
  "The check is too large for one QR code - use Export check data instead.": "Pemeriksaan ini terlalu besar untuk satu kod QR - guna Eksport data pemeriksaan.",
  "Live camera needs the app online (https). Take a photo of the QR instead.": "Kamera langsung perlukan app dalam talian (https). Ambil foto kod QR itu.",
  "Camera not available: ": "Kamera tidak tersedia: ",
  "No QR code found in the photo. Try again closer and sharper.": "Tiada kod QR dijumpai dalam foto. Cuba lagi lebih dekat dan jelas.",
  "That QR code does not carry check data.": "Kod QR itu tidak membawa data pemeriksaan.",
  "Point-level technical results": "Keputusan teknikal setiap titik", "Prepared / checked": "Disediakan / disemak",
  "Horizontal tolerance": "Toleransi mendatar", "Level tolerance": "Toleransi aras", "Mean shift": "Anjakan purata",
  "Max radial / RMS": "Jejari maksimum / RMS", "Mean / RMS ΔZ": "Purata / RMS ΔZ", "Initials only": "Inisial sahaja",
  "Download PNG": "Muat turun PNG", "Copy caption": "Salin kapsyen", "Caption copied": "Kapsyen disalin",
  "Select and copy the caption": "Pilih dan salin kapsyen", "Image downloaded; caption copied": "Imej dimuat turun; kapsyen disalin",
  "Image downloaded; copy the caption to share": "Imej dimuat turun; salin kapsyen untuk berkongsi",
  "Checking aid only. Independently verify all inputs and results.": "Alat semakan sahaja. Sahkan semua input dan keputusan secara bebas.",
  "Signature:": "Tandatangan:", "Name: ": "Nama: ", "Designation: ": "Jawatan: ", "Date:": "Tarikh:",
  "Photo": "Foto", "App + summary QR": "QR aplikasi + ringkasan", "Page": "Halaman", "of": "daripada",
  "RESULT: ": "KEPUTUSAN: ", "Design": "Reka bentuk", "Measured": "Diukur", "Offset (mm)": "Sisihan (mm)",
  "Result": "Keputusan", "Remarks": "Catatan", "No": "Bil.", "Point": "Titik", "Ref. no.": "No. rujukan",
  "RFI no.": "No. RFI", "Chainage / location": "Rantai / lokasi", "Element / description": "Elemen / keterangan",
  "Check type": "Jenis pemeriksaan", "Tolerance": "Toleransi", "Tolerance source": "Sumber toleransi",
  "Instrument / S/N": "Instrumen / No. siri", "Station / backsight": "Stesen / pandangan belakang",
  "Calibration date": "Tarikh kalibrasi", "BM / TBM used": "BM / TBM digunakan", "Notes": "Nota",
  "Checking aid only: the user must independently verify inputs and results against approved documents and field observations.": "Alat semakan sahaja: pengguna mesti mengesahkan input dan keputusan secara bebas berdasarkan dokumen yang diluluskan dan pemerhatian di tapak.",
  "What changed": "Perubahan terkini", "About and responsibility": "Perihal dan tanggungjawab",
  "Step-by-step user guide": "Panduan pengguna langkah demi langkah", "Open Setup": "Buka tetapan",
  "Add some points first": "Tambah beberapa titik dahulu", "Generate report": "Jana laporan", "Preview WhatsApp board": "Pratonton kad WhatsApp",
  "Clear signature": "Padam tandatangan", "Optional drawn signatures": "Tandatangan lukisan pilihan",
  "Surveyed / prepared by": "Disurvei / disediakan oleh", "Checked by": "Disemak oleh",
  "Optional digital signatures": "Tandatangan digital pilihan", "checking notice": "notis semakan",
  "Setting-out coordinate check (horizontal / level)": "Semakan koordinat set-out (mendatar / aras)", "Contract no.": "No. kontrak",
  "Radial": "Jejari", "Radial mm": "Jejari mm", "Offset": "Sisihan", "Station / backsight": "Stesen / pandangan belakang",
  "Points needing attention": "Titik yang perlu perhatian", "more points in the PDF report": "titik lagi dalam laporan PDF",
  "Max radial": "Jejari maksimum", "Mean radial": "Purata jejari", "RMS radial": "RMS jejari",
  "Mean shift dE/dN": "Anjakan purata dE/dN", "Horizontal (mm)": "Mendatar (mm)", "Level (mm)": "Aras (mm)",
  "Pass:": "Lulus:", "Fail:": "Gagal:", "Points:": "Titik:", "Pending:": "Belum lengkap:",
  "📄 Import Excel / CSV": "📄 Import Excel / CSV", "Select days": "Pilih hari", "Remove": "Buang",
  "Plots and summary statistics": "Plot dan statistik ringkasan", "Instrument and control details": "Butiran instrumen dan kawalan",
  "Save backup (JSON)": "Simpan sandaran (JSON)", "Restore backup": "Pulihkan sandaran", "Load sample data": "Muat data sampel",
  "Clear all data": "Padam semua data", "Save": "Simpan", "Cancel": "Batal", "Close": "Tutup", "Done": "Selesai",
  "Search ref, RFI, structure, element…": "Cari rujukan, RFI, struktur, elemen…", "Export CSV": "Eksport CSV",
  "Import CSV": "Import CSV", "Show all projects": "Papar semua projek", "Current project": "Projek semasa",
  "Add project from file": "Tambah projek daripada fail", "Project details & logos": "Butiran projek & logo",
  "Element type": "Jenis elemen", "Point name": "Nama titik", "Design E (X)": "Reka bentuk E (X)",
  "Design N (Y)": "Reka bentuk N (Y)", "Measured E (X)": "Diukur E (X)", "Measured N (Y)": "Diukur N (Y)",
  "Design RL": "Reka bentuk RL", "Measured RL": "Diukur RL", "Remark": "Catatan",
  "Replace all points": "Ganti semua titik", "Add as new points": "Tambah sebagai titik baharu", "Merge by point name": "Gabung mengikut nama titik",
  "AI scan (Gemini)": "Imbas AI (Gemini)", "Test key": "Uji kunci", "Project details": "Butiran projek",
  "App sharing link (optional override)": "Pautan perkongsian aplikasi (gantian pilihan)",
  "When hosted, the app uses its current web address automatically for Share and report QR codes. Set a link here only to override it. A local-file beta has no shareable GitHub Pages address until it is deployed.": "Apabila dihoskan, aplikasi menggunakan alamat web semasa secara automatik untuk perkongsian dan kod QR laporan. Tetapkan pautan di sini hanya untuk menggantikannya. Versi beta fail tempatan tiada alamat GitHub Pages untuk dikongsi sehingga diterbitkan.",
  "When hosted, the app checks for service-worker updates while online and shows an in-app reload prompt after new files take control. Updates are not push notifications and are not checked while the app is closed/offline.": "Apabila dihoskan, aplikasi menyemak kemas kini semasa dalam talian dan memaparkan arahan muat semula apabila fail baharu digunakan. Ini bukan pemberitahuan tolak dan tidak disemak apabila aplikasi ditutup atau luar talian.",
  "Checking aid only. You are responsible for independently verifying inputs and results against approved project documents and field observations. Not for acceptance or certification.": "Alat semakan sahaja. Anda bertanggungjawab mengesahkan input dan keputusan secara bebas berdasarkan dokumen projek yang diluluskan dan pemerhatian di tapak. Bukan untuk penerimaan atau pensijilan.",
  "A tool for checking setting-out on site: compare design and measured coordinates (E, N, RL), get the offsets, PASS / FAIL against the tolerance with remarks, and share the result as a PDF.": "Alat untuk menyemak kerja set-out di tapak: bandingkan koordinat reka bentuk dan ukuran (E, N, RL), lihat sisihan, keputusan LULUS / GAGAL terhadap toleransi berserta catatan, dan kongsi hasil sebagai PDF.",
  "Developed by": "Dibangunkan oleh", "Project in use:": "Projek yang digunakan:",
  "Data stays on this device unless you choose to share or export it.": "Data kekal pada peranti ini kecuali anda memilih untuk berkongsi atau mengeksportnya.",
  "Results are based on user-provided information, not an independent survey or verification. You are responsible for checking point identity, source data, units, coordinate and vertical datums, approved tolerances and results against project documents and field observations. Do not use this app alone to approve or direct construction work.": "Keputusan berdasarkan maklumat yang diberikan pengguna, bukan ukur atau pengesahan bebas. Anda bertanggungjawab menyemak identiti titik, data sumber, unit, datum koordinat dan aras, toleransi yang diluluskan serta keputusan berdasarkan dokumen projek dan pemerhatian di tapak. Jangan gunakan aplikasi ini sahaja untuk meluluskan atau mengarahkan kerja pembinaan.",
  "Project details and logos come from the project package; the app and its credit stay the same for every project.": "Butiran projek dan logo diambil daripada pakej projek; aplikasi dan kreditnya kekal sama untuk setiap projek.",
  "Set up a check, enter points, review tolerances and create a report. Includes phone screenshots.": "Sediakan pemeriksaan, masukkan titik, semak toleransi dan hasilkan laporan. Panduan ini merangkumi tangkapan skrin telefon.",
  "Review the latest beta improvements.": "Lihat penambahbaikan beta terkini.",
  "App purpose, attribution, project and verification disclaimer.": "Tujuan aplikasi, kredit, projek dan penafian pengesahan.",
  "Version": "Versi",
  "Reading handwriting and instrument screens uses Google Gemini. Get a free API key at": "Pembacaan tulisan tangan dan skrin instrumen menggunakan Google Gemini. Dapatkan kunci API percuma di",
  "Scan this QR code to open": "Imbas kod QR ini untuk membuka",
  "in the web app.": "dalam aplikasi web.",
  "Checking aid only. Results are based on user-provided information, not an independent survey or verification. You are responsible for checking point identity, source data, units, coordinate and vertical datums, approved tolerances and results against project documents and field observations. Do not use this app alone to approve or direct construction work.": "Alat semakan sahaja. Keputusan berdasarkan maklumat yang diberikan pengguna, bukan ukur atau pengesahan bebas. Anda bertanggungjawab menyemak identiti titik, data sumber, unit, datum koordinat dan aras, toleransi yang diluluskan serta keputusan berdasarkan dokumen projek dan pemerhatian di tapak. Jangan gunakan aplikasi ini sahaja untuk meluluskan atau mengarahkan kerja pembinaan.",
  "Licence": "Lesen", "About": "Perihal", "What changed": "Perubahan terkini",
  "Step-by-step user guide": "Panduan pengguna langkah demi langkah",
  "This beta is running from a local file and has no shareable web address yet. Once you have a test or hosted URL, enter it in Setup → App sharing link; this will generate the app QR code without publishing anything.": "Versi beta ini dijalankan daripada fail tempatan dan belum mempunyai alamat web untuk dikongsi. Selepas URL ujian atau hos tersedia, masukkannya dalam Tetapan → Pautan perkongsian aplikasi untuk menjana kod QR tanpa menerbitkan aplikasi.",
  "Preview PDF": "Pratonton PDF", "Save Excel": "Simpan Excel", "Save CSV": "Simpan CSV", "Share PDF": "Kongsi PDF",
  "Copy WhatsApp text": "Salin teks WhatsApp", "Photo": "Foto", "Photos": "Foto", "Site photos & notes": "Foto tapak & nota",
  "Tolerance": "Toleransi", "Tolerance presets (mm)": "Pratetap toleransi (mm)", "Select": "Pilih",
  "PASS": "LULUS", "FAIL": "GAGAL", "CHECK": "SEMAK", "PENDING": "BELUM LENGKAP",
  "PASS (marginal)": "LULUS (hampir had)", "PASS*": "LULUS*", "Point tolerance / own remark": "Toleransi titik / catatan sendiri",
  "Add some points first": "Tambah beberapa titik dahulu", "Share app": "Kongsi aplikasi",
  "in the web app.": "dalam aplikasi web.",
  "Checking aid only: this report is generated from user-provided inputs and is not acceptance or certification. The user is responsible for independently verifying source data, point identity, units, coordinate and vertical datums, approved tolerances and results against approved project documents and field observations before use.": "Alat semakan sahaja: laporan ini dijana daripada input pengguna dan bukan penerimaan atau pensijilan. Pengguna bertanggungjawab mengesahkan sendiri data sumber, identiti titik, unit, datum koordinat dan aras, toleransi yang diluluskan serta keputusan berdasarkan dokumen projek dan pemerhatian di tapak sebelum digunakan."
  ,"No points checked yet": "Tiada titik diperiksa lagi", "checked points": "titik diperiksa", "to check": "perlu disemak", "pending": "belum lengkap",
  "Plan view target plot": "Plot sasaran pandangan pelan", "Level chart and summary statistics": "Carta aras dan statistik ringkasan",
  "Surveyed by (name) is empty": "Nama juruukur belum diisi",
  "No structure, element or location given": "Struktur, elemen atau lokasi belum diisi",
  "Horizontal tolerance must be set to a non-negative number": "Toleransi mendatar mesti ditetapkan kepada nombor sifar atau lebih",
  "Both upper and lower level tolerances must be set to non-negative numbers": "Kedua-dua toleransi aras atas dan bawah mesti ditetapkan kepada nombor sifar atau lebih",
  "One or more point-specific tolerances are invalid; review the highlighted fields": "Satu atau lebih toleransi khusus titik tidak sah; semak medan yang ditandakan",
  "point(s) without a complete design/measured pair": "titik tanpa pasangan reka bentuk/ukuran yang lengkap",
  "point(s) flagged CHECK (gross error or swapped E/N)": "titik ditandakan SEMAK (ralat besar atau E/N tertukar)",
  "Duplicate point names": "Nama titik pendua",
  "🖼 Preview WhatsApp board": "🖼 Pratonton kad WhatsApp",
  "Nothing pasted": "Tiada apa-apa ditampal",
  "Choose at least one coordinate column": "Pilih sekurang-kurangnya satu lajur koordinat",
  "No rows with values to add": "Tiada baris bernilai untuk ditambah",
  "No rows with numbers found": "Tiada baris yang mengandungi nombor ditemui",
  "Gemini API key": "Kunci API Gemini",
  "Model": "Model",
  "+ Add preset": "+ Tambah pratetap",
  "Reset to project defaults": "Kembali ke nilai lalai projek",
  "Fill leading digits from the design value (type": "Isi digit awalan daripada nilai reka bentuk (taip",
  "to get": "untuk mendapat",
  "Could not read the file: ": "Tidak dapat membaca fail: ",
  "Project details saved on this device": "Butiran projek disimpan pada peranti ini",
  "App link copied": "Pautan aplikasi disalin",
  "Could not share the app link": "Tidak dapat berkongsi pautan aplikasi",
  "Share app link and QR code": "Kongsi pautan aplikasi dan kod QR",
  "Open register": "Buka rekod",
  "Open setup": "Buka tetapan",
  "QR code to open the app": "Kod QR untuk membuka aplikasi",
  "Auto-detected from the hosted app": "Dikesan secara automatik daripada aplikasi yang dihoskan",
  "There is no server: checks stay on this device. Register last exported:": "Tiada pelayan: pemeriksaan kekal pada peranti ini. Rekod kali terakhir dieksport:",
  "never": "belum pernah",
  "H tol": "Toleransi H",
  "V tol": "Toleransi V",
  "Copied - paste it in WhatsApp": "Disalin - tampal dalam WhatsApp",
  "Copied": "Disalin",
  "Reset": "Tetapkan semula",
  "Reminder: export your register (Register → Export CSV)": "Peringatan: eksport rekod anda (Rekod → Eksport CSV)",
  "Restore this backup? The register will be merged and the current check replaced.": "Pulihkan sandaran ini? Rekod akan digabungkan dan pemeriksaan semasa akan diganti.",
  "Remove all points from this check?": "Buang semua titik daripada pemeriksaan ini?",
  "Replace the current points with sample data?": "Gantikan titik semasa dengan data sampel?",
  "Delete the current check, the register and settings on this device?": "Padam pemeriksaan semasa, rekod dan tetapan pada peranti ini?",
  "Start a new check?\nPoints, photos, notes and the ref. no. are cleared. Team, names, instrument, control and tolerance are kept.": "Mulakan pemeriksaan baharu?\nTitik, foto, nota dan no. rujukan akan dikosongkan. Pasukan, nama, instrumen, kawalan dan toleransi dikekalkan.",
  "e.g. Surveyor": "cth. Juruukur",
  "e.g. CH 70+150 RHS": "cth. CH 70+150 RHS",
  "e.g. Pier 2 pile cap - pile positions": "cth. pile cap Pier 2 - kedudukan cerucuk",
  "e.g. Approved MS No. … / JKR/SPJ": "cth. MS diluluskan No. … / JKR/SPJ",
  "e.g. Leica TS07 / Trimble R12i": "cth. Leica TS07 / Trimble R12i",
  "e.g. CP12": "cth. CP12",
  "e.g. CP11": "cth. CP11",
  "e.g. TBM 7 RL 25.432": "cth. TBM 7 RL 25.432",
  "Caption 1 — location or observation": "Kapsyen 1 — lokasi atau pemerhatian",
  "e.g. Points re-set out after first check; prism height 1.500 m": "cth. Titik di-set-out semula selepas semakan pertama; tinggi prisma 1.500 m",
  "and paste it here. The key is kept": "dan tampalkannya di sini. Kunci disimpan",
  "only on this device": "pada peranti ini sahaja",
  "; photos are sent to Google only when you scan.": "; foto dihantar kepada Google hanya apabila anda mengimbas.",
  "Slate & ember": "Batu sabak & jingga",
  "Ocean teal": "Teal laut",
  "Forest green": "Hijau hutan",
  "Plum": "Ungu plum",
  "Graphite dark": "Grafit gelap",
  "Add some points first": "Tambah beberapa titik dahulu",
  "The report QR summary is invalid": "Ringkasan QR laporan tidak sah",
  "The report QR summary is incomplete or belongs to another project": "Ringkasan QR laporan tidak lengkap atau milik projek lain",
  "Enter a valid http:// or https:// app URL": "Masukkan URL aplikasi http:// atau https:// yang sah",
  "Setup saved": "Tetapan disimpan",
  "Sample data loaded": "Data sampel dimuatkan",
  "Backup restored": "Sandaran dipulihkan",
  "Report summary": "Ringkasan laporan", "Project": "Projek", "This is a snapshot from the report QR, not live data or independent verification. Point coordinates are not included.": "Ini ialah petikan ringkasan daripada QR laporan, bukan data langsung atau pengesahan bebas. Koordinat titik tidak disertakan.",
  "Optional drawn signatures": "Tandatangan lukisan pilihan", "Signatures are stored only on this device and placed in the PDF sign-off boxes. They are not identity-verified or a substitute for formal approval.": "Tandatangan disimpan pada peranti ini sahaja dan diletakkan pada ruang pengesahan PDF. Identiti tidak disahkan dan tandatangan ini bukan pengganti kelulusan rasmi.",
  "Plan view": "Pandangan pelan", "radial": "jejari", "No points checked yet": "Tiada titik diperiksa lagi",
  "Pass": "Lulus", "Fail": "Gagal", "points checked": "titik diperiksa", "marginal": "hampir had",
  "Open app": "Buka aplikasi", "Checking aid only": "Alat semakan sahaja", "Generate report": "Jana laporan",
  "This beta is running from a local file": "Versi beta ini dijalankan daripada fail tempatan",
  "Checking template": "Templat semakan", "Coordinate System (RSO/UTM):": "Sistem koordinat (RSO/UTM):", "Date:": "Tarikh:",
  "Horizontal Tolerance (mm):": "Toleransi mendatar (mm):", "Vertical tolerance (+ mm):": "Toleransi aras (+ mm):",
  "Vertical tolerance (− mm):": "Toleransi aras (− mm):", "No.": "Bil.", "Design coordinates": "Koordinat reka bentuk",
  "Measured coordinates": "Koordinat diukur", "Remarks (app)": "Catatan (aplikasi)", "X-value:": "Nilai-X:",
  "Y-value:": "Nilai-Y:", "Easting": "Timuran", "Northing": "Utaraan", "Level (RL)": "Aras (RL)",
  "Design RL": "RL reka bentuk", "Measured RL": "RL diukur", "X offset": "Sisihan X", "Y offset": "Sisihan Y",
  "Eccentricity": "Eksentrisiti", "Level result": "Keputusan aras", "Setting-out check": "Semakan set-out",
  "Surveyed by": "Disurvei oleh", "Element": "Elemen", "Station": "Stesen", "Backsight": "Pandangan belakang",
  "BM / TBM": "BM / TBM", "Verification notice": "Notis pengesahan", "Generated by": "Dijana oleh", "Details": "Butiran",
  "Checking aid only; not acceptance or certification. Independently verify source data, point identity, units, coordinate and vertical datums, approved tolerances and results against project documents and field observations before use.": "Alat semakan sahaja; bukan penerimaan atau pensijilan. Sahkan secara bebas data sumber, identiti titik, unit, datum koordinat dan aras, toleransi yang diluluskan serta keputusan berdasarkan dokumen projek dan pemerhatian di tapak sebelum digunakan.",
  "This is a snapshot from the report QR, not live data or independent verification. Point coordinates are not included.": "Ini ialah petikan ringkasan daripada QR laporan, bukan data langsung atau pengesahan bebas. Koordinat titik tidak disertakan.",
  "App sharing link (optional override)": "Pautan perkongsian aplikasi (gantian pilihan)",
  "Appearance": "Penampilan", "Save setup": "Simpan tetapan", "Project": "Projek",
  "Signatures are stored only on this device and placed in the PDF sign-off boxes. They are not identity-verified or a substitute for formal approval.": "Tandatangan disimpan pada peranti ini sahaja dan diletakkan pada ruang pengesahan PDF. Identiti tidak disahkan dan tandatangan ini bukan pengganti kelulusan rasmi.",
  "Please check": "Sila semak", "to share": "untuk dikongsi", "Page": "Halaman", "of": "daripada",
  "Design E": "Reka bentuk E", "Design N": "Reka bentuk N", "Measured E": "E diukur", "Measured N": "N diukur",
  "dE (mm)": "dE (mm)", "dN (mm)": "dN (mm)", "Radial (mm)": "Jejari (mm)", "dZ (mm)": "dZ (mm)",
  "Tol H radial (mm)": "Toleransi H jejari (mm)", "Tol RL upper + (mm)": "Toleransi RL atas + (mm)",
  "Tol RL lower - (mm)": "Toleransi RL bawah - (mm)", "Mean radial": "Purata jejari", "Mean shift dE/dN": "Anjakan purata dE/dN",
  "RMS radial": "RMS jejari", "Horizontal (mm)": "Mendatar (mm)", "Level (mm)": "Aras (mm)",
  "Max radial": "Jejari maksimum", "Max dZ": "ΔZ maksimum", "to check": "perlu disemak", "pending": "belum lengkap",
  "Horizontal offset (plan view, mm)": "Sisihan mendatar (pandangan pelan, mm)", "+ mean shift": "+ anjakan purata",
  "Enter design and measured E/N to see the plot": "Masukkan E/N reka bentuk dan ukuran untuk melihat plot",
  "Level difference ΔZ (mm)  + high / - low": "Perbezaan aras ΔZ (mm)  + tinggi / - rendah",
  "Enter design and measured RL to see the chart": "Masukkan RL reka bentuk dan ukuran untuk melihat carta",
  "points": "titik", "pass": "lulus", "fail": "gagal", "marginal": "hampir had", "mean": "purata",
  "max radial": "jejari maksimum", "max ΔZ": "ΔZ maksimum", "RMS radial": "RMS jejari",
  "mean ΔE / ΔN (mm) - shift": "anjakan purata ΔE / ΔN (mm)", "No points yet. Import an Excel/CSV, paste, scan a photo or add points by hand.": "Belum ada titik. Import Excel/CSV, tampal, imbas foto atau tambah titik secara manual.",
  "Radial": "Jejari", "Design": "Reka bentuk", "Measured": "Diukur", "Change project": "Tukar projek",
  "Delete point": "Padam titik", "Point name / ref": "Nama titik / rujukan", "H tol (mm) - default": "Tol. H (mm) - lalai",
  "RL upper + (mm) - default": "RL atas + (mm) - lalai", "RL lower − (mm) - default": "RL bawah − (mm) - lalai",
  "Own remark (replaces the automatic remark)": "Catatan sendiri (menggantikan catatan automatik)",
  "Points": "Titik", "Register last exported": "Rekod kali terakhir dieksport", "A new version is ready.": "Versi baharu tersedia.",
  "Reload": "Muat semula", "Later": "Nanti", "No points checked yet": "Tiada titik diperiksa lagi",
  "Mean ΔZ": "Purata ΔZ", "Max radial ": "Jejari maksimum ", "Points:": "Titik:", "Pass:": "Lulus:", "Fail:": "Gagal:",
  "To check": "Perlu disemak", "Pending": "Belum lengkap", "Mean shift dE/dN": "Anjakan purata dE/dN",
  "dE = Measured E - Design E, dN = Measured N - Design N, Radial = sqrt(dE^2 + dN^2)": "dE = E diukur - E reka bentuk, dN = N diukur - N reka bentuk, Jejari = punca kuasa dua (dE^2 + dN^2)",
  "dZ = Measured RL - Design RL (+ high / - low)": "dZ = RL diukur - RL reka bentuk (+ tinggi / - rendah)",
  "Drawn signature image; identity not verified and not formal approval.": "Imej tandatangan lukisan; identiti tidak disahkan dan bukan kelulusan rasmi.",
  "No points yet. Import an Excel/CSV, paste, scan a photo or add points by hand.": "Belum ada titik. Import Excel/CSV, tampal, imbas foto atau tambah titik secara manual.",
  "No points yet": "Belum ada titik",
  "Import an Excel/CSV, paste, scan a photo or add points by hand.": "Import Excel/CSV, tampal, imbas foto atau tambah titik secara manual.",
  "Paste points": "Tampal titik", "Scan a photo": "Imbas foto", "Photo preview": "Pratonton foto",
  "Project": "Projek", "This beta is running from a local file and has no shareable web address yet. Once you have a test or hosted URL, enter it in Setup → App sharing link; this will generate the app QR code without publishing anything.": "Versi beta ini dijalankan daripada fail tempatan dan belum mempunyai alamat web untuk dikongsi. Selepas URL ujian atau hos tersedia, masukkannya dalam Tetapan → Pautan perkongsian aplikasi untuk menjana kod QR tanpa menerbitkan aplikasi.",
  "Photo preview": "Pratonton foto", "No caption": "Tiada kapsyen", "Site photo": "Foto tapak",
  "Checking aid only. You are responsible for independently verifying inputs and results against approved project documents and field observations. Not for acceptance or certification.": "Alat semakan sahaja. Anda bertanggungjawab mengesahkan input dan keputusan secara bebas berdasarkan dokumen projek yang diluluskan dan pemerhatian di tapak. Bukan untuk penerimaan atau pensijilan.",
  "Report": "Laporan", "Share image + caption": "Kongsi imej + kapsyen", "Download PNG": "Muat turun PNG",
  "Copy caption": "Salin kapsyen", "Page": "Halaman", "of": "daripada",
  "design E/N missing": "E/N reka bentuk tiada", "measured E/N missing": "E/N diukur tiada",
  "design RL missing": "RL reka bentuk tiada", "measured RL missing": "RL diukur tiada",
  "Within tolerance": "Dalam toleransi", "tolerance": "toleransi", "lower": "bawah", "raise": "naikkan",
  "Setting-out check": "Semakan set-out", "Photo": "Foto", "App + summary QR": "QR aplikasi + ringkasan",
  "Signature:": "Tandatangan:", "Name: ": "Nama: ", "Designation: ": "Jawatan: ", "Date:": "Tarikh:",
  "Result": "Keputusan", "RFI": "RFI", "By": "Oleh", "tol": "toleransi",
  "Set-out check summary board": "Kad ringkasan semakan set-out",
  "SIGN-OFF": "PENGESAHAN", "Checker designation": "Jawatan pemeriksa", "Checked by (name) is empty": "Nama pemeriksa belum diisi",
  "Send feedback on WhatsApp": "Hantar maklum balas di WhatsApp", "Opens WhatsApp with the message ready - choose the chat yourself.": "WhatsApp dibuka dengan mesej sedia - pilih sendiri perbualan yang mana.",
  "What happened / what would help:": "Apa yang berlaku / apa yang boleh membantu:", "Device": "Peranti",
};
const t = value => {
  if (S.cfg?.language !== "ms") return value;
  const text = String(value);
  if (MS[text]) return MS[text];
  let m = text.match(/^(\d+) point(s) added(?:, (\d+) merged)?$/);
  if (m) return `${m[1]} titik ditambah${m[3] ? `, ${m[3]} digabungkan` : ""}`;
  m = text.match(/^Could not read the file: (.*)$/);
  if (m) return `${MS["Could not read the file: "]}${m[1]}`;
  m = text.match(/^No rows with numbers found in (.*)$/);
  if (m) return `${MS["No rows with numbers found"]} dalam ${m[1]}`;
  m = text.match(/^Project: (.*)$/);
  if (m) return `${MS.Project}: ${m[1]}`;
  m = text.match(/^Upload (.+)\.json to packages\/ and list it in packages\/index\.json$/);
  if (m) return `Muat naik ${m[1]}.json ke packages/ dan senaraikannya dalam packages/index.json`;
  m = text.match(/^Opened (.+)$/);
  if (m) return `Dibuka ${m[1]}`;
  m = text.match(/^(\d+) entr(?:y|ies) imported$/);
  if (m) return `${m[1]} rekod diimport`;
  m = text.match(/^Remove your changes to (.+) on this device\?$/);
  if (m) return `Buang perubahan ${m[1]} pada peranti ini?`;
  m = text.match(/^Open (.+)\? The current check will be replaced \(it is in the register if you shared it\)\.$/);
  if (m) return `Buka ${m[1]}? Pemeriksaan semasa akan diganti (rekod tersedia jika anda pernah berkongsinya).`;
  m = text.match(/^Delete (.+) from the register\?$/);
  if (m) return `Padam ${m[1]} daripada rekod?`;
  m = text.match(/^Delete point (.*)\?$/);
  if (m) return `Padam titik ${m[1]}?`;
  m = text.match(/^Caption (\d+) — location or observation$/);
  if (m) return `Kapsyen ${m[1]} — lokasi atau pemerhatian`;
  m = text.match(/^Preview photo (\d+)$/);
  if (m) return `Pratonton foto ${m[1]}`;
  m = text.match(/^Site photo (\d+)$/);
  if (m) return `Foto tapak ${m[1]}`;
  m = text.match(/^(.+) already exists\. Use this file as your own version of (.+) on this device\?$/);
  if (m) return `${m[1]} sudah wujud. Gunakan fail ini sebagai versi anda bagi ${m[2]} pada peranti ini?`;
  return value;
};
function confirmLocalized(message) { return window.confirm(t(message)); }
function localizeNode(root) {
  if (S.cfg?.language !== "ms" || !root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent || /^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE|CANVAS)$/.test(parent.tagName)) continue;
    const raw = node.nodeValue, trimmed = raw.trim();
    const translated = t(trimmed);
    if (translated !== trimmed) node.nodeValue = raw.replace(trimmed, translated);
  }
  const els = root.nodeType === Node.ELEMENT_NODE ? [root, ...root.querySelectorAll("*")] : [];
  for (const el of els) for (const attr of ["placeholder", "title", "aria-label"]) {
    const raw = el.getAttribute(attr);
    if (raw) { const translated = t(raw); if (translated !== raw) el.setAttribute(attr, translated); }
  }
}
const languageObserver = new MutationObserver(records => {
  if (S.cfg?.language !== "ms") return;
  for (const record of records) for (const node of record.addedNodes) {
    if (node.nodeType === Node.ELEMENT_NODE) localizeNode(node);
    else if (node.nodeType === Node.TEXT_NODE) localizeNode(node.parentElement);
  }
});
languageObserver.observe(document.body, { childList: true, subtree: true });
function applyLanguage() {
  const lang = S.cfg?.language === "ms" ? "ms" : "en";
  document.documentElement.lang = lang;
  document.title = APP_NAME;
  localizeNode(document.body);
}
function loadCfg() { try { S.cfg = Object.assign({}, CFG_DEF, JSON.parse(localStorage.getItem("soc_cfg") || "{}")); } catch { S.cfg = { ...CFG_DEF }; } if (S.cfg.model === "gemini-3.8-flash") S.cfg.model = DEFAULT_MODEL; }
function saveCfg() { localStorage.setItem("soc_cfg", JSON.stringify(S.cfg)); }
function applyTheme() {
  const t = S.cfg.theme;
  const dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.body.dataset.theme = t === "auto" ? (dark ? "graphite" : "slate") : (["slate", "ocean", "forest", "plum", "graphite"].includes(t) ? t : "slate");
}
if (window.matchMedia) { const mq = window.matchMedia("(prefers-color-scheme: dark)"); const onScheme = () => { if (S.cfg.theme === "auto") applyTheme(); }; mq.addEventListener ? mq.addEventListener("change", onScheme) : mq.addListener(onScheme); }
function profile() { try { return JSON.parse(localStorage.getItem("soc_profile") || "{}"); } catch { return {}; } }
const presets = () => S.cfg.presets || S.setup.presets || [];
function newPoint(o = {}) { return Object.assign({ id: uid(), name: "", dE: "", dN: "", dZ: "", mE: "", mN: "", mZ: "", tolH: "", tolV: "", tolVPos: "", tolVNeg: "", remark: "" }, o); }
function newCheck(keep) {
  const pr = profile(), p0 = presets()[0] || { id: "", h: 25, v: 25 };
  const base = {
    id: uid(), ref: "", date: today(), team: pr.team || (S.setup.teams || ["CST"])[0], name: pr.name || "", desig: pr.desig || "",
    rfi: "", structure: "", chainageFrom: "", chainageTo: "", location: "", element: "", type: "H", preset: p0.id, tolH: String(p0.h), tolV: String(p0.v), tolVPos: String(p0.v), tolVNeg: String(p0.v),
    tolSource: S.setup.tolSource || "", coord: (S.setup.coordSystems || [""])[0], instModel: pr.instModel || "", instSerial: pr.instSerial || "", instCalib: pr.instCalib || "",
    ctlStn: "", ctlBs: "", bm: "", checker: "", checkerTeam: "", checkerDesig: "", notes: "", points: [], photos: [], signatures: { surveyor: "", checker: "" }
  };
  if (keep) for (const k of ["team", "name", "desig", "structure", "chainageFrom", "chainageTo", "location", "element", "type", "preset", "tolH", "tolV", "tolVPos", "tolVNeg", "tolSource", "coord", "instModel", "instSerial", "instCalib", "ctlStn", "ctlBs", "bm", "checker", "checkerTeam", "checkerDesig", "rfi"]) if (keep[k] != null) base[k] = keep[k];
  return base;
}
function restoreCheck(data) {
  const c = { ...newCheck(), ...data };
  c.signatures = { surveyor: "", checker: "", ...(data.signatures || {}) };
  if (data.tolVPos == null) c.tolVPos = data.tolV ?? c.tolVPos;
  if (data.tolVNeg == null) c.tolVNeg = data.tolV ?? c.tolVNeg;
  c.tolV ??= c.tolVPos;
  return c;
}
const draftKey = () => "draft_" + S.pkg;
const saveDraft = debounce(() => { idb.set(draftKey(), S.check).catch(e => console.warn(e)); }, 400);
async function saveRegister() { await idb.set("register", S.register); }

/* ---------------- calculations ---------------- */
const RANK = { EMPTY: 0, PASS: 1, MARG: 2, INC: 3, FAIL: 4, CHECK: 5 };
const LABEL = { PASS: "PASS", MARG: "PASS (marginal)", FAIL: "FAIL", CHECK: "CHECK", INC: "PENDING", EMPTY: "-" };
function corrText(dx, dy) {
  const a = [];
  if (Math.abs(dx) >= 0.5) a.push(`${Math.abs(dx).toFixed(0)} mm ${dx > 0 ? "W" : "E"}`);
  if (Math.abs(dy) >= 0.5) a.push(`${Math.abs(dy).toFixed(0)} mm ${dy > 0 ? "S" : "N"}`);
  return a.join(", ");
}
function calc(p, c = S.check) {
  const T = c.type, useH = T !== "V", useV = T !== "H";
  const tH = tolNum(p.tolH, tolNum(c.tolH));
  const tVPos = tolNum(p.tolVPos, tolNum(p.tolV, tolNum(c.tolVPos, tolNum(c.tolV))));
  const tVNeg = tolNum(p.tolVNeg, tolNum(p.tolV, tolNum(c.tolVNeg, tolNum(c.tolV))));
  const G = num(S.cfg.gross) || 500, MG = (num(S.cfg.marg) || 80) / 100;
  const dE = num(p.dE), dN = num(p.dN), dZ = num(p.dZ), mE = num(p.mE), mN = num(p.mN), mZ = num(p.mZ);
  const o = { useH, useV, tH, tVPos, tVNeg, h: null, v: null };
  if (useH) {
    if (dE != null && dN != null && mE != null && mN != null) {
      const dx = diffMm(mE, dE), dy = diffMm(mN, dN), rad = r1(Math.hypot(dx, dy));
      const swapped = Math.abs(mE - dN) < 2 && Math.abs(mN - dE) < 2 && Math.abs(dE - dN) > 10;
      let st = rad > G || swapped ? "CHECK" : rad <= tH ? (rad > MG * tH ? "MARG" : "PASS") : "FAIL";
      o.h = { dx, dy, rad, st, swapped };
    } else if ([dE, dN, mE, mN].some(x => x != null)) {
      o.h = { st: "INC", miss: (dE == null || dN == null) ? "design E/N missing" : "measured E/N missing" };
    }
  }
  if (useV) {
    if (dZ != null && mZ != null) {
      const dz = diffMm(mZ, dZ), a = Math.abs(dz), limit = dz >= 0 ? tVPos : tVNeg;
      o.v = { dz, limit, st: a > G ? "CHECK" : a <= limit ? (a > MG * limit ? "MARG" : "PASS") : "FAIL" };
    } else if (dZ != null || mZ != null) o.v = { st: "INC", miss: dZ == null ? "design RL missing" : "measured RL missing" };
  }
  let st = "EMPTY";
  for (const x of [o.h, o.v]) if (x && RANK[x.st] > RANK[st]) st = x.st;
  o.st = st;
  o.auto = autoRemark(o);
  o.remark = (p.remark || "").trim() || o.auto;
  return o;
}
function autoRemark(o) {
  const a = [];
  const { h, v, tH } = o;
  if (h) {
    if (h.st === "MARG") a.push(`H within tolerance (${Math.round(h.rad / tH * 100)}% of ${tH} mm)`);
    else if (h.st === "FAIL") a.push(`H exceeds tolerance by ${r1(h.rad - tH)} mm - move ${corrText(h.dx, h.dy)}`);
    else if (h.st === "CHECK") a.push(h.swapped ? "E and N appear swapped - check entry" : `Gross error (${h.rad} mm) - check point name / reading`);
    else if (h.st === "INC") a.push("H: " + h.miss);
  }
  if (v) {
    if (v.st === "MARG") a.push(`RL within ${v.dz >= 0 ? "+" : "−"} tolerance (${Math.round(Math.abs(v.dz) / v.limit * 100)}% of ${v.dz >= 0 ? "+" : "−"}${v.limit} mm)`);
    else if (v.st === "FAIL") a.push(`RL exceeds ${v.dz >= 0 ? "upper" : "lower"} tolerance by ${r1(Math.abs(v.dz) - v.limit)} mm - ${v.dz > 0 ? "lower" : "raise"} ${Math.abs(v.dz - Math.sign(v.dz) * v.limit).toFixed(0)} mm`);
    else if (v.st === "CHECK") a.push(`Gross level error (${v.dz} mm) - check BM / reading`);
    else if (v.st === "INC") a.push("RL: " + v.miss);
  }
  if (!a.length && (h || v) && o.st === "PASS") return "Within tolerance";
  return a.join("; ");
}
function localizedRemark(p, r) {
  if (S.cfg.language !== "ms" || (p.remark || "").trim()) return r.remark;
  const parts = [], h = r.h, v = r.v;
  const move = [];
  if (h && h.dx != null && Math.abs(h.dx) >= 0.5) move.push(`${Math.abs(h.dx).toFixed(0)} mm ${h.dx > 0 ? "ke barat" : "ke timur"}`);
  if (h && h.dy != null && Math.abs(h.dy) >= 0.5) move.push(`${Math.abs(h.dy).toFixed(0)} mm ${h.dy > 0 ? "ke selatan" : "ke utara"}`);
  if (h?.st === "MARG") parts.push(`H dalam toleransi (${Math.round(h.rad / r.tH * 100)}% daripada ${r.tH} mm)`);
  else if (h?.st === "FAIL") parts.push(`H melebihi toleransi sebanyak ${r1(h.rad - r.tH)} mm - alihkan ${move.join(", ")}`);
  else if (h?.st === "CHECK") parts.push(h.swapped ? "E dan N mungkin tertukar - semak kemasukan" : `Ralat besar (${h.rad} mm) - semak nama titik / bacaan`);
  else if (h?.st === "INC") parts.push(`H: ${t(h.miss)}`);
  if (v?.st === "MARG") parts.push(`RL dalam toleransi ${v.dz >= 0 ? "atas" : "bawah"} (${Math.round(Math.abs(v.dz) / v.limit * 100)}% daripada ${v.limit} mm)`);
  else if (v?.st === "FAIL") parts.push(`RL melebihi toleransi ${v.dz >= 0 ? "atas" : "bawah"} sebanyak ${r1(Math.abs(v.dz) - v.limit)} mm - ${v.dz > 0 ? "turunkan" : "naikkan"} ${Math.abs(v.dz - Math.sign(v.dz) * v.limit).toFixed(0)} mm`);
  else if (v?.st === "CHECK") parts.push(`Ralat aras besar (${v.dz} mm) - semak BM / bacaan`);
  else if (v?.st === "INC") parts.push(`RL: ${t(v.miss)}`);
  if (!parts.length && (h || v) && r.st === "PASS") return "Dalam toleransi";
  return parts.join("; ");
}
function results() { return S.check.points.map(p => ({ p, r: calc(p) })); }
function summary(rs) {
  const s = { n: rs.length, pass: 0, marg: 0, fail: 0, check: 0, inc: 0, empty: 0, H: null, V: null };
  for (const { r } of rs) { const k = { PASS: "pass", MARG: "marg", FAIL: "fail", CHECK: "check", INC: "inc", EMPTY: "empty" }[r.st]; s[k]++; }
  const hs = rs.filter(x => x.r.h && x.r.h.rad != null);
  if (hs.length) {
    const rads = hs.map(x => x.r.h.rad); const mx = Math.max(...rads); const mi = hs.find(x => x.r.h.rad === mx);
    s.H = { n: hs.length, max: mx, maxPt: mi.p.name, mean: r1(rads.reduce((a, b) => a + b, 0) / rads.length), rms: r1(Math.sqrt(rads.reduce((a, b) => a + b * b, 0) / rads.length)),
      mdx: r1(hs.reduce((a, x) => a + x.r.h.dx, 0) / hs.length), mdy: r1(hs.reduce((a, x) => a + x.r.h.dy, 0) / hs.length) };
  }
  const vs = rs.filter(x => x.r.v && x.r.v.dz != null);
  if (vs.length) {
    const dzs = vs.map(x => x.r.v.dz); const mxA = Math.max(...dzs.map(Math.abs)); const mi = vs.find(x => Math.abs(x.r.v.dz) === mxA);
    s.V = { n: vs.length, max: mi.r.v.dz, maxPt: mi.p.name, mean: r1(dzs.reduce((a, b) => a + b, 0) / dzs.length), rms: r1(Math.sqrt(dzs.reduce((a, b) => a + b * b, 0) / dzs.length)) };
  }
  s.done = s.pass + s.marg + s.fail + s.check;
  s.overall = s.check ? "CHECK" : s.fail ? "FAIL" : s.inc ? "INC" : s.done ? "PASS" : "EMPTY";
  return s;
}
function overallText(s) {
  if (!s.done && !s.inc) return "No points checked yet";
  const ok = s.pass + s.marg;
  let t = `${ok} of ${s.done} checked point${s.done === 1 ? "" : "s"} PASS`;
  if (s.fail) t += ` · ${s.fail} FAIL`;
  if (s.check) t += ` · ${s.check} to CHECK`;
  if (s.inc) t += ` · ${s.inc} pending`;
  return t;
}
function localizedOverallText(s) {
  if (S.cfg?.language !== "ms") return overallText(s);
  if (!s.done && !s.inc) return t("No points checked yet");
  const parts = [`${s.pass + s.marg} ${t("of")} ${s.done} ${t("checked points")} ${t("PASS")}`];
  if (s.fail) parts.push(`${s.fail} ${t("FAIL")}`);
  if (s.check) parts.push(`${s.check} ${t("to check")}`);
  if (s.inc) parts.push(`${s.inc} ${t("pending")}`);
  return parts.join(" · ");
}
const typeText = t => ({ H: "Horizontal (E, N)", V: "Level (RL)", HV: "Horizontal + Level" }[t]);
function tolText(c) { const a = []; if (c.type !== "V") a.push(`H ${tolNum(c.tolH, "-")} mm (${t("radial")})`); if (c.type !== "H") a.push(`RL +${tolNum(c.tolVPos, tolNum(c.tolV, "-"))} / −${tolNum(c.tolVNeg, tolNum(c.tolV, "-"))} mm`); return a.join(" · "); }

/* smart digit expansion: "88.630" + ref 739988.636 -> "739988.630" */
function smartExpand(val, ref) {
  const r = num(ref); if (r == null || Math.abs(r) < 1000) return null;
  const s = String(val).trim(); const m = s.match(/^(\d*)(\.\d*)?$/); if (!m || (!m[1] && !m[2])) return null;
  const ri = String(Math.trunc(Math.abs(r))), ip = m[1] || "";
  if (ip.length >= ri.length || ip.length > ri.length - 2) return null;
  return (r < 0 ? "-" : "") + ri.slice(0, ri.length - ip.length) + ip + (m[2] || "");
}

/* ---------------- rendering: details ---------------- */
function fillSelect(sel, items, val) { sel.innerHTML = items.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join(""); if (val != null) sel.value = val; }
function formatChainage(value) {
  const raw = String(value || "").trim().replace(/^CH\s*/i, "");
  const digits = raw.replace(/\D/g, "");
  return digits.length > 3 ? `${digits.slice(0, -3)}+${digits.slice(-3)}` : digits;
}
function formatChainageInput(input) {
  const before = input.value.slice(0, input.selectionStart ?? input.value.length);
  const digitCount = (before.match(/\d/g) || []).length;
  const formatted = formatChainage(input.value);
  input.value = formatted;
  let caret = 0, seen = 0;
  while (caret < formatted.length && seen < digitCount) {
    if (/\d/.test(formatted[caret])) seen++;
    caret++;
  }
  input.setSelectionRange(caret, caret);
  return formatted;
}
function chainageText(c) {
  const from = formatChainage(c.chainageFrom), to = formatChainage(c.chainageTo);
  if (from && to) return `CH ${from} to CH ${to}`;
  if (from || to) return `CH ${from || to}`;
  return "";
}
function locationText(c) {
  return [chainageText(c), String(c.location || "").trim()].filter(Boolean).join(" · ");
}
function customStructures() {
  const saved = lsJson(`soc_customStructures_${S.pkg}`, []);
  return Array.isArray(saved) ? saved.filter(x => typeof x === "string" && x.trim()) : [];
}
function renderDetails() {
  const c = S.check, st = S.setup;
  c.tolVPos ??= c.tolV ?? "25";
  c.tolVNeg ??= c.tolV ?? "25";
  c.tolV ??= c.tolVPos;
  $("#rfiPre").textContent = st.rfiPrefix || "";
  fillSelect($('[data-k="team"]'), (st.teams || []).map(t => [t, t]));
  fillSelect($('[data-k="checkerTeam"]'), [["", "-"], ...(st.teams || []).map(t => [t, t])]);
  const groups = {};
  (st.structures || []).forEach(structure => {
    const name = typeof structure === "string" ? structure : structure.name;
    if (!name) return;
    const group = typeof structure === "string" ? "Structures" : (structure.grp || "Structures");
    (groups[group] ||= []).push(name);
  });
  const custom = customStructures();
  $("#structureSelect").innerHTML = `<option value="">No structure</option>${Object.entries(groups).map(([group, names]) => `<optgroup label="${esc(group)}">${names.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join("")}</optgroup>`).join("")}${custom.length ? `<optgroup label="Custom structures">${custom.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join("")}</optgroup>` : ""}<option value="__custom__">Other / enter a custom structure…</option>`;
  $("#customStructureOptions").innerHTML = custom.map(name => `<option value="${esc(name)}"></option>`).join("");
  const isListed = [...(st.structures || []).map(s => typeof s === "string" ? s : s.name), ...custom].includes(c.structure);
  $("#structureSelect").value = c.structure ? (isListed ? c.structure : "__custom__") : "";
  $("#customStructureEntry").hidden = $("#structureSelect").value !== "__custom__";
  $("#structureCustom").value = $("#structureSelect").value === "__custom__" ? c.structure : "";
  $("#structureListHint").textContent = t("Saved structure choices are for this project on this device.");
  fillSelect($("#selPreset"), [...presets().map(p => [p.id, `${p.name} - H ${p.h} / V ±${p.v} mm`]), ["custom", "Custom"]]);
  fillSelect($("#selCoord"), (st.coordSystems || []).map(t => [t, t]));
  $$("[data-k]").forEach(el => { const k = el.dataset.k; if (k in c) el.value = k === "chainageFrom" || k === "chainageTo" ? formatChainage(c[k]) : c[k] ?? ""; });
  showReveal("chainageToWrap", !!c.chainageTo);
  showReveal("specificLocationWrap", !!c.location);
  $$('[data-k="tolH"],[data-k="tolVPos"],[data-k="tolVNeg"]').forEach(el => el.classList.toggle("bad", num(el.value) == null || num(el.value) < 0));
  setType(c.type, true);
}
function setType(t, silent) {
  S.check.type = t;
  document.body.className = "t-" + t;
  $$("#segType button").forEach(b => b.classList.toggle("on", b.dataset.type === t));
  $$(".hz").forEach(e => e.style.display = t === "V" ? "none" : "");
  $$(".vt").forEach(e => e.style.display = t === "H" ? "none" : "");
  if (!silent) { refreshAll(); saveDraft(); }
}

/* ---------------- rendering: points ---------------- */
function pointCard(p, i) {
  return `<div class="pt" data-id="${p.id}">
    <div class="pt-hd"><span class="no">${String(i + 1).padStart(2, "0")}</span>
      <input data-f="name" value="${esc(p.name)}" placeholder="Point name / ref">
      <span class="chip" data-chip></span><button class="x" data-del title="Delete point">✕</button></div>
    <div class="cg">
      <span></span><span class="h">E (X)</span><span class="h">N (Y)</span><span class="h rl">RL (Z)</span>
      <span class="lb">Design</span>${["dE", "dN", "dZ"].map(f => `<input data-f="${f}" class="${f === "dZ" ? "rl" : ""}" inputmode="decimal" value="${esc(p[f])}" autocomplete="off">`).join("")}
      <span class="lb">Measured</span>${["mE", "mN", "mZ"].map(f => `<input data-f="${f}" class="${f === "mZ" ? "rl" : ""}" inputmode="decimal" value="${esc(p[f])}" autocomplete="off">`).join("")}
    </div>
    <div class="res" data-res></div>
    <div class="rmk" data-rmk></div>
    <details><summary>Point tolerance / own remark</summary>
      <div class="adv">
        <input data-f="tolH" inputmode="decimal" placeholder="H tol (mm) - default" value="${esc(p.tolH)}">
        <input data-f="tolVPos" inputmode="decimal" placeholder="RL upper + (mm) - default" value="${esc(p.tolVPos)}">
        <input data-f="tolVNeg" inputmode="decimal" placeholder="RL lower − (mm) - default" value="${esc(p.tolVNeg)}">
        <input class="full" data-f="remark" placeholder="Own remark (replaces the automatic remark)" value="${esc(p.remark)}">
      </div></details>
  </div>`;
}
function renderPoints() {
  const pts = S.check.points;
  $("#plist").innerHTML = pts.length ? pts.map(pointCard).join("") : `<div class="empty"><b>${esc(t("No points yet"))}</b><span>${esc(t("Import an Excel/CSV, paste, scan a photo or add points by hand."))}</span></div>`;
  pts.forEach(p => updateCard(p));
  $("#ptCount").textContent = pts.length ? `(${pts.length})` : "";
}
function updateCard(p) {
  const el = $(`.pt[data-id="${p.id}"]`); if (!el) return;
  const r = calc(p);
  el.className = "pt s-" + r.st;
  const chip = $("[data-chip]", el); chip.className = "chip c-" + r.st; chip.textContent = t(LABEL[r.st]);
  const a = [];
  if (r.h && r.h.rad != null) a.push(`<span>ΔE <b class="v">${sgn(r.h.dx)}</b></span><span>ΔN <b class="v">${sgn(r.h.dy)}</b></span><span>Radial <b class="v">${r.h.rad.toFixed(1)}</b> mm</span>`);
  if (r.v && r.v.dz != null) a.push(`<span>ΔZ <b class="v">${sgn(r.v.dz)}</b> mm</span>`);
  $("[data-res]", el).innerHTML = a.join("");
  $("[data-rmk]", el).textContent = localizedRemark(p, r);
  $$("input[data-f]", el).forEach(inp => { const f = inp.dataset.f; if (/^[dm][ENZ]$|^tol/.test(f)) inp.classList.toggle("bad", inp.value.trim() !== "" && (num(inp.value) == null || f.startsWith("tol") && num(inp.value) < 0)); });
}
function renderSummary() {
  const rs = results(), s = summary(rs), c = S.check;
  const col = { PASS: ["--passb", "--pass"], FAIL: ["--failb", "--fail"], CHECK: ["--chkb", "--chk"], INC: ["--incb", "--inc"], EMPTY: ["--incb", "--inc"] }[s.overall];
  $("#overall").innerHTML = `<div class="overall" style="background:var(${col[0]});color:var(${col[1]})">${s.overall === "PASS" && !s.inc ? "✅ " : s.overall === "FAIL" ? "❌ " : s.overall === "CHECK" ? "⛔ " : ""}${esc(localizedOverallText(s))}</div>`;
  const k = [];
  k.push([s.n, t("points")], [s.pass + s.marg, t("pass") + (s.marg ? ` (${s.marg} ${t("marginal")})` : "")], [s.fail, t("fail")]);
  if (s.check) k.push([s.check, t("to check")]);
  if (s.H) k.push([s.H.max.toFixed(1) + " mm", `${t("max radial")} (${s.H.maxPt || "-"})`], [s.H.rms.toFixed(1) + " mm", `${t("RMS radial")} · ${t("mean")} ${s.H.mean}`], [`${sgn(s.H.mdx)} / ${sgn(s.H.mdy)}`, t("mean ΔE / ΔN (mm) - shift")]);
  if (s.V) k.push([sgn(s.V.max) + " mm", `${t("max ΔZ")} (${s.V.maxPt || "-"})`], [sgn(s.V.mean) + " mm", `${t("mean ΔZ")} · ${t("RMS")} ${s.V.rms}`]);
  $("#sumBox").innerHTML = k.map(([b, t]) => `<div class="k"><b>${esc(b)}</b><span>${esc(t)}</span></div>`).join("");
  if (c.type !== "V") drawTarget($("#cvTarget"), rs, tolNum(c.tolH));
  if (c.type !== "H") drawLevel($("#cvLevel"), rs, tolNum(c.tolVPos, tolNum(c.tolV)), tolNum(c.tolVNeg, tolNum(c.tolV)));
  $("#barInfo").innerHTML = `<b>${s.n}</b> ${t("points")} · <span style="color:var(--pass)"><b>${s.pass + s.marg}</b> ${t("pass")}</span> · <span style="color:var(--fail)"><b>${s.fail}</b> ${t("fail")}</span>${s.check ? ` · <span style="color:var(--chk)"><b>${s.check}</b> ${t("CHECK")}</span>` : ""}`;
  const bad = rs.filter(x => x.r.st === "FAIL" || x.r.st === "CHECK").length;
  $("#recheckRow").hidden = !bad; if (bad) $("#recheckTitle").textContent = `${bad} point${bad === 1 ? "" : "s"} outside tolerance`;
  renderFlow();
}

/* ---------------- step flow (Details / Points / Review / Export) ---------------- */
function flowState() {
  const c = S.check, rs = results(), s = summary(rs);
  const tolOk = (c.type === "V" || (num(c.tolH) != null && num(c.tolH) >= 0)) && (c.type === "H" || [c.tolVPos ?? c.tolV, c.tolVNeg ?? c.tolV].every(v => num(v) != null && num(v) >= 0));
  const detailsOk = !!(c.name && (c.element || c.structure || locationText(c)) && tolOk);
  const incomplete = rs.filter(x => x.r.st === "INC" || x.r.st === "EMPTY").length;
  const pointsOk = rs.length > 0 && !incomplete;
  const reviewOk = pointsOk && !s.check;
  const exported = !!(c.ref && S.register.some(x => x.ref === c.ref));
  const done = [detailsOk, pointsOk, reviewOk, exported];
  const curIdx = done.indexOf(false) < 0 ? 3 : done.indexOf(false);
  const sub = [
    detailsOk ? t("Complete") : (!c.name ? t("Name needed") : !(c.element || c.structure || locationText(c)) ? t("What was set out?") : t("Check tolerance")),
    !rs.length ? t("No points yet") : incomplete ? `${incomplete} ${t("incomplete")}` : `${rs.length} ${t("points")}`,
    !rs.length ? "-" : s.check ? `${s.check} ${t("to check")}` : s.fail ? `${s.fail} ${t("fail")} / ${s.n}` : `${s.pass + s.marg}/${s.n} ${t("pass")}`,
    exported ? t("Saved to register") : t("Generate report")
  ];
  return { done, curIdx, sub };
}
function renderFlow() {
  const el = $("#flow"); if (!el) return;
  const st = flowState(), names = [t("Details"), t("Points"), t("Review"), t("Export")];
  el.innerHTML = names.map((n, i) => `<button type="button" data-go="${i}" class="${st.done[i] ? "done" : st.curIdx === i ? "cur" : ""}" ${st.curIdx === i ? 'aria-current="step"' : ""}><i>${st.done[i] ? "✓" : i + 1}</i><b>${esc(n)}</b><span>${esc(st.sub[i])}</span></button>`).join("");
}
function goStep(i) {
  const id = ["secDetails", "secPoints", "secSummary", "secExport"][i], el = document.getElementById(id); if (!el) return;
  el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  if (i === 0) { const f = el.querySelector('[data-k="name"]'); if (f && !f.value) setTimeout(() => f.focus({ preventScroll: true }), 400); }
}
const refreshSummary = debounce(renderSummary, 120);
const refreshFlow = debounce(renderFlow, 150);
function refreshAll() { renderPoints(); renderSummary(); }

/* ---------------- plots ---------------- */
const STC = { PASS: "#2B8A3E", MARG: "#C77700", FAIL: "#C92A2A", CHECK: "#6741D9", INC: "#7A848D", EMPTY: "#7A848D" };
function drawTarget(cv, rs, tol) {
  const ctx = cv.getContext("2d"), W = cv.width, H = cv.height, k0 = W / 700;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
  const pts = rs.filter(x => x.r.h && x.r.h.rad != null);
  const cx = W / 2, cy = H / 2 + 12 * k0, R = Math.min(W, H) / 2 - 48 * k0;
  const maxRad = pts.length ? Math.max(...pts.map(x => x.r.h.rad)) : 0, plotTol = Math.max(tol, 1);
  let span = Math.max(plotTol * 1.3, maxRad * 1.12);
  const nice = [1, 2, 2.5, 5, 10, 15, 20, 25, 50, 75, 100, 150, 200, 250, 500, 1000];
  span = nice.find(v => v >= span) || span;
  const k = R / span;
  ctx.font = `bold ${18 * k0}px system-ui,sans-serif`; ctx.fillStyle = "#14212B"; ctx.textAlign = "left";
  ctx.fillText(t("Horizontal offset (plan view, mm)"), 14 * k0, 26 * k0);
  // tolerance zone
  ctx.beginPath(); ctx.arc(cx, cy, tol * k, 0, 7); ctx.fillStyle = "#EBFBEE"; ctx.fill(); ctx.lineWidth = 2.5 * k0; ctx.strokeStyle = "#2B8A3E"; ctx.stroke();
  ctx.setLineDash([6 * k0, 5 * k0]); ctx.beginPath(); ctx.arc(cx, cy, tol * k * ((num(S.cfg.marg) || 80) / 100), 0, 7); ctx.strokeStyle = "#C77700"; ctx.lineWidth = 1.5 * k0; ctx.stroke(); ctx.setLineDash([]);
  // outer ring + axes
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.strokeStyle = "#ADB5BD"; ctx.lineWidth = 1 * k0; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.strokeStyle = "#CED4DA"; ctx.stroke();
  ctx.fillStyle = "#5F6B76"; ctx.font = `bold ${15 * k0}px system-ui,sans-serif`; ctx.textAlign = "center";
  ctx.fillText("N", cx, cy - R - 6 * k0); ctx.fillText("S", cx, cy + R + 17 * k0); ctx.fillText("E", cx + R + 12 * k0, cy + 5 * k0); ctx.fillText("W", cx - R - 13 * k0, cy + 5 * k0);
  ctx.font = `${13 * k0}px system-ui,sans-serif`; ctx.textAlign = "left";
  ctx.fillStyle = "#2B8A3E"; ctx.fillText(`${t("tol")} ${tol} mm`, cx + tol * k * 0.72 + 4 * k0, cy - tol * k * 0.72 - 4 * k0);
  ctx.fillStyle = "#868E96"; ctx.fillText(`${span} mm`, cx + R * 0.72 + 4 * k0, cy - R * 0.72 - 4 * k0);
  // points
  ctx.font = `${13 * k0}px system-ui,sans-serif`;
  pts.forEach(({ p, r }, i) => {
    let x = r.h.dx * k, y = -r.h.dy * k; const d = Math.hypot(x, y); let clip = false;
    if (d > R) { x *= R / d; y *= R / d; clip = true; }
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + x, cy + y); ctx.strokeStyle = STC[r.h.st] + "55"; ctx.lineWidth = 1.2 * k0; ctx.stroke();
    ctx.beginPath(); ctx.fillStyle = STC[r.h.st];
    if (clip) { ctx.save(); ctx.translate(cx + x, cy + y); ctx.rotate(Math.atan2(y, x)); ctx.moveTo(6 * k0, 0); ctx.lineTo(-6 * k0, -6 * k0); ctx.lineTo(-6 * k0, 6 * k0); ctx.closePath(); ctx.fill(); ctx.restore(); }
    else { ctx.arc(cx + x, cy + y, 5.5 * k0, 0, 7); ctx.fill(); }
    if (pts.length <= 18) { ctx.fillStyle = "#14212B"; ctx.fillText(p.name || String(i + 1), cx + x + 7 * k0, cy + y - 6 * k0); }
  });
  if (pts.length >= 3) {
    const mx = pts.reduce((a, x) => a + x.r.h.dx, 0) / pts.length, my = pts.reduce((a, x) => a + x.r.h.dy, 0) / pts.length;
    const X = cx + mx * k, Y = cy - my * k; ctx.strokeStyle = "#14212B"; ctx.lineWidth = 2 * k0;
    ctx.beginPath(); ctx.moveTo(X - 8 * k0, Y); ctx.lineTo(X + 8 * k0, Y); ctx.moveTo(X, Y - 8 * k0); ctx.lineTo(X, Y + 8 * k0); ctx.stroke();
    ctx.fillStyle = "#14212B"; ctx.textAlign = "left"; ctx.font = `${12 * k0}px system-ui,sans-serif`; ctx.fillText(t("+ mean shift"), 14 * k0, H - 12 * k0);
  }
  if (!pts.length) { ctx.fillStyle = "#868E96"; ctx.textAlign = "center"; ctx.font = `${15 * k0}px system-ui,sans-serif`; ctx.fillText(t("Enter design and measured E/N to see the plot"), cx, cy + R + 40 * k0 > H ? H - 10 * k0 : cy + 30 * k0); }
}
function drawLevel(cv, rs, tolPos, tolNeg, fixedW) {
  const pts = rs.filter(x => x.r.v && x.r.v.dz != null);
  const W = fixedW || 700, k0 = W / 700, rowH = 24 * k0, top = 48 * k0, H = Math.max(200 * k0, top + pts.length * rowH + 40 * k0);
  if (cv.width !== W || cv.height !== Math.round(H)) { cv.width = W; cv.height = Math.round(H); }
  const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
  ctx.font = `bold ${18 * k0}px system-ui,sans-serif`; ctx.fillStyle = "#14212B"; ctx.textAlign = "left";
  ctx.fillText(t("Level difference ΔZ (mm)  + high / - low"), 14 * k0, 26 * k0);
  const L = 110 * k0, Rr = W - 60 * k0, cx = (L + Rr) / 2;
  const maxA = pts.length ? Math.max(...pts.map(x => Math.abs(x.r.v.dz))) : 0;
  const tol = Math.max(tolPos, tolNeg, 1);
  let span = Math.max(tol * 1.5, maxA * 1.12);
  const k = (Rr - L) / 2 / span, bot = top + pts.length * rowH;
  ctx.fillStyle = "#EBFBEE"; ctx.fillRect(cx - tolNeg * k, top - 6 * k0, (tolPos + tolNeg) * k, bot - top + 12 * k0);
  ctx.strokeStyle = "#2B8A3E"; ctx.lineWidth = 1.5 * k0; ctx.setLineDash([5 * k0, 4 * k0]);
  ctx.beginPath(); ctx.moveTo(cx - tolNeg * k, top - 6 * k0); ctx.lineTo(cx - tolNeg * k, bot + 6 * k0); ctx.moveTo(cx + tolPos * k, top - 6 * k0); ctx.lineTo(cx + tolPos * k, bot + 6 * k0); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = "#868E96"; ctx.lineWidth = 1 * k0; ctx.beginPath(); ctx.moveTo(cx, top - 8 * k0); ctx.lineTo(cx, bot + 8 * k0); ctx.stroke();
  ctx.font = `${12 * k0}px system-ui,sans-serif`; ctx.fillStyle = "#2B8A3E"; ctx.textAlign = "center";
  ctx.fillText(`-${tolNeg}`, cx - tolNeg * k, bot + 22 * k0); ctx.fillText(`+${tolPos}`, cx + tolPos * k, bot + 22 * k0); ctx.fillStyle = "#5F6B76"; ctx.fillText("0", cx, bot + 22 * k0);
  pts.forEach(({ p, r }, i) => {
    const y = top + i * rowH, dz = Math.max(-span, Math.min(span, r.v.dz));
    ctx.fillStyle = "#14212B"; ctx.textAlign = "right"; ctx.font = `${13 * k0}px system-ui,sans-serif`;
    ctx.fillText((p.name || String(i + 1)).slice(0, 14), L - 8 * k0, y + rowH * 0.65);
    ctx.fillStyle = STC[r.v.st]; const x0 = dz >= 0 ? cx : cx + dz * k; ctx.fillRect(x0, y + 4 * k0, Math.max(2 * k0, Math.abs(dz) * k), rowH - 8 * k0);
    ctx.textAlign = "left"; ctx.fillStyle = "#14212B"; ctx.font = `${12 * k0}px ui-monospace,monospace`;
    ctx.fillText(sgn(r.v.dz), Math.min(Rr + 4 * k0, Math.max(cx, cx + dz * k) + 4 * k0), y + rowH * 0.65);
  });
  if (!pts.length) { ctx.fillStyle = "#868E96"; ctx.textAlign = "center"; ctx.font = `${15 * k0}px system-ui,sans-serif`; ctx.fillText(t("Enter design and measured RL to see the chart"), W / 2, 110 * k0); }
}

/* ---------------- dialog ---------------- */
function openDlg(title, html) { $("#dlgTitle").textContent = t(title); $("#dlgBody").innerHTML = html; localizeNode($("#dlgBody")); const d = $("#dlg"); if (!d.open) d.showModal(); $("#dlgBody").scrollTop = 0; return $("#dlgBody"); }
function closeDlg() { $("#dlg").close(); }
$("#dlgX").onclick = closeDlg;

/* ---------------- project packages ---------------- */
/* A package = one project's setup (title, RFI prefix, teams, logos, structures, presets).
   Packages live in packages/*.json (listed in packages/index.json). A user can override
   a package on this device (Setup -> Project) or add a package from a file. */
const PKG_FALLBACK = { projectCode: "PROJ", projectTitle: "", contractNo: "", rfiPrefix: "RFI-", teams: ["CST", "WPC", "SOR"],
  presets: [{ id: "gen", name: "General", h: 25, v: 25 }], coordSystems: ["GDM2000 / RSO Borneo (BRSO)", "GDM2000 / UTM Zone 50N", "Local / site grid"], structures: [], logos: {}, teamLogos: {} };
const PKG_EDIT_KEYS = ["projectCode", "projectTitle", "contractNo", "client", "rfiPrefix", "teams", "coordSystems", "tolSource", "logos", "teamLogos", "appUrl"];
const lsJson = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } };
const pkgOverride = code => lsJson("soc_pkgov_" + code, null);
const localPkgs = () => lsJson("soc_pkgs_local", []);
async function fetchJson(u) { const r = await fetch(u, { cache: "no-cache" }); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }
async function loadPackageList() {
  let list = [];
  try { const ix = await fetchJson("packages/index.json"); list = (ix.packages || []).map(p => ({ ...p, src: "server" })); S.pkgDefault = ix.default; localStorage.setItem("soc_pkgindex", JSON.stringify(ix)); }
  catch (e) { const ix = lsJson("soc_pkgindex", null); if (ix) { list = (ix.packages || []).map(p => ({ ...p, src: "server" })); S.pkgDefault = ix.default; } }
  localPkgs().forEach(p => { if (!list.some(x => x.code === p.projectCode)) list.push({ code: p.projectCode, name: p.projectCode + " (added on this device)", src: "local" }); });
  if (!list.length) list = [{ code: "WP12", name: "WP12", file: null, src: "legacy" }];
  S.pkgs = list;
}
async function loadPackage(code) {
  const ent = S.pkgs.find(p => p.code === code) || S.pkgs.find(p => p.code === S.pkgDefault) || S.pkgs[0];
  let base = null;
  if (ent.src === "local") base = localPkgs().find(p => p.projectCode === ent.code);
  else {
    const url = ent.file ? "packages/" + ent.file : "setup.json";
    try { base = await fetchJson(url); localStorage.setItem("soc_pkgcache_" + ent.code, JSON.stringify(base)); }
    catch { base = lsJson("soc_pkgcache_" + ent.code, null); if (!base && !ent.file) base = null; }
    if (!base && ent.code === "WP12") { try { base = await fetchJson("setup.json"); } catch { } }
  }
  const ov = pkgOverride(ent.code) || {};
  S.setup = Object.assign({}, PKG_FALLBACK, base || {}, ov, { projectCode: ov.projectCode || (base && base.projectCode) || ent.code });
  S.pkg = ent.code;
  localStorage.setItem("soc_pkg", ent.code);
  await resolveLogos();
}
/* Logos can be data: URLs or paths relative to packages/ (e.g. "logos/jkr-sabah.png"). jsPDF needs data URLs. */
async function toDataUrl(v) {
  if (!v) return null; if (/^data:/.test(v)) return v;
  if (S.logo[v]) return S.logo[v];
  try { const b = await (await fetch(/^(https?:)?\//.test(v) ? v : "packages/" + v)).blob(); const d = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(b); }); return S.logo[v] = d; }
  catch { return null; }
}
async function resolveLogos() {
  const st = S.setup, L = {}; st._logo = L;
  L.L = await toDataUrl(st.logos?.L); L.R = await toDataUrl(st.logos?.R); L.team = {};
  for (const [t, o] of Object.entries(st.teamLogos || {})) L.team[t] = { L: await toDataUrl(o?.L), R: await toDataUrl(o?.R) };
}
function pkgLogos(team) { const L = S.setup._logo || {}; const t = (L.team || {})[team] || {}; return { L: t.L || L.L, R: t.R || L.R }; }
function applyPkgChrome() {
  const st = S.setup;
  $("#btnPkg").textContent = st.projectCode || S.pkg;
  document.title = `${st.projectCode || ""} ${APP_NAME}`.trim();
}
async function switchPackage(code) {
  if (code === S.pkg) return;
  await idb.set(draftKey(), S.check);
  await loadPackage(code);
  const d = await idb.get(draftKey());
  S.check = d ? { ...newCheck(), ...d } : newCheck();
  applyPkgChrome(); renderAllUI(); toast("Project: " + (S.setup.projectCode || code));
}
function openPkgPicker() {
  openDlg("Project", `
    <p class="hint">Choose the project (work package). The report header, logos, RFI prefix, structures and ref. numbers follow the project. Each project keeps its own current check and saved custom structures on this device.</p>
    <div class="list" id="pkList">${S.pkgs.map(p => `<div class="li"><div class="m"><b>${esc(p.code)}</b> ${p.code === S.pkg ? `<span class="chip c-PASS">current</span>` : ""}<br><span class="hint">${esc(p.name || "")}</span></div>
      ${p.code === S.pkg ? "" : `<button class="btn sm primary" data-pk="${esc(p.code)}">Use</button>`}</div>`).join("")}</div>
    <div class="row" style="margin-top:12px"><button class="btn" id="pkEdit">✎ Edit project details &amp; logos</button><button class="btn" id="pkAdd">+ Add project from file</button></div>
    <p class="hint">Tip: a link can open a project directly, e.g. <code>${esc(location.origin + location.pathname)}?p=WP13</code></p>`);
  $("#pkList").onclick = async e => { const c = e.target.dataset.pk; if (c) { closeDlg(); await switchPackage(c); } };
  $("#pkEdit").onclick = openPkgEditor;
  $("#pkAdd").onclick = () => { S._jsonMode = "pkg"; $("#fileJson").click(); };
}
async function addPackageFile(file) {
  const b = JSON.parse(await file.text());
  if (!/soc-(setup|package)/.test(b.kind || "") || !b.projectCode) throw new Error("Not a Setting-Out Check project file");
  const code = String(b.projectCode).toUpperCase().replace(/[^\w-]/g, "");
  if (S.pkgs.some(p => p.code === code && p.src !== "local") && !confirmLocalized(`${code} already exists. Use this file as your own version of ${code} on this device?`)) return;
  if (S.pkgs.some(p => p.code === code && p.src !== "local")) { localStorage.setItem("soc_pkgov_" + code, JSON.stringify(Object.fromEntries(PKG_EDIT_KEYS.filter(k => k in b).map(k => [k, b[k]])))); }
  else { const a = localPkgs().filter(p => p.projectCode !== code); a.push({ ...b, projectCode: code }); localStorage.setItem("soc_pkgs_local", JSON.stringify(a)); }
  await loadPackageList(); closeDlg(); await idb.set(draftKey(), S.check); S.pkg = ""; await switchPackage(code);
}
function logoField(id, label, v) {
  return `<div class="lg" data-lg="${id}"><label class="f">${esc(label)}</label><div class="lgbox">${v ? `<img src="${v}" alt="">` : `<span class="hint">none</span>`}</div>
    <div class="row" style="margin:4px 0"><button class="btn sm" data-lgup>Upload</button>${v ? `<button class="btn sm danger" data-lgclr>Remove</button>` : ""}</div></div>`;
}
function openPkgEditor() {
  const st = S.setup, L = st._logo || {}, teams = st.teams || [];
  S._edLogo = { L: L.L || null, R: L.R || null, team: Object.fromEntries(teams.map(t => [t, (L.team || {})[t]?.R || null])) };
  S._edStructures = customStructures();
  const body = openDlg(`Project details - ${S.pkg}`, `
    ${st.confirm ? `<div class="note"><b>Please confirm:</b> ${esc(st.confirm)}</div>` : ""}
    <p class="hint">Changes are kept on this device for <b>${esc(S.pkg)}</b>. To give everyone the same details, <b>Export project file</b> and upload it to the app's <code>packages/</code> folder on GitHub.</p>
    <div class="fg">
      <div><label class="f">Project code</label><input class="i" id="peCode" value="${esc(st.projectCode)}" autocapitalize="characters"></div>
      <div><label class="f">RFI prefix</label><input class="i" id="peRfi" value="${esc(st.rfiPrefix)}"></div>
      <div class="full" style="grid-column:1/-1"><label class="f">Project title (report header)</label><textarea class="i" id="peTitle" rows="2">${esc(st.projectTitle)}</textarea></div>
      <div><label class="f">Contract no.</label><input class="i" id="peCno" value="${esc(st.contractNo)}"></div>
      <div><label class="f">Teams (comma separated)</label><input class="i" id="peTeams" value="${esc(teams.join(", "))}"></div>
      <div class="w2"><label class="f">Coordinate systems (one per line)</label><textarea class="i" id="peCoord" rows="3">${esc((st.coordSystems || []).join("\n"))}</textarea></div>
    </div>
    <h4 style="margin:14px 0 6px">Custom structures for this device</h4>
    <p class="hint">Published structure categories stay unchanged. Add or remove your own reusable structure names for this project on this device.</p>
    <div class="row"><input class="i" id="peStructureName" placeholder="Custom structure name" style="flex:1;min-width:180px"><button type="button" class="btn" id="peStructureAdd">Add structure</button></div>
    <div class="list" id="peStructures"></div>
    <h4 style="margin:14px 0 6px">Logos</h4>
    <div class="lgs">${logoField("L", "Left (client)", S._edLogo.L)}${logoField("R", "Right (default)", S._edLogo.R)}${teams.map(t => logoField("t:" + t, `Right when team = ${t}`, S._edLogo.team[t])).join("")}</div>
    <input type="file" hidden id="peLogoFile" accept="image/png,image/jpeg">
    <div class="row" style="margin-top:14px"><button class="btn primary" id="peSave">Save</button><button class="btn" id="peExport">⬇ Export project file</button><button class="btn danger" id="peReset">Reset to published version</button></div>`);
  let tgt = null;
  const renderCustomStructures = () => {
    $("#peStructures").innerHTML = S._edStructures.length
      ? S._edStructures.map((name, index) => `<div class="li"><div class="m">${esc(name)}</div><button type="button" class="btn sm danger" data-structure-remove="${index}">Remove</button></div>`).join("")
      : `<p class="hint">No custom structures added for this project.</p>`;
  };
  renderCustomStructures();
  $("#peStructureAdd").onclick = () => {
    const name = $("#peStructureName").value.trim();
    if (!name) return toast(t("Enter a structure first."));
    const published = (st.structures || []).map(x => typeof x === "string" ? x : x.name);
    if (published.includes(name) || S._edStructures.includes(name)) return toast("This structure is already in the list");
    S._edStructures.push(name);
    $("#peStructureName").value = "";
    renderCustomStructures();
  };
  $("#peStructureName").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); $("#peStructureAdd").click(); } };
  $("#peStructures").onclick = e => {
    const index = Number(e.target.dataset.structureRemove);
    if (!Number.isInteger(index) || index < 0 || index >= S._edStructures.length) return;
    S._edStructures.splice(index, 1);
    renderCustomStructures();
  };
  body.querySelector(".lgs").onclick = e => { const box = e.target.closest("[data-lg]"); if (!box) return; const id = box.dataset.lg;
    if (e.target.matches("[data-lgup]")) { tgt = id; $("#peLogoFile").click(); }
    if (e.target.matches("[data-lgclr]")) { setEdLogo(id, null); } };
  const setEdLogo = (id, v) => { if (id.startsWith("t:")) S._edLogo.team[id.slice(2)] = v; else S._edLogo[id] = v;
    const box = body.querySelector(`[data-lg="${CSS.escape(id)}"]`); box.outerHTML = logoField(id, box.querySelector("label").textContent, v); };
  $("#peLogoFile").onchange = async e => { const f = e.target.files[0]; e.target.value = ""; if (!f || !tgt) return;
    try { const { canvas } = await fileToJpeg(f, 600); setEdLogo(tgt, f.type === "image/png" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.9)); } catch (er) { toast(er.message); } };
  const collect = () => {
    const tm = $("#peTeams").value.split(",").map(x => x.trim()).filter(Boolean);
    const teamLogos = {}; tm.forEach(t => { if (S._edLogo.team[t]) teamLogos[t] = { R: S._edLogo.team[t] }; });
    return { projectCode: $("#peCode").value.trim().toUpperCase() || S.pkg, projectTitle: $("#peTitle").value.trim(), contractNo: $("#peCno").value.trim(), rfiPrefix: $("#peRfi").value,
      teams: tm.length ? tm : ["CST"], coordSystems: $("#peCoord").value.split("\n").map(x => x.trim()).filter(Boolean), logos: { L: S._edLogo.L, R: S._edLogo.R }, teamLogos };
  };
  $("#peSave").onclick = async () => { const ov = collect(); try { localStorage.setItem("soc_pkgov_" + S.pkg, JSON.stringify(ov)); localStorage.setItem(`soc_customStructures_${S.pkg}`, JSON.stringify(S._edStructures)); } catch (e) { toast(`Could not save project setup: ${e.message}`, 4000); return; } await loadPackage(S.pkg); applyPkgChrome(); renderAllUI(); closeDlg(); toast("Project details saved on this device"); };
  $("#peExport").onclick = () => {
    const ov = collect(), customRows = S._edStructures.map((name, i) => ({ id: `custom-${i + 1}`, grp: "Custom structures", name }));
    const full = { ...S.setup, ...ov, structures: [...(S.setup.structures || []), ...customRows], kind: "soc-package", version: num(S.setup.version) || 1, exported: new Date().toISOString() };
    delete full._logo; delete full.confirm;
    download(new Blob([JSON.stringify(full, null, 1)], { type: "application/json" }), `${ov.projectCode}.json`);
    toast(`Upload ${ov.projectCode}.json to packages/ and list it in packages/index.json`, 5000);
  };
  $("#peReset").onclick = async () => { if (!confirmLocalized(`Remove your changes to ${S.pkg} on this device?`)) return; localStorage.removeItem("soc_pkgov_" + S.pkg); localStorage.removeItem(`soc_customStructures_${S.pkg}`); await loadPackage(S.pkg); applyPkgChrome(); renderAllUI(); closeDlg(); toast("Reset"); };
}
/* Docs are built into pages by the Jekyll theme (GUIDE.md -> GUIDE.html) on the same site as the app. */
function docUrl(file) { return String(file).replace(/\.md$/, ".html"); }
function openHelp() {
  openDlg("Help", `
    <div class="help-list">
      <a href="${docUrl("GUIDE.md")}" target="_blank" rel="noopener"><b>Step-by-step user guide</b><span>Set up a check, enter points, review tolerances and create a report. Includes phone screenshots.</span></a>
      <a href="${docUrl("CHANGELOG.md")}" target="_blank" rel="noopener"><b>What changed</b><span>Review the latest improvements.</span></a>
      <button type="button" id="helpAbout"><b>About and responsibility</b><span>App purpose, attribution, project and verification disclaimer.</span></button>
    </div>`);
  $("#helpAbout").onclick = openAbout;
}
function openAbout() {
  openDlg("About", `
    <div style="text-align:center;margin:6px 0 14px"><img src="icon-192.png" alt="" width="72" height="72" style="border-radius:16px"><h3 style="margin:8px 0 2px">${APP_NAME}</h3><div class="hint">Version ${APP_VERSION}</div></div>
    <p>A tool for checking setting-out on site: compare design and measured coordinates (E, N, RL), get the offsets, PASS / FAIL against the tolerance with remarks, and share the result as a PDF.</p>
    <p style="font-size:16px">Developed by <b>${APP_AUTHOR}</b></p>
    <p class="hint">Project in use: <b>${esc(S.setup.projectCode || S.pkg)}</b>${S.setup.projectTitle ? " - " + esc(S.setup.projectTitle) : ""}. Project details and logos come from the project package; the app and its credit stay the same for every project.</p>
    <div class="note"><b>Checking aid only.</b> Results are based on user-provided information, not an independent survey or verification. You are responsible for checking point identity, source data, units, coordinate and vertical datums, approved tolerances and results against project documents and field observations. Do not use this app alone to approve or direct construction work.</div>
    <p class="hint">Data stays on this device unless you choose to share or export it.</p>
    <div class="row"><a class="btn" href="${docUrl("GUIDE.md")}" target="_blank" rel="noopener">User guide</a><a class="btn" href="${docUrl("CHANGELOG.md")}" target="_blank" rel="noopener">What changed</a><a class="btn" href="${docUrl("LICENSE.md")}" target="_blank" rel="noopener">Licence</a></div>`);
}
function appShareUrl() {
  const raw = String(S.cfg.appUrl || S.setup.appUrl || (/^https?:$/.test(location.protocol) ? location.href : "")).trim();
  if (!raw) return "";
  try {
    const u = new URL(raw, location.href);
    if (!/^https?:$/.test(u.protocol)) return "";
    u.search = ""; u.hash = "";
    u.searchParams.set("p", S.pkg);
    return u.href;
  } catch { return ""; }
}
async function openAppShare() {
  const url = appShareUrl();
  if (!url) {
    openDlg("Share app", `<div class="note">This beta is running from a local file and has no shareable web address yet. Once you have a test or hosted URL, enter it in <b>Setup → App sharing link</b>; this will generate the app QR code without publishing anything.</div><button class="btn primary" id="qrSetup">Open Setup</button>`);
    $("#qrSetup").onclick = () => { closeDlg(); openSetup(); };
    return;
  }
  openDlg("Share app", `<p class="hint">Scan this QR code to open ${esc(S.pkg)} in the web app.</p><div class="qrbox"><canvas id="appQrCanvas" width="320" height="320" aria-label="QR code to open the app"></canvas></div><div class="row"><input class="i" id="appShareLink" readonly value="${esc(url)}"><button class="btn" id="qrCopy">Copy link</button><button class="btn" id="qrNative">Share…</button></div>`);
  try {
    await loadScript("lib/qrcode.min.js");
    const qr = qrcode(0, "M"); qr.addData(url); qr.make();
    const cv = $("#appQrCanvas"), ctx = cv.getContext("2d"), n = qr.getModuleCount(), quiet = 4, scale = Math.floor(cv.width / (n + quiet * 2)), size = scale * (n + quiet * 2), offset = Math.floor((cv.width - size) / 2);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); ctx.fillStyle = "#14212B";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(offset + (c + quiet) * scale, offset + (r + quiet) * scale, scale, scale);
  } catch (e) { $("#appQrCanvas").replaceWith(Object.assign(document.createElement("p"), { className: "err", textContent: "Could not generate the QR code: " + e.message })); }
  $("#qrCopy").onclick = async () => {
    try { await navigator.clipboard.writeText(url); toast("App link copied"); }
    catch (e) { console.warn("Clipboard API unavailable; trying the compatibility copy command", e); $("#appShareLink").select(); toast(document.execCommand("copy") ? "App link copied" : "Could not copy the link - select and copy it manually", 4000); }
  };
  $("#qrNative").onclick = async () => { if (navigator.share) { try { await navigator.share({ title: APP_NAME, url }); } catch (e) { if (e.name !== "AbortError") toast("Could not share the app link"); } } else $("#qrCopy").click(); };
}

/* ---------------- report ref ---------------- */
function initials(n) {
  const parts = String(n || "").trim().split(/\s+/).filter(Boolean);
  const titles = new Set(["br", "ts", "ir", "dr", "mr", "mrs", "ms", "prof"]);
  const names = parts.filter(part => !titles.has(part.replace(/\./g, "").toLowerCase()));
  if (names.length === 1 && /^[A-Z]{2,4}$/i.test(names[0].replace(/\./g, ""))) return names[0].replace(/[^A-Z]/gi, "").toUpperCase().slice(0, 3);
  const letters = names.map(part => part.replace(/[^A-Z]/gi, "").toUpperCase()).filter(Boolean);
  const code = letters.map(part => part[0]).join("").slice(0, 3);
  if (code.length >= 3) return code;
  const extra = letters.slice(1).map(part => part.slice(1)).join("") + (letters[0] || "").slice(1);
  return (code + extra.slice(0, 3 - code.length)).slice(0, 3) || "X";
}
function displayInitials(n) { return n ? initials(n) : "-"; }
function projectTitleLines(title) {
  const value = String(title || APP_NAME).trim();
  const colon = value.indexOf(":");
  if (colon > 0 && colon < value.length - 1) return [value.slice(0, colon).trim(), value.slice(colon + 1).trim()];
  return [value];
}
function transferCheck(includePhotos) {
  const check = { ...S.check, signatures: { surveyor: "", checker: "" }, photos: includePhotos ? S.check.photos : [] };
  return { kind: "soc-check-transfer", version: 1, project: S.setup.projectCode || S.pkg, check };
}
function ensureRef() {
  const c = S.check;
  const project = String(S.setup.projectCode || S.pkg || "WP12").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const team = String(c.team || "X").toUpperCase().replace(/[^A-Z0-9]/g, "") || "X";
  const preparedBy = initials(c.name);
  const date = String(c.date || today()).replace(/-/g, "");
  const prefix = `${project}-SOC-${team}-${preparedBy}-${date}-`;
  const existing = String(c.ref || "");
  const key = `soc_cnt_${project}_${date}`;
  const existingSequence = existing.startsWith(prefix) ? Number(existing.slice(prefix.length)) : 0;
  if (Number.isInteger(existingSequence) && existingSequence > 0) {
    localStorage.setItem(key, Math.max(+localStorage.getItem(key) || 0, existingSequence));
    return existing;
  }
  const sequence = (+localStorage.getItem(key) || 0) + 1;
  localStorage.setItem(key, sequence);
  c.ref = `${prefix}${sequence}`;
  saveDraft();
  return c.ref;
}
const rfiFull = c => c.rfi ? (S.setup.rfiPrefix || "") + c.rfi : "";

/* ---------------- register ---------------- */
function regEntry() {
  const c = S.check, s = summary(results());
  return { project: S.setup.projectCode || S.pkg, ref: c.ref, rev: (c.rev || "").trim() || "0", date: c.date, team: c.team, surveyor: c.name, checker: c.checker, rfi: rfiFull(c), structure: c.structure, location: locationText(c), element: c.element, type: c.type,
    tolH: c.type !== "V" ? c.tolH : "", tolV: c.type !== "H" ? (c.tolVPos ?? c.tolV) : "", tolVPos: c.type !== "H" ? (c.tolVPos ?? c.tolV) : "", tolVNeg: c.type !== "H" ? (c.tolVNeg ?? c.tolV) : "", points: s.n, pass: s.pass + s.marg, fail: s.fail, check: s.check, pending: s.inc,
    maxRadial: s.H ? s.H.max : "", maxDz: s.V ? s.V.max : "", result: s.overall === "PASS" ? "PASS" : s.overall === "INC" ? "PENDING" : s.overall, savedAt: new Date().toISOString(),
    data: { ...c, photos: [] } };
}
async function logRegister() {
  const e = regEntry(); const i = S.register.findIndex(x => x.ref === e.ref);
  if (i >= 0) S.register[i] = e; else S.register.unshift(e);
  await saveRegister(); renderFlow();
}
const REG_COLS = ["project", "ref", "rev", "date", "team", "surveyor", "checker", "rfi", "structure", "location", "element", "type", "tolH", "tolV", "tolVPos", "tolVNeg", "points", "pass", "fail", "check", "pending", "maxRadial", "maxDz", "result", "savedAt"];
function openRegister() {
  const R = S.register;
  const body = openDlg("Register", `
    <div class="row"><input class="i" id="regQ" placeholder="Search ref, RFI, structure, element…" style="flex:1;min-width:200px">
      <button class="btn" id="regCsv">Export CSV</button><button class="btn" id="regImp">Import CSV</button></div>
    <div class="row reg-filters">
      <select class="i" id="regRes" aria-label="Filter by result"><option value="">All results</option><option>PASS</option><option>FAIL</option><option>CHECK</option><option>PENDING</option></select>
      <select class="i" id="regTeam" aria-label="Filter by team"><option value="">All teams</option>${[...new Set(R.map(e => e.team).filter(Boolean))].sort().map(x => `<option>${esc(x)}</option>`).join("")}</select>
      <label class="hint">From <input type="date" class="i" id="regFrom"></label><label class="hint">To <input type="date" class="i" id="regTo"></label>
    </div>
    <label style="display:flex;gap:6px;align-items:center;margin:4px 0"><input type="checkbox" id="regAll"> Show all projects (otherwise ${esc(S.setup.projectCode || S.pkg)} only)</label>
    <p class="hint" id="regCount"></p>
    <div class="list" id="regList"></div>`);
  const draw = () => {
    const q = ($("#regQ").value || "").toLowerCase();
    const all = $("#regAll").checked, pc = S.setup.projectCode || S.pkg;
    const fr = $("#regRes").value, ft = $("#regTeam").value, d1 = $("#regFrom").value, d2 = $("#regTo").value;
    const a = R.filter(e => (all || (e.project || "WP12") === pc) && (!q || [e.project, e.ref, e.rfi, e.structure, e.element, e.location, e.surveyor].join(" ").toLowerCase().includes(q))
      && (!fr || e.result === fr) && (!ft || e.team === ft) && (!d1 || String(e.date) >= d1) && (!d2 || String(e.date) <= d2));
    const nPass = a.filter(e => e.result === "PASS").length, nFail = a.filter(e => e.result === "FAIL").length;
    $("#regCount").textContent = `${a.length} of ${R.length} check(s) shown · ${nPass} pass · ${nFail} fail. Export the CSV regularly and keep it with your project files.`;
    $("#regList").innerHTML = a.map(e => `<div class="li"><div class="m"><b>${esc(e.ref)}</b>${e.rev && e.rev !== "0" ? ` <span class="hint">Rev ${esc(e.rev)}</span>` : ""}${$("#regAll").checked ? ` <span class="hint">[${esc(e.project || "WP12")}]</span>` : ""} <span class="chip c-${e.result === "PENDING" ? "INC" : esc(e.result)}">${esc(e.result)}</span><br>
      <span class="hint">${esc(e.date)} · ${esc(typeText(e.type) || "")} · ${esc([e.structure, e.element, e.location].filter(Boolean).join(" · "))}${e.rfi ? " · " + esc(e.rfi) : ""} · ${e.pass}/${e.points} pass${e.fail ? `, ${e.fail} fail` : ""}</span></div>
      ${e.data ? `<button class="btn sm" data-open="${esc(e.ref)}">Open</button>` : ""}<button class="btn sm danger" data-rdel="${esc(e.ref)}">Delete</button></div>`).join("") || `<p class="hint">Nothing yet. A check is saved here when you share or save its report.</p>`;
  };
  draw();
  $("#regQ").oninput = draw; $("#regAll").onchange = draw; ["#regRes", "#regTeam", "#regFrom", "#regTo"].forEach(id => $(id).onchange = draw);
  $("#regList").onclick = async ev => {
    const o = ev.target.dataset.open, d = ev.target.dataset.rdel;
    if (o) { const e = R.find(x => x.ref === o); if (!confirmLocalized(`Open ${o}? The current check will be replaced (it is in the register if you shared it).`)) return; const ep = e.project || "WP12"; if (ep !== (S.setup.projectCode || S.pkg) && S.pkgs.some(x => x.code === ep)) await switchPackage(ep); S.check = restoreCheck({ ...e.data, photos: [] }); saveDraft(); renderAllUI(); closeDlg(); toast("Opened " + o); }
    if (d) { if (!confirmLocalized("Delete " + d + " from the register?")) return; S.register = R.filter(x => x.ref !== d); await saveRegister(); openRegister(); }
  };
  $("#regCsv").onclick = () => {
    const q = v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const all = $("#regAll").checked, pc = S.setup.projectCode || S.pkg, RR = all ? R : R.filter(e => (e.project || "WP12") === pc);
    const txt = "\ufeff" + [REG_COLS.join(","), ...RR.map(e => REG_COLS.map(k => q(e[k])).join(","))].join("\r\n");
    download(new Blob([txt], { type: "text/csv" }), `${all ? "ALL" : safeName(pc)}_SOC_register_${today()}.csv`);
    localStorage.setItem("soc_regExported", Date.now());
  };
  $("#regImp").onclick = () => { S._jsonMode = "reg"; $("#fileJson").click(); };
  void body;
}
async function importRegCsv(file) {
  const txt = (await file.text()).replace(/^\ufeff/, "");
  const rows = []; let cur = [], f = "", qd = false;
  for (let i = 0; i < txt.length; i++) { const ch = txt[i];
    if (qd) { if (ch === '"' && txt[i + 1] === '"') { f += '"'; i++; } else if (ch === '"') qd = false; else f += ch; }
    else if (ch === '"') qd = true; else if (ch === ",") { cur.push(f); f = ""; } else if (ch === "\n" || ch === "\r") { if (ch === "\r" && txt[i + 1] === "\n") i++; cur.push(f); rows.push(cur); cur = []; f = ""; } else f += ch; }
  if (f || cur.length) { cur.push(f); rows.push(cur); }
  const hd = rows.shift() || []; let n = 0;
  rows.forEach(r => { if (!r[0]) return; const e = {}; hd.forEach((h, i) => e[h] = r[i]); if (!e.ref || S.register.some(x => x.ref === e.ref)) return; S.register.push(e); n++; });
  S.register.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  await saveRegister(); toast(`${n} entr${n === 1 ? "y" : "ies"} imported`); openRegister();
}

/* ---------------- report dialog ---------------- */
function showReveal(id, on) {
  const w = document.getElementById(id); if (!w) return;
  w.hidden = !on;
  const b = document.querySelector(`[data-reveal="${id}"]`); if (b) b.hidden = !!on;
}

function openReport() {
  const c = S.check, rs = results(), s = summary(rs);
  if (!rs.length) return toast("Add some points first");
  const warn = [];
  if (!c.name) warn.push(t("Surveyed by (name) is empty"));
  if (!c.checker) warn.push(t("Checked by (name) is empty"));
  if (!c.element && !c.structure && !locationText(c)) warn.push(t("No structure, element or location given"));
  if (c.type !== "V" && (num(c.tolH) == null || num(c.tolH) < 0)) warn.push(t("Horizontal tolerance must be set to a non-negative number"));
  if (c.type !== "H" && ([c.tolVPos ?? c.tolV, c.tolVNeg ?? c.tolV].some(v => num(v) == null || num(v) < 0))) warn.push(t("Both upper and lower level tolerances must be set to non-negative numbers"));
  if (rs.some(({ p }) => [p.tolH, p.tolVPos, p.tolVNeg, p.tolV].some(v => v !== "" && v != null && (num(v) == null || num(v) < 0)))) warn.push(t("One or more point-specific tolerances are invalid; review the highlighted fields"));
  const inc = rs.filter(x => x.r.st === "INC" || x.r.st === "EMPTY"); if (inc.length) warn.push(`${inc.length} ${t("point(s) without a complete design/measured pair")}: ${inc.map(x => esc(x.p.name || "?")).slice(0, 8).join(", ")}`);
  const chk = rs.filter(x => x.r.st === "CHECK"); if (chk.length) warn.push(`${chk.length} ${t("point(s) flagged CHECK (gross error or swapped E/N)")}: ${chk.map(x => esc(x.p.name)).join(", ")}`);
  const names = rs.map(x => x.p.name.trim().toLowerCase()).filter(Boolean); const dup = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))]; if (dup.length) warn.push(`${t("Duplicate point names")}: ${dup.map(esc).join(", ")}`);
  const ro = { ...CFG_DEF.reportOptions, ...(S.cfg.reportOptions || {}) };
  const tone = s.overall === "PASS" ? "pass" : (s.overall === "FAIL" || s.overall === "CHECK" ? "fail" : "marg");
  openDlg("Report", `
    <div class="rp-sum ${tone}">
      <div class="rp-sum-top"><span class="rp-badge">${esc(s.overall)}</span><div class="rp-sum-t"><b>${esc(localizedOverallText(s))}</b><small>${esc(S.check.ref || "")}${S.check.rev ? " · Rev " + esc(S.check.rev) : ""}</small></div></div>
      <div class="rp-stats"><span><b>${s.n}</b>Points</span><span><b>${s.pass + s.marg}</b>Pass</span><span><b>${s.fail}</b>Fail</span>${s.H ? `<span><b>${s.H.max.toFixed(1)}</b>Max mm</span>` : ""}</div>
    </div>
    <div class="report-next" id="rpNextActions" hidden><div class="report-next-inner"><div><b>${t("PDF ready. You can start another check when you are done.")}</b><p class="hint">${esc(S.check.ref)}</p></div><button type="button" class="btn primary" id="rpNew">${t("Start a new check")}</button></div></div>
    ${warn.length ? `<div class="rp-warn"><b>Check before you share</b><ul>${warn.map(w => `<li>${w}</li>`).join("")}</ul></div>` : `<div class="rp-good">✓ All details look complete.</div>`}

    <section class="rp-card">
      <h4>Document</h4>
      <div class="fg">
        <div class="w2"><label class="f" for="rpTitle">Report title</label><input class="i" id="rpTitle" maxlength="80" value="${esc(S.cfg.reportTitle || CFG_DEF.reportTitle)}"></div>
        <div><label class="f" for="rpRev">Revision</label><input class="i" id="rpRev" maxlength="12" placeholder="0" value="${esc(S.check.rev || "")}"></div>
        <div><label class="f" id="rpPppL">Photos per page</label>
          <div class="seg rp-seg" role="group" aria-labelledby="rpPppL"><button type="button" data-ppp="2">2</button><button type="button" data-ppp="4">4</button></div>
          <select class="i" id="rpPhotoPerPage" hidden><option value="2" ${Number(S.cfg.photoPerPage) !== 4 ? "selected" : ""}>${t("2 photos per page")}</option><option value="4" ${Number(S.cfg.photoPerPage) === 4 ? "selected" : ""}>${t("4 photos per page")}</option></select></div>
      </div>
    </section>

    <section class="rp-card">
      <h4>Header shows</h4>
      <label class="sw"><span class="sw-t"><b>Ref. no.</b><small>Under the title band</small></span><input type="checkbox" data-rpopt="docRef" ${ro.docRef ? "checked" : ""}><i class="sw-i" aria-hidden="true"></i></label><label class="sw"><span class="sw-t"><b>Date</b><small>Check date</small></span><input type="checkbox" data-rpopt="docDate" ${ro.docDate ? "checked" : ""}><i class="sw-i" aria-hidden="true"></i></label><label class="sw"><span class="sw-t"><b>Revision</b><small>Rev. letter or number</small></span><input type="checkbox" data-rpopt="docRev" ${ro.docRev ? "checked" : ""}><i class="sw-i" aria-hidden="true"></i></label>
    </section>
    <section class="rp-card">
      <h4>Report contents</h4>
      <label class="sw"><span class="sw-t"><b>Plan view target plot</b><small>Offsets from design with tolerance circle</small></span><input type="checkbox" data-rpopt="plan" ${ro.plan ? "checked" : ""}><i class="sw-i" aria-hidden="true"></i></label><label class="sw"><span class="sw-t"><b>Level chart and statistics</b><small>ΔZ per point, mean and RMS</small></span><input type="checkbox" data-rpopt="plots" ${ro.plots ? "checked" : ""}><i class="sw-i" aria-hidden="true"></i></label><label class="sw"><span class="sw-t"><b>Instrument and control</b><small>Model, serial, station, backsight, BM</small></span><input type="checkbox" data-rpopt="instrument" ${ro.instrument ? "checked" : ""}><i class="sw-i" aria-hidden="true"></i></label><label class="sw"><span class="sw-t"><b>Site notes</b><small>Notes typed in the Export step</small></span><input type="checkbox" data-rpopt="notes" ${ro.notes ? "checked" : ""}><i class="sw-i" aria-hidden="true"></i></label><label class="sw"><span class="sw-t"><b>Site photos</b><small>Appendix with point captions</small></span><input type="checkbox" data-rpopt="photos" ${ro.photos ? "checked" : ""}><i class="sw-i" aria-hidden="true"></i></label><label class="sw"><span class="sw-t"><b>Prepared / checked initials</b><small>Sign-off boxes with QR code</small></span><input type="checkbox" data-rpopt="signoff" ${ro.signoff ? "checked" : ""}><i class="sw-i" aria-hidden="true"></i></label>
      <p class="hint">${t("Generated document — no signature required.")} ${t("Physical signatures may be added after printing if required.")} A user-verification disclaimer is always included.</p>
    </section>

    <section class="rp-card">
      <h4>More outputs</h4>
      <div class="rp-grid">
        <button class="btn" id="rpBoard">🖼 WhatsApp board</button>
        <button class="btn" id="rpXls">📊 Excel</button>
        <button class="btn" id="rpCsv">🧾 CSV</button>
        <button class="btn" id="rpWa">💬 Copy text</button>
        <button class="btn" id="rpTransfer">${t("Export check data")}</button>
        <button class="btn" id="rpFb">💬 Feedback</button>
      </div>
      <details class="rp-more"><summary>WhatsApp text</summary><textarea class="i" id="rpTxt" rows="7" style="font-size:13px" readonly></textarea></details>
    </section>
    <div id="rpStatus"></div>
    <div class="rp-bar">
      <button class="btn primary" id="rpShare">📤 Share PDF</button>
      <button class="btn" id="rpPrev">Preview</button>
      <button class="btn" id="rpSave">Save</button>
    </div>`);
  ensureRef(); $("#rpTxt").value = waText();
  const saveReportOptions = () => {
    S.cfg.reportTitle = $("#rpTitle").value.trim() || CFG_DEF.reportTitle;
    S.cfg.reportOptions = Object.fromEntries($$("[data-rpopt]").map(x => [x.dataset.rpopt, x.checked]));
    S.cfg.photoPerPage = Number($("#rpPhotoPerPage").value) === 4 ? 4 : 2;
    S.check.rev = $("#rpRev").value.trim(); saveDraft();
    saveCfg();
  };
  $("#rpRev").oninput = saveReportOptions;
  $("#rpTitle").oninput = saveReportOptions;
  $("#rpPhotoPerPage").onchange = saveReportOptions;
  const syncPpp = () => $$("[data-ppp]").forEach(b => { const on = b.dataset.ppp === $("#rpPhotoPerPage").value; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  $$("[data-ppp]").forEach(b => b.onclick = () => { $("#rpPhotoPerPage").value = b.dataset.ppp; syncPpp(); saveReportOptions(); });
  syncPpp();
  $$("[data-rpopt]").forEach(x => x.onchange = saveReportOptions);
  const busy = async (btn, fn) => { const t = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spin d"></span> Working…`; try { await fn(); await logRegister(); } catch (e) { console.error(e); $("#rpStatus").innerHTML = `<div class="err">${esc(e.message || e)}</div>`; } finally { btn.disabled = false; btn.innerHTML = t; } };
  const showNextCheck = () => { $("#rpNextActions").hidden = false; };
  $("#rpNew").onclick = startNewCheck;
  $("#rpBoard").onclick = openShareBoard;
  $("#rpFb").onclick = sendFeedback;
  $("#rpTransfer").onclick = () => { const transfer = transferCheck(true); download(new Blob([JSON.stringify(transfer)], { type: "application/json" }), safeName(`${S.check.ref || "setout-check"}_transfer.json`)); };
  const blockers = [];
  if (inc.length) blockers.push(`${inc.length} point(s) without a complete design/measured pair`);
  if (chk.length) blockers.push(`${chk.length} point(s) flagged CHECK`);
  if (c.type !== "V" && (num(c.tolH) == null || num(c.tolH) < 0)) blockers.push("the horizontal tolerance is not set");
  const guard = fn => e => { if (blockers.length && !confirmLocalized(`Before you share:\n• ${blockers.join("\n• ")}\n\nShare anyway?`)) return; return fn(e); };
  $("#rpShare").onclick = guard(e => busy(e.currentTarget, async () => { const { blob, name } = await buildPdf(); const r = await shareOrDownload(blob, name, waText()); if (r !== "cancelled") { toast(r === "shared" ? "Shared" : "PDF saved"); showNextCheck(); } }));
  $("#rpPrev").onclick = e => busy(e.currentTarget, async () => { const { blob } = await buildPdf(); const u = URL.createObjectURL(blob); const w = window.open(u, "_blank"); if (!w) download(blob, "preview.pdf"); showNextCheck(); });
  $("#rpSave").onclick = guard(e => busy(e.currentTarget, async () => { const { blob, name } = await buildPdf(); download(blob, name); toast("PDF saved"); showNextCheck(); }));
  $("#rpXls").onclick = e => busy(e.currentTarget, async () => { const { blob, name } = await buildXlsx(); await shareOrDownload(blob, name); });
  $("#rpCsv").onclick = e => busy(e.currentTarget, async () => { const { blob, name } = buildCsv(); download(blob, name); });
  $("#rpWa").onclick = async () => { try { await navigator.clipboard.writeText($("#rpTxt").value); toast("Copied - paste it in WhatsApp"); } catch { $("#rpTxt").select(); document.execCommand("copy"); toast("Copied"); } await logRegister(); };
}

/* ---------------- setup dialog ---------------- */
function openSetup() {
  const cfg = S.cfg, pr = presets();
  const exp = +localStorage.getItem("soc_regExported") || 0;
  openDlg("Setup", `
    <h4 style="margin:4px 0 8px">AI scan (Gemini)</h4>
    <p class="hint">Reading handwriting and instrument screens uses Google Gemini. Get a free API key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> and paste it here. The key is kept <b>only on this device</b>; photos are sent to Google only when you scan.</p>
    <div class="fg"><div class="w2"><label class="f">Gemini API key</label><input class="i" id="suKey" type="password" value="${esc(cfg.apiKey)}" placeholder="AIza…" autocomplete="off"></div>
      <div><label class="f">Model</label><input class="i" id="suModel" value="${esc(cfg.model || DEFAULT_MODEL)}"></div>
      <div style="display:flex;align-items:flex-end;gap:6px"><button class="btn" id="suTest">Test key</button></div></div>
    <div id="suTestRes"></div>

    <h4 style="margin:18px 0 8px">Tolerance presets (mm)</h4>
    <p class="hint">${esc(S.setup.tolSource || "")}</p>
    <table class="pre" id="suPre"><thead><tr><th style="text-align:left">Element type</th><th>H tol</th><th>V tol</th><th><span class="sr-only">Remove</span></th></tr></thead><tbody>
      ${pr.map(p => `<tr><td><input data-pn value="${esc(p.name)}"></td><td style="width:80px"><input data-ph inputmode="decimal" value="${p.h}"></td><td style="width:80px"><input data-pv inputmode="decimal" value="${p.v}"></td><td style="width:40px"><button class="btn sm danger" data-prm>✕</button></td></tr>`).join("")}
    </tbody></table>
    <div class="row"><button class="btn sm" id="suPreAdd">+ Add preset</button><button class="btn sm" id="suPreReset">Reset to project defaults</button></div>

    <h4 style="margin:18px 0 8px">Checking rules</h4>
    <div class="fg">
      <div><label class="f">Gross error limit (mm)</label><input class="i" id="suGross" inputmode="decimal" value="${esc(cfg.gross)}"></div>
      <div><label class="f">Marginal above (% of tol)</label><input class="i" id="suMarg" inputmode="decimal" value="${esc(cfg.marg)}"></div>
      <div class="w2"><label class="f">Quick entry</label><label style="display:flex;gap:8px;align-items:flex-start;min-width:0"><input type="checkbox" id="suSmart" style="flex:none" ${cfg.smart ? "checked" : ""}><span style="min-width:0">Fill leading digits from the design value (type <code>88.630</code> to get <code>739988.630</code>)</span></label></div>
    </div>

    <h4 style="margin:18px 0 8px">Appearance</h4>
    <div class="fg">
      <div><label class="f" for="suLanguage">Language</label><select class="i" id="suLanguage">
        <option value="en" ${cfg.language !== "ms" ? "selected" : ""}>English</option>
        <option value="ms" ${cfg.language === "ms" ? "selected" : ""}>Bahasa Malaysia</option>
      </select></div>
      <div><label class="f" for="suTheme">Color theme</label><select class="i" id="suTheme">
        <option value="auto" ${cfg.theme === "auto" ? "selected" : ""}>Auto (follow system)</option>
        <option value="slate" ${cfg.theme === "slate" ? "selected" : ""}>Slate &amp; ember</option>
        <option value="ocean" ${cfg.theme === "ocean" ? "selected" : ""}>Ocean teal</option>
        <option value="forest" ${cfg.theme === "forest" ? "selected" : ""}>Forest green</option>
        <option value="plum" ${cfg.theme === "plum" ? "selected" : ""}>Plum</option>
        <option value="graphite" ${cfg.theme === "graphite" ? "selected" : ""}>Graphite dark</option>
      </select></div>
      <div class="w2"><label class="f" for="suAppUrl">App sharing link (optional override)</label><input class="i" id="suAppUrl" type="url" value="${esc(cfg.appUrl || S.setup.appUrl || "")}" placeholder="Auto-detected from the hosted app"><span class="hint">When hosted, the app uses its current web address automatically for Share and report QR codes. Set a link here only to override it. A local file opened directly in the browser has no shareable web address.</span></div>
    </div>

    <h4 style="margin:18px 0 8px">Data</h4>
    <p class="hint">${t("There is no server: checks stay on this device. Register last exported:")} ${exp ? new Date(exp).toLocaleDateString("en-GB") : t("never")}.</p>
    <div class="row"><button class="btn" id="suBackup">Save backup (JSON)</button><button class="btn" id="suRestore">Restore backup</button><button class="btn" id="suSample">Load sample data</button><button class="btn danger" id="suWipe">Clear all data</button></div>

    <div class="row" style="margin-top:16px"><button class="btn primary" id="suSave">Save setup</button><button class="btn" id="suProj">Project details &amp; logos</button><a class="btn" href="${docUrl("GUIDE.md")}" target="_blank" rel="noopener">User guide</a></div>
    <p class="ver">${APP_NAME} v${APP_VERSION} · project ${esc(S.setup.projectCode || S.pkg)} (package v${esc(S.setup.version || "-")}) · developed by ${APP_AUTHOR}</p>`);
  const readPre = () => $$("#suPre tbody tr").map((tr, i) => ({ id: pr[i]?.id || "p" + uid(), name: $("[data-pn]", tr).value.trim(), h: num($("[data-ph]", tr).value) ?? 25, v: num($("[data-pv]", tr).value) ?? 25 })).filter(p => p.name);
  $("#suPre").onclick = e => { if (e.target.matches("[data-prm]")) e.target.closest("tr").remove(); };
  $("#suPreAdd").onclick = () => { $("#suPre tbody").insertAdjacentHTML("beforeend", `<tr><td><input data-pn placeholder="Element type"></td><td><input data-ph value="20"></td><td><input data-pv value="10"></td><td><button class="btn sm danger" data-prm>✕</button></td></tr>`); };
  $("#suPreReset").onclick = () => { S.cfg.presets = null; saveCfg(); openSetup(); renderDetails(); };
  $("#suTest").onclick = async () => {
    const out = $("#suTestRes"); out.innerHTML = `<div class="note"><span class="spin d"></span> Testing…</div>`;
    try {
      const j = await geminiPost({ model: $("#suModel").value.trim() || DEFAULT_MODEL, input: "Reply with the single word OK.", store: false }, $("#suKey").value.trim());
      out.innerHTML = `<div class="ok">Key works ✔ (${esc(extractText(j).trim().slice(0, 40))})</div>`;
    } catch (e) { out.innerHTML = `<div class="err">${esc(e.message)}</div>`; }
  };
  $("#suSave").onclick = () => {
    const appUrl = $("#suAppUrl").value.trim();
    if (appUrl) {
      try { if (!/^https?:$/.test(new URL(appUrl).protocol)) throw new Error(); }
      catch { toast("Enter a valid http:// or https:// app URL", 4000); return; }
    }
    const languageChanged = S.cfg.language !== $("#suLanguage").value;
    S.cfg.apiKey = $("#suKey").value.trim(); S.cfg.model = $("#suModel").value.trim() || DEFAULT_MODEL;
    S.cfg.gross = num($("#suGross").value) || 500; S.cfg.marg = num($("#suMarg").value) || 80; S.cfg.smart = $("#suSmart").checked;
    S.cfg.theme = $("#suTheme").value; S.cfg.appUrl = appUrl; S.cfg.language = $("#suLanguage").value; applyTheme();
    const np = readPre(); if (JSON.stringify(np) !== JSON.stringify(S.setup.presets)) S.cfg.presets = np;
    saveCfg(); if (languageChanged) { location.reload(); return; } renderDetails(); refreshAll(); closeDlg(); toast("Setup saved");
  };
  $("#suBackup").onclick = () => { const b = { kind: "soc-backup", project: S.pkg, version: APP_VERSION, saved: new Date().toISOString(), cfg: { ...S.cfg, apiKey: "" }, profile: profile(), register: S.register, draft: S.check }; download(new Blob([JSON.stringify(b)], { type: "application/json" }), `SOC_backup_${safeName(S.pkg)}_${today()}.json`); localStorage.setItem("soc_regExported", Date.now()); };
  $("#suProj").onclick = openPkgEditor;
  $("#suRestore").onclick = () => { S._jsonMode = "backup"; $("#fileJson").click(); };
  $("#suSample").onclick = () => { if (S.check.points.length && !confirmLocalized("Replace the current points with sample data?")) return; loadSample(); closeDlg(); };
  $("#suWipe").onclick = async () => { if (!confirmLocalized("Delete the current check, the register and settings on this device?")) return; localStorage.clear(); for (const p of S.pkgs) await idb.set("draft_" + p.code, null); await idb.set("draft", null); await idb.set("register", []); location.href = location.pathname; };
}
function loadSample() {
  const des = [[739988.636, 769670.644], [739990.365, 769671.644], [739992.096, 769672.645], [739993.827, 769673.646], [739995.559, 769674.648], [739997.29, 769675.649], [739999.021, 769676.65], [740000.753, 769677.652], [740002.484, 769678.653], [740004.215, 769679.655], [740005.946, 769680.656], [740007.678, 769681.657], [740009.409, 769682.659]];
  const off = [[-6, -3], [-4, -2], [-3, -2], [-3, -1], [-4, -2], [5, 8], [2, -4], [-9, 6], [12, 9], [3, 3], [-2, 7], [21, -6], [1, -1]];
  const dz = [3, -2, 5, 1, -4, 8, -1, 0, 12, -3, 2, -6, 4];
  S.check.points = des.map(([e, n], i) => newPoint({ name: String(i + 1), dE: e.toFixed(3), dN: n.toFixed(3), mE: (e + off[i][0] / 1000).toFixed(3), mN: (n + off[i][1] / 1000).toFixed(3), dZ: (25.4 + i * 0.05).toFixed(3), mZ: (25.4 + i * 0.05 + dz[i] / 1000).toFixed(3) }));
  if (!S.check.element) S.check.element = "Sample - kerb line setting-out";
  renderAllUI(); saveDraft(); toast("Sample data loaded");
}


function maybeWelcome() {
  try { if (localStorage.getItem("soc_welcomed") || S.check.points.length || $("#dlg").open) return; } catch { return; }
  openDlg("Welcome", `
    <p style="margin-top:0">Check set-out points on site in four steps. Everything stays on this phone.</p>
    <ol class="welcome-steps">
      <li><b>Details</b><span>Who, what was set out, and the tolerance.</span></li>
      <li><b>Points</b><span>Import Excel / CSV, paste, scan a photo or type.</span></li>
      <li><b>Review</b><span>Offsets, PASS / FAIL, remarks and plots.</span></li>
      <li><b>Export</b><span>Add photos, then share a PDF report.</span></li>
    </ol>
    <p class="hint">Tip: tap <b>Setup</b> to add your own AI key for scanning handwriting, and add the app to your Home Screen for offline use.</p>
    <div class="row"><button class="btn primary" id="welGo">Start</button><button class="btn" id="welSample">Try with sample data</button></div>`);
  $("#dlg").addEventListener("close", () => { try { localStorage.setItem("soc_welcomed", "1"); } catch { } }, { once: true });
  $("#welGo").onclick = () => { try { localStorage.setItem("soc_welcomed", "1"); } catch { } closeDlg(); };
  $("#welSample").onclick = () => { try { localStorage.setItem("soc_welcomed", "1"); } catch { } closeDlg(); loadSample(); };
}


/* ---------------- accessibility: give every control an accessible name ---------------- */
const FLABEL = { name: "Point name", dE: "Design E", dN: "Design N", dZ: "Design RL", mE: "Measured E", mN: "Measured N", mZ: "Measured RL", tolH: "Point horizontal tolerance", tolV: "Point level tolerance", tolVPos: "Point level tolerance upper", tolVNeg: "Point level tolerance lower", remark: "Own remark" };
function labelControls(root = document) {
  root.querySelectorAll("input,select,textarea").forEach(el => {
    if (el.type === "hidden" || el.type === "file" || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.closest("label")) return;
    if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return;
    let txt = "";
    const f = el.dataset.f;
    if (f && FLABEL[f]) { const nm = el.closest(".pt")?.querySelector('[data-f="name"]')?.value; txt = FLABEL[f] + (f !== "name" && nm ? " " + nm : ""); }
    if (!txt && el.hasAttribute("data-cap")) txt = "Photo caption";
    if (!txt && el.closest("table.pre")) { const tr = el.closest("tr"), nm = tr?.querySelector("td:first-child input")?.value || ""; txt = el.hasAttribute("data-ph") ? "Horizontal tolerance mm " + nm : el.hasAttribute("data-pv") ? "Level tolerance mm " + nm : el === tr?.querySelector("td:first-child input") ? "Element type name" : ""; }
    if (!txt) { let n = el; for (let i = 0; i < 4 && n && !txt; i++) { n = n.parentElement; const l = n && n.querySelector(":scope > label"); if (l && !l.querySelector("input,select,textarea")) txt = l.textContent.trim(); } }
    if (!txt) txt = el.getAttribute("placeholder") || el.getAttribute("title") || (el.id === "rpTxt" ? "WhatsApp summary text" : "");
    if (txt) el.setAttribute("aria-label", txt);
  });
}
{ let tmr = 0; new MutationObserver(() => { clearTimeout(tmr); tmr = setTimeout(() => labelControls(), 60); }).observe(document.body, { childList: true, subtree: true }); }

/* ---------------- boot ---------------- */
async function boot() {
  loadCfg();
  applyLanguage();
  applyTheme();
  await loadPackageList();
  const qp = new URLSearchParams(location.search).get("p");
  const want = (qp || localStorage.getItem("soc_pkg") || S.pkgDefault || "WP12").toUpperCase();
  await loadPackage(S.pkgs.some(p => p.code === want) ? want : (S.pkgDefault || S.pkgs[0].code));
  if (qp && qp.toUpperCase() !== S.pkg) setTimeout(() => toast(`Project "${qp}" not found - using ${S.pkg}`, 4000), 800);
  await idb.open();
  S.register = (await idb.get("register")) || [];
  let d = await idb.get(draftKey());
  if (!d && S.pkg === "WP12") { d = await idb.get("draft"); if (d) { await idb.set(draftKey(), d); await idb.set("draft", null); } } // v1.0 draft
  S.check = d ? restoreCheck(d) : newCheck();
  applyPkgChrome(); renderAllUI();
  if (new URLSearchParams(location.search).has("soc")) setTimeout(showQrSummary, 250);
  $("#verLine").textContent = `v${APP_VERSION} · data stays on this device`;
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => { });
  const exp = +localStorage.getItem("soc_regExported") || 0;
  if (S.register.length && Date.now() - exp > 7 * 864e5) setTimeout(() => toast("Reminder: export your register (Register → Export CSV)", 4500), 1500);
  setupUpdateChecks();
  setTimeout(maybeWelcome, 600);
}
/* app.js loads first, then scanner.js and report.js; start once all are loaded. */
window.addEventListener("load", boot);
