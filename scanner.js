/* Set-Out Check - import, scan and photos (Excel/CSV, paste, Gemini, OCR)
   Classic script: shares one global scope with the other files. Load order: app.js, scanner.js, report.js. */
"use strict";
/* ---------------- import: grid / column mapping ---------------- */
const FIELDS = [["", "- ignore -"], ["name", "Point name"], ["no", "No."], ["dE", "Design E (X)"], ["dN", "Design N (Y)"], ["dZ", "Design RL"], ["mE", "Measured E (X)"], ["mN", "Measured N (Y)"], ["mZ", "Measured RL"], ["tolH", "Tol H (mm)"], ["tolV", "Tol V (mm)"], ["remark", "Remark"]];
const NUMF = new Set(["dE", "dN", "dZ", "mE", "mN", "mZ", "tolH", "tolV"]);
const isNumStr = v => num(v) != null;
const HDR_RX = /east|north|x-?val|y-?val|design|measur|actual|\bpoint\b|\bpt\b|\brl\b|level|elev|coord|^x$|^y$|^z$|^e$|^n$|^h$/i;
function gridFromAoa(aoa, target = "d") {
  let rows = aoa.map(r => (r || []).map(v => v == null ? "" : String(v).trim()));
  const ncol = Math.max(0, ...rows.map(r => r.length));
  rows.forEach(r => { while (r.length < ncol) r.push(""); });
  // OCR marks hard-to-read numbers with a trailing "?": keep the flag, strip the mark
  const fl = new Map(); rows = rows.map(r => { const f = r.map(v => /\d\?$/.test(v)); const nr = r.map(v => /\d\?$/.test(v) ? v.slice(0, -1) : v); fl.set(nr, f); return nr; });
  let hr = -1, best = 1;
  for (let i = 0; i < Math.min(25, rows.length); i++) {
    const sc = rows[i].filter(v => v && !isNumStr(v) && HDR_RX.test(v)).length;
    if (sc > best) { best = sc; hr = i; }
  }
  let header = Array(ncol).fill(""), data = rows;
  if (hr >= 0) {
    const grp = Array(ncol).fill("");
    if (hr > 0 && rows[hr - 1].filter(v => v && !isNumStr(v)).length >= 2) { let carry = ""; for (let c = 0; c < ncol; c++) { const v = rows[hr - 1][c]; if (v && !isNumStr(v)) carry = v; else if (v) carry = ""; grp[c] = carry; } }
    header = rows[hr].map((v, c) => (grp[c] && grp[c] !== v ? grp[c] + " " : "") + v);
    data = rows.slice(hr + 1);
  }
  data = data.filter(r => r.some(v => isNumStr(v)));
  const map = guessMap(header, data, target, hr >= 0);
  return { header, rows: data, map, assumed: hr < 0, flags: data.map(r => fl.get(r) || r.map(() => false)), inc: data.map(() => true) };
}
function guessMap(header, data, target, hasHdr) {
  const n = header.length, map = Array(n).fill("");
  const hasData = c => data.some(r => r[c] !== "");
  const numRatio = c => { const v = data.map(r => r[c]).filter(x => x !== ""); return v.length ? v.filter(isNumStr).length / v.length : 0; };
  const other = target === "m" ? "d" : "m";
  if (hasHdr) {
    const und = [];
    for (let c = 0; c < n; c++) {
      if (!hasData(c)) continue;
      const s = header[c].toLowerCase();
      if (/offset|ecc|remark|result|diff|delta|δ|pass|fail|\bd[enz]\b|\bd[xyh]\b|cut|fill/.test(s)) continue;
      const des = /design|setting|set-?out|theor|plan|stake|propos|dsgn/.test(s), mea = /measur|actual|observ|as.?built|site|surveyed|field|reading|record|meas/.test(s);
      let ax = /\brl\b|level|elev|height|\bz\b|\bh\b|z-?val/.test(s) ? "Z" : /east|x-?val|\bx\b|\be\b/.test(s) ? "E" : /north|y-?val|\by\b|\bn\b/.test(s) ? "N" : "";
      if (ax) { if (des) map[c] = "d" + ax; else if (mea) map[c] = "m" + ax; else und.push([c, ax]); continue; }
      if (/^\s*(no\.?|#|bil\.?|s\/?n|item)\s*$/.test(s)) { map[c] = "no"; continue; }
      if (/point|\bpt\b|name|\bid\b|stn|station|peg|label|code|desc|ref|pile|stake|marker|bolt|hole|node|position|\bloc/.test(s)) { map[c] = "name"; continue; }
      if (/tol/.test(s)) { map[c] = /v|level|rl/.test(s) ? "tolV" : "tolH"; continue; }
    }
    const seen = {};
    und.forEach(([c, ax]) => { seen[ax] = (seen[ax] || 0) + 1; map[c] = (seen[ax] === 1 ? target : other) + ax; });
    if (!map.includes("name")) { const c = [...Array(n).keys()].find(c => hasData(c) && !map[c] && numRatio(c) < 0.5); if (c != null) map[c] = "name"; }
  } else {
    let cols = [...Array(n).keys()].filter(hasData);
    const nameC = cols.find(c => numRatio(c) < 0.5); if (nameC != null) { map[nameC] = "name"; }
    let numC = cols.filter(c => c !== nameC && numRatio(c) >= 0.5);
    if (numC.length > 2) { const c = numC[0]; const v = data.map(r => num(r[c])).filter(x => x != null); if (v.length && v.every(x => Number.isInteger(x) && x < 10000) && data.some(r => Math.abs(num(r[numC[1]]) || 0) > 1000)) { map[c] = nameC == null ? "name" : "no"; numC = numC.slice(1); } }
    const t = target, o = other, L = numC.length;
    /* Grid coordinates (5+ digits) and levels (small numbers) are told apart by size, so a level column can never be read as a coordinate. */
    const med = c => { const v = data.map(r => Math.abs(num(r[c]))).filter(x => x != null && !isNaN(x)).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 0; };
    const bigC = numC.filter(c => med(c) >= 10000), smallC = numC.filter(c => med(c) < 10000);
    if (bigC.length >= 2 && smallC.length >= 1 && bigC.length + smallC.length === L && !data.some(r => false)) {
      const bp = bigC.length === 2 ? [t + "E", t + "N"] : bigC.length === 4 ? ["dE", "dN", "mE", "mN"] : bigC.length === 3 ? [t + "E", t + "N", ""] : ["dE", "dN", "mE", "mN"];
      const sp = bigC.length >= 4 && smallC.length >= 2 ? ["dZ", "mZ"] : [t + "Z"];
      bigC.forEach((c, i) => { if (bp[i]) map[c] = bp[i]; }); smallC.forEach((c, i) => { if (sp[i]) map[c] = sp[i]; });
      void o;
    } else {
    const plan = L === 2 ? [t + "E", t + "N"] : L === 3 ? [t + "E", t + "N", t + "Z"] : L === 4 ? ["dE", "dN", "mE", "mN"] : L === 6 ? ["dE", "dN", "dZ", "mE", "mN", "mZ"] : L === 5 ? ["dE", "dN", "mE", "mN", ""] : [t + "E", t + "N", t + "Z"];
    numC.forEach((c, i) => { if (plan[i]) map[c] = plan[i]; });
    void o;
    }
  }
  // a level column holding grid-coordinate-sized numbers (or cut-off coordinates) is not a level
  for (let c = 0; c < n; c++) if (/Z$/.test(map[c])) { const v = data.map(r => num(r[c])).filter(x => x != null); if (v.length && v.filter(x => Math.abs(x) >= 10000).length > v.length / 2) map[c] = ""; }
  const used = new Set(); for (let c = 0; c < n; c++) { if (map[c] && used.has(map[c])) map[c] = ""; else if (map[c]) used.add(map[c]); }
  return map;
}

/* ---- Coordinate order (E,N or N,E): detect, show, swap ---- */
function orderState(G) {
  const st = {};
  for (const t of ["d", "m"]) { const ce = G.map.indexOf(t + "E"), cn = G.map.indexOf(t + "N"); st[t] = ce >= 0 && cn >= 0 ? (ce < cn ? "EN" : "NE") : null; }
  return st;
}
function swapOrder(G) { G.map = G.map.map(m => m === "dE" ? "dN" : m === "dN" ? "dE" : m === "mE" ? "mN" : m === "mN" ? "mE" : m); }
/* Compare the file's E/N values with design E/N already in the check (matched by point name): which order fits? */
function orderFit(G) {
  const pts = S.check.points, nameC = G.map.indexOf("name"); if (!pts.length || nameC < 0) return null;
  const idx = {}; pts.forEach(p => { if (p.name) idx[p.name.trim().toLowerCase()] = p; });
  let cur = 0, swp = 0, n = 0;
  G.rows.forEach((r, i) => {
    if (!G.inc[i]) return; const p = idx[(r[nameC] || "").trim().toLowerCase()]; if (!p) return;
    for (const t of ["d", "m"]) {
      const ce = G.map.indexOf(t + "E"), cn = G.map.indexOf(t + "N"); if (ce < 0 || cn < 0) continue;
      const a = num(r[ce]), b = num(r[cn]), dE = num(p.dE), dN = num(p.dN); if ([a, b, dE, dN].some(x => x == null)) continue;
      cur += Math.abs(a - dE) + Math.abs(b - dN); swp += Math.abs(a - dN) + Math.abs(b - dE); n++;
    }
  });
  return n ? { cur: cur / n, swp: swp / n, n } : null;
}
function updateOrderUi() {
  const G = S._grid, row = $("#rvOrderRow"); if (!G || !row) return;
  const st = orderState(G), cur = st.d || st.m; row.hidden = !cur;
  if (cur) $("#rvOrder").value = cur;
  const fit = orderFit(G); let msg = "", cls = "hint";
  if (fit && fit.swp * 5 < fit.cur && fit.cur > 1) { msg = `⚠ The values match the design better as ${cur === "EN" ? "N, E" : "E, N"} (average difference ${fit.cur.toFixed(1)} m as shown vs ${fit.swp.toFixed(1)} m swapped). Switch the order if the file lists them the other way round.`; cls = "hint warn"; }
  else if (fit && fit.cur <= 5) msg = `✓ Order agrees with the design in this check (${fit.n} points compared).`;
  else if (G.assumed) { msg = "No headings: the columns are assumed to run E, N (X, Y). Many instruments export N, E (Y, X): switch it if yours does."; cls = "hint warn"; }
  const el = $("#rvOrderMsg"); el.className = cls; el.textContent = msg;
}
function openReview(G, opts = {}) {
  S._grid = G;
  const hasPts = S.check.points.length > 0;
  const body = openDlg(opts.title || "Review & map columns", `
    ${opts.notes ? `<div class="note">${opts.notes}</div>` : ""}
    ${opts.sheets && opts.sheets.length > 1 ? `<div class="row"><label class="f" style="margin:0">Sheet</label><select class="i" style="width:auto" id="rvSheet">${opts.sheets.map(s => `<option ${s === opts.sheet ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></div>` : ""}
    <p class="hint">Check every value against the source (cells in <span style="background:#FFF3BF">yellow</span> were hard to read, <span style="background:var(--failb);color:var(--fail)">red</span> are not numbers). Pick what each column is from the drop-downs. Untick rows you don't want.</p>
    <div class="row" id="rvOrderRow" hidden><label class="f" style="margin:0" for="rvOrder">Coordinate order</label><select class="i" style="width:auto" id="rvOrder"><option value="EN">E, N (X, Y)</option><option value="NE">N, E (Y, X)</option></select></div>
    <div id="rvOrderMsg" class="hint" style="margin:0 0 8px"></div>
    <div class="gridwrap"><table class="g" id="rvTable"></table></div>
    <div class="row">
      <label class="f" style="margin:0">Add to the check as</label>
      <select class="i" style="width:auto" id="rvMode">
        <option value="merge" ${hasPts ? "selected" : ""}>Merge by point name (fill in values)</option>
        <option value="append">Add as new points</option>
        <option value="replace" ${hasPts ? "" : "selected"}>Replace all points</option>
      </select>
    </div>
    <div class="row"><button class="btn primary" id="rvOk">Use these points</button><button class="btn" id="rvCancel">Cancel</button><span class="hint" id="rvInfo"></span></div>`);
  if (G.assumed) { const fit = orderFit(G); if (fit && fit.swp * 5 < fit.cur && fit.cur > 1) { swapOrder(G); G.autoSwapped = true; } }
  renderGrid(); updateOrderUi();
  if (G.autoSwapped) toast("Columns read as N, E to match the design - please check", 4500);
  $("#rvCancel").onclick = closeDlg;
  $("#rvOk").onclick = applyGrid;
  if ($("#rvSheet")) $("#rvSheet").onchange = e => opts.onSheet && opts.onSheet(e.target.value);
}
function renderGrid() {
  const G = S._grid, n = G.header.length;
  const head = `<thead><tr><th>Use</th>${G.header.map((h, c) => `<th><select data-c="${c}" class="${G.map[c] ? "mapped" : ""}">${FIELDS.map(([v, t]) => `<option value="${v}" ${G.map[c] === v ? "selected" : ""}>${t}</option>`).join("")}</select>${h ? `<div class="hint" style="font-size:11px;max-width:150px;overflow:hidden;text-overflow:ellipsis" title="${esc(h)}">${esc(h)}</div>` : ""}</th>`).join("")}</tr></thead>`;
  const body = G.rows.slice(0, 500).map((r, i) => `<tr class="${G.inc[i] ? "" : "off"}"><td><input type="checkbox" data-inc="${i}" ${G.inc[i] ? "checked" : ""}></td>${r.map((v, c) => {
    const bad = NUMF.has(G.map[c]) && v !== "" && !isNumStr(v);
    return `<td class="${bad ? "bad" : G.flags[i] && G.flags[i][c] ? "flag" : ""}"><input data-r="${i}" data-c="${c}" value="${esc(v)}"></td>`;
  }).join("")}</tr>`).join("");
  $("#rvTable").innerHTML = head + `<tbody>${body}</tbody>`;
  $("#rvInfo").textContent = `${G.inc.filter(Boolean).length} of ${G.rows.length} rows selected`;
  void n;
}
$("#dlgBody").addEventListener("change", e => {
  const t = e.target, G = S._grid; if (!G || !$("#rvTable")) return;
  if (t.id !== "rvOrder" && !$("#rvTable").contains(t)) return;
  if (t.id === "rvOrder") { const st = orderState(G); if ((st.d || st.m) !== t.value) swapOrder(G); renderGrid(); updateOrderUi(); return; }
  if (t.matches("select[data-c]")) { const c = +t.dataset.c, v = t.value; if (v) G.map.forEach((m, i) => { if (m === v) G.map[i] = ""; }); G.map[c] = v; renderGrid(); updateOrderUi(); }
  else if (t.matches("input[data-inc]")) { G.inc[+t.dataset.inc] = t.checked; t.closest("tr").classList.toggle("off", !t.checked); $("#rvInfo").textContent = `${G.inc.filter(Boolean).length} of ${G.rows.length} rows selected`; }
});
$("#dlgBody").addEventListener("input", e => {
  const t = e.target, G = S._grid; if (!G || !t.matches("#rvTable input[data-r]")) return;
  const r = +t.dataset.r, c = +t.dataset.c; G.rows[r][c] = t.value; if (G.flags[r]) G.flags[r][c] = false;
  const td = t.parentElement; td.classList.remove("flag"); td.classList.toggle("bad", NUMF.has(G.map[c]) && t.value !== "" && !isNumStr(t.value));
});
function applyGrid() {
  const G = S._grid, mode = $("#rvMode").value;
  if (!G.map.some(m => NUMF.has(m) && m !== "tolH" && m !== "tolV")) { toast("Choose at least one coordinate column"); return; }
  const incoming = [];
  G.rows.forEach((r, i) => {
    if (!G.inc[i]) return;
    const p = {};
    G.map.forEach((f, c) => { if (f) p[f] = r[c]; });
    if (!["dE", "dN", "dZ", "mE", "mN", "mZ"].some(f => p[f] && p[f] !== "")) return;
    for (const f of NUMF) if (p[f] != null) { const x = num(p[f]); p[f] = x == null ? String(p[f]).trim() : String(p[f]).trim().replace(/[\s,]/g, ""); }
    p.name = (p.name || "").trim() || (p.no ? String(p.no).trim() : "");
    delete p.no; incoming.push(p);
  });
  if (!incoming.length) { toast("No rows with values to add"); return; }
  const pts = S.check.points;
  let added = 0, merged = 0;
  if (mode === "replace") { S.check.points = incoming.map((p, i) => newPoint({ ...p, name: p.name || `P${i + 1}` })); added = incoming.length; }
  else {
    incoming.forEach(p => {
      const key = (p.name || "").trim().toLowerCase();
      const ex = mode === "merge" && key ? pts.find(q => q.name.trim().toLowerCase() === key) : null;
      if (ex) { for (const [k, v] of Object.entries(p)) if (v !== "" && v != null && k !== "name") ex[k] = v; merged++; }
      else { pts.push(newPoint({ ...p, name: p.name || `P${pts.length + 1}` })); added++; }
    });
  }
  closeDlg(); refreshAll(); saveDraft();
  toast(`${added} point${added === 1 ? "" : "s"} added${merged ? `, ${merged} merged` : ""}`);
}


/* ---- PDF schedules (text PDFs only): pdf.js is loaded on first use ---- */
async function pdfToAoa(file) {
  await loadScript("lib/pdfjs.min.js");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("lib/pdfjs.worker.min.js", document.baseURI).href;
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const rows = [];
  for (let pn = 1; pn <= Math.min(pdf.numPages, 30); pn++) {
    const tc = await (await pdf.getPage(pn)).getTextContent();
    const items = tc.items.filter(i => i.str && i.str.trim()).map(i => ({ s: i.str.trim(), x: i.transform[4], y: i.transform[5], w: i.width || 0, h: Math.abs(i.transform[3]) || 8 }));
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines = [];
    items.forEach(it => { const ln = lines.find(l => Math.abs(l.y - it.y) <= Math.max(2, it.h * 0.35)); if (ln) ln.items.push(it); else lines.push({ y: it.y, items: [it] }); });
    lines.sort((a, b) => b.y - a.y).forEach(l => {
      l.items.sort((a, b) => a.x - b.x);
      const cells = [];
      l.items.forEach(it => { const last = cells[cells.length - 1]; if (last && it.x - last.end < it.h * 0.45) { last.s += " " + it.s; last.end = it.x + it.w; } else cells.push({ s: it.s, x: it.x, end: it.x + it.w }); });
      rows.push(cells);
    });
  }
  /* line up the cells of each row on the column positions of the widest-spread row */
  const dataRows = rows.filter(r => r.filter(c => isNumStr(c.s)).length >= 2);
  if (!dataRows.length) return [];
  const cols = []; rows.forEach(r => r.forEach(c => { const k = cols.find(x => Math.abs(x - c.x) < 14 || (c.x < x + 2 && c.end > x - 2 && Math.abs(x - c.x) < 30)); if (k == null) cols.push(c.x); }));
  cols.sort((a, b) => a - b);
  return rows.map(r => { const out = Array(cols.length).fill(""); r.forEach(c => { let bi = 0; cols.forEach((x, i) => { if (Math.abs(x - c.x) < Math.abs(cols[bi] - c.x)) bi = i; }); out[bi] = out[bi] ? out[bi] + " " + c.s : c.s; }); return out; });
}

/* ---- Excel / CSV ---- */
async function importFile(file) {
  try {
    if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
      toast("Reading the PDF…", 2500);
      const aoa = await pdfToAoa(file);
      if (!aoa.length) return toast("No table of numbers found in this PDF. If it is a scan, use Scan photo instead.", 6000);
      const G = gridFromAoa(aoa, "d");
      if (!G.rows.length) return toast("No rows with numbers found in this PDF", 5000);
      return openReview(G, { title: `Import: ${file.name}`, notes: "Read from the text of the PDF (not a scan). Check every value and column against the PDF." });
    }
    await loadXlsx();
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", raw: false, cellDates: false });
    const score = n => { const a = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: "" }); return a.flat().filter(v => typeof v === "number").length; };
    const sheets = wb.SheetNames;
    let sh = sheets.slice().sort((a, b) => score(b) - score(a))[0];
    const open = name => {
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: "" });
      const G = gridFromAoa(aoa, "d");
      if (!G.rows.length) { toast("No rows with numbers found in " + name); }
      openReview(G, { title: `Import: ${file.name}`, sheets, sheet: name, onSheet: open, notes: G.header.some(Boolean) ? "Columns were matched from the headings. Please confirm." : "" });
    };
    open(sh);
  } catch (e) { console.error(e); toast("Could not read the file: " + e.message, 5000); }
}
function parsePaste(txt) {
  const lines = txt.replace(/\r/g, "").split("\n").filter(l => l.trim());
  const tab = lines.some(l => l.includes("\t"));
  const semi = !tab && lines.some(l => l.includes(";"));
  const comma = !tab && !semi && lines.some(l => /,\s*\S/.test(l) && !/\d,\d{3}\./.test(l));
  return lines.map(l => tab ? l.split("\t") : semi ? l.split(";") : comma ? l.split(",") : l.trim().split(/\s+/));
}
function openPaste() {
  openDlg("Paste points", `<p class="hint">Copy rows from Excel, a CSV or a text file and paste them here. Columns can be separated by tabs, commas, semicolons or spaces. Headings are optional.</p>
    <textarea class="i" id="pasteTxt" rows="10" placeholder="P1	739988.636	769670.644&#10;P2	739990.365	769671.644" style="font-family:ui-monospace,monospace"></textarea>
    <div class="row"><label class="f" style="margin:0">If there are no headings, the values are</label>
      <select class="i" style="width:auto" id="pasteT"><option value="d">Design</option><option value="m">Measured</option></select></div>
    <div class="row"><button class="btn primary" id="pasteGo">Next</button></div>`);
  $("#pasteGo").onclick = () => { const t = $("#pasteTxt").value; if (!t.trim()) return toast("Nothing pasted"); const G = gridFromAoa(parsePaste(t), $("#pasteT").value); if (!G.rows.length) return toast("No rows with numbers found"); openReview(G, { title: "Review pasted rows" }); };
}

/* ---- Scan: Gemini vision + Tesseract fallback ---- */
const SCAN_SRC = { schedule: "a printed coordinate schedule / table (drawing schedule, setting-out sheet or a spreadsheet on a screen)", fieldbook: "a handwritten survey field book page", screen: "the screen of a survey instrument or data collector (total station, GNSS controller or tablet with survey software)" };
function openScan() {
  const hasKey = !!S.cfg.apiKey;
  let firstAiNote = false; try { firstAiNote = !hasKey && !localStorage.getItem("soc_aiNote"); if (firstAiNote) localStorage.setItem("soc_aiNote", "1"); } catch { }
  openDlg("Scan a photo", `
    <div class="fg">
      <div class="w2"><label class="f">What is in the photo?</label><select class="i" id="scSrc"><option value="schedule">Printed schedule / table / spreadsheet</option><option value="fieldbook">Handwritten field book</option><option value="screen">Instrument / tablet screen</option></select></div>
      <div class="w2"><label class="f">The coordinates are</label><select class="i" id="scT"><option value="auto">Read from the headings / labels</option><option value="d">Design values</option><option value="m">Measured values</option></select></div>
      <div class="w2"><label class="f">Read with</label><select class="i" id="scM"><option value="ai" ${hasKey ? "selected" : ""}>AI (Gemini) - best for handwriting and screens, needs signal</option><option value="ocr" ${hasKey ? "" : "selected"}>Offline OCR - printed text only</option></select></div>
    </div>
    ${hasKey ? "" : `<details class="ai-note" ${firstAiNote ? "open" : ""}><summary><b>Set up AI scan</b> (free) for handwriting and screens</summary>
      <ol><li>Open <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>, sign in with a Google account and create a key.</li>
      <li>Come back here: <b>Setup → AI scan</b>, paste the key and tap <b>Test key</b>.</li></ol>
      <p class="hint">The key stays on this phone only. A photo is sent to Google only when you scan with AI; the offline OCR never sends anything. Until a key is added, the offline OCR is used (printed tables only).</p>
      <div class="row"><button class="btn primary sm" id="scGoSetup">Open Setup</button></div></details>`}
    <p class="hint">Hold the phone square to the page or screen, fill the frame with the table, avoid glare. You can pick several photos (e.g. one per page).</p>
    <div class="row"><button class="btn primary" id="scCam">📷 Take photo</button><button class="btn" id="scPick">🖼 Choose photo(s)</button></div>
    <div id="scStatus"></div>`);
  if ($("#scGoSetup")) $("#scGoSetup").onclick = () => { openSetup(); setTimeout(() => { const k = $("#suKey"); if (k) { k.scrollIntoView({ block: "center" }); k.focus(); } }, 150); };
  $("#scCam").onclick = () => $("#fileCam").click();
  $("#scPick").onclick = () => $("#fileImg").click();
}
async function fileToJpeg(file, maxPx = 2000, q = 0.9) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Cannot open image (HEIC? use JPEG)")); i.src = url; });
    const s = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement("canvas"); cv.width = Math.round(img.naturalWidth * s); cv.height = Math.round(img.naturalHeight * s);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    return { canvas: cv, dataUrl: cv.toDataURL("image/jpeg", q) };
  } finally { URL.revokeObjectURL(url); }
}
async function runScan(files) {
  const src = $("#scSrc")?.value || "schedule", tgt = $("#scT")?.value || "auto", method = $("#scM")?.value || "ocr";
  const st = $("#scStatus"); const say = h => { if (st) st.innerHTML = h; };
  try {
    const all = []; let notes = [];
    for (let i = 0; i < files.length; i++) {
      say(`<div class="note"><span class="spin d"></span> Reading photo ${i + 1} of ${files.length}${method === "ai" ? " with Gemini" : " with offline OCR (the first time it downloads about 7 MB, then works without signal)"}…</div>`);
      const { canvas, dataUrl } = await fileToJpeg(files[i]);
      if (method === "ai") { const r = await geminiScan(dataUrl, src, tgt); all.push(...r.rows); if (r.notes) notes.push(r.notes); }
      else { const r = await ocrScan(canvas); all.push(r); }
    }
    if (method === "ai") {
      const cols = ["name", "dE", "dN", "dZ", "mE", "mN", "mZ"].filter(f => f === "name" || all.some(r => r[f] !== "" && r[f] != null));
      const G = { header: cols.map(f => FIELDS.find(x => x[0] === f)[1]), map: cols.slice(), rows: all.map(r => cols.map(f => r[f] == null ? "" : String(r[f]))), flags: all.map(r => cols.map(f => (r.uncertain || []).includes(f))), inc: all.map(() => true) };
      if (!G.rows.length) return say(`<div class="err">No coordinate rows were found in the photo. Try a closer, sharper photo.</div>`);
      const nf = G.flags.flat().filter(Boolean).length;
      openReview(G, { title: "Review scanned values", notes: `<b>Check every value against the photo before using it.</b> ${G.rows.length} rows read${nf ? `, <b>${nf}</b> value(s) marked uncertain` : ""}.${notes.length ? "<br>AI notes: " + esc(notes.join(" · ")) : ""}` });
    } else {
      const aoa = all.flat();
      const G = gridFromAoa(aoa, tgt === "m" ? "m" : "d");
      if (!G.rows.length) return say(`<div class="err">No numbers could be read. The offline OCR works best on clear printed tables; for handwriting or screens use AI (Setup → AI scan).</div>`);
      openReview(G, { title: "Review OCR result", notes: "<b>Offline OCR: check every digit against the photo.</b> Pick what each column is from the drop-downs." });
    }
  } catch (e) { console.error(e); say(`<div class="err">${esc(e.message || e)}</div>`); }
}
async function geminiScan(dataUrl, src, tgt) {
  if (!navigator.onLine) throw new Error("No signal - AI scan needs internet. Use offline OCR, or scan later.");
  const key = S.cfg.apiKey; if (!key) throw new Error("No Gemini API key. Add it in Setup → AI scan.");
  const str = { type: "string" };
  const schema = { type: "object", properties: {
    points: { type: "array", items: { type: "object", properties: {
      name: { type: "string", description: "Point name / number / label exactly as written" },
      design_e: str, design_n: str, design_rl: str, measured_e: str, measured_n: str, measured_rl: str,
      uncertain_fields: { type: "array", items: { type: "string", enum: ["name", "design_e", "design_n", "design_rl", "measured_e", "measured_n", "measured_rl"] } }
    }, required: ["name"] } },
    notes: { type: "string", description: "Short note: which labels were read as E/N/RL and design/measured, anything unclear" }
  }, required: ["points"] };
  const tgtTxt = tgt === "d" ? "All coordinates in this photo are DESIGN values: put them in design_* fields." : tgt === "m" ? "All coordinates in this photo are MEASURED (on-site) values: put them in measured_* fields." :
    "Decide design vs measured from the headings/labels (Design, Setting-out, Theoretical, Stake, Proposed = design; Measured, Actual, Observed, As-built, Check, Field = measured). If there is only one unlabelled set, use design_* fields.";
  const prompt = `You are transcribing ${SCAN_SRC[src]} for a construction setting-out coordinate check in Sabah, Malaysia (grid coordinates in metres, usually 6 digits before the decimal point and 3 decimals; RL/levels usually 1-4 digits with 3 decimals).
Extract every point (row) visible.
Rules:
- Transcribe digits EXACTLY as written or displayed. Never guess, round, compute or correct values. Keep all decimals.
- If a digit or value is unclear, give your best reading and list that field in uncertain_fields.
- E / X / Easting / X-value -> *_e ; N / Y / Northing / Y-value -> *_n ; Z / H / RL / Elev / Level / Height -> *_rl. On instrument screens use the on-screen labels (some software shows Y for Easting and X for Northing - follow the labels and mention it in notes).
- ${tgtTxt}
- Ignore offset / difference / delta / cut-fill columns, totals and computed results.
- Leave a field empty if it is not present. Do not invent point names: if there is a row number only, use it as the name.`;
  const body = { model: S.cfg.model || DEFAULT_MODEL, store: false,
    input: [{ type: "text", text: prompt }, { type: "image", data: dataUrl.split(",")[1], mime_type: "image/jpeg" }],
    response_format: { type: "text", mime_type: "application/json", schema } };
  const j = await geminiPost(body, key);
  const txt = extractText(j); if (!txt) throw new Error("Gemini returned no text");
  let out; try { out = JSON.parse(txt.replace(/^```(json)?|```$/g, "").trim()); } catch { throw new Error("Could not understand the AI reply"); }
  const fmap = { design_e: "dE", design_n: "dN", design_rl: "dZ", measured_e: "mE", measured_n: "mN", measured_rl: "mZ" };
  const rows = (out.points || []).map(p => { const r = { name: (p.name || "").trim(), uncertain: [] }; for (const [a, b] of Object.entries(fmap)) r[b] = (p[a] ?? "").toString().trim(); (p.uncertain_fields || []).forEach(u => r.uncertain.push(u === "name" ? "name" : fmap[u])); return r; });
  return { rows, notes: out.notes || "" };
}
/* POST to the Gemini Interactions API. Sends the Api-Revision header; if the browser blocks it (CORS), retries without. */
async function geminiPost(body, key) {
  const go = rev => fetch(GEMINI_URL, { method: "POST", headers: Object.assign({ "Content-Type": "application/json", "x-goog-api-key": key }, rev ? { "Api-Revision": GEMINI_REV } : {}), body: JSON.stringify(body) });
  let res; try { res = await go(true); } catch (e) { res = await go(false); }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    let m = j.error?.message || res.statusText;
    if (res.status === 404 || /model/i.test(m) && /not found|unsupported/i.test(m)) m += ` - check the model name in Setup (default ${DEFAULT_MODEL})`;
    if (res.status === 400 && /api key/i.test(m) || res.status === 403) m += " - check the API key in Setup";
    throw new Error("Gemini error " + res.status + ": " + m);
  }
  return j;
}
function extractText(j) {
  if (typeof j.output_text === "string") return j.output_text;
  const steps = (j.steps || j.outputs || []).filter(s => !s.type || s.type === "model_output" || s.type === "text");
  for (let i = steps.length - 1; i >= 0; i--) {
    const s = steps[i];
    if (typeof s.text === "string" && (!s.type || s.type === "text" || s.type === "model_output")) return s.text;
    if (Array.isArray(s.content)) { const t = s.content.filter(c => c.type === "text" && c.text).map(c => c.text).join(""); if (t) return t; }
  }
  const c = j.candidates?.[0]?.content?.parts; if (c) return c.map(p => p.text || "").join("");
  return "";
}
async function ocrScan(canvas) {
  await loadScript("lib/tesseract/tesseract.min.js");
  // grayscale + contrast stretch + Otsu threshold (tested best on phone photos of tables and screens)
  const ctx = canvas.getContext("2d"), im = ctx.getImageData(0, 0, canvas.width, canvas.height), d = im.data;
  let lo = 255, hi = 0; for (let i = 0; i < d.length; i += 4) { const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; d[i] = g; if (g < lo) lo = g; if (g > hi) hi = g; }
  const k = 255 / Math.max(1, hi - lo), hist = new Array(256).fill(0);
  for (let i = 0; i < d.length; i += 4) { const g = Math.round((d[i] - lo) * k); d[i] = g; hist[g]++; }
  const tot = d.length / 4; let sum = 0; for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sB = 0, wB = 0, best = 0, th = 128;
  for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = tot - wB; if (!wF) break; sB += t * hist[t]; const v = wB * wF * (sB / wB - (sum - sB) / wF) ** 2; if (v > best) { best = v; th = t; } }
  for (let i = 0; i < d.length; i += 4) { const g = d[i] > th ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = g; }
  ctx.putImageData(im, 0, 0);
  if (!S._ocr) S._ocr = Tesseract.createWorker("eng", 1, { workerPath: "lib/tesseract/worker.min.js", corePath: "lib/tesseract/", langPath: "lib/tesseract/lang", gzip: true });
  let worker; try { worker = await S._ocr; } catch (e) { S._ocr = null; throw new Error("Offline OCR could not start" + (navigator.onLine ? "" : " - use it once with signal so it is saved for offline use")); }
  const { data } = await worker.recognize(canvas);
  const rows = [];
  (data.lines || []).forEach(line => {
    const toks = (line.words || []).map(w => {
      let t = w.text.replace(/[|]/g, "").trim();
      if (/\d/.test(t)) t = t.replace(/^[\[\](){}!:;'"`_]+|[\[\](){}!:;'"`_]+$/g, "").replace(/[Oo]/g, "0").replace(/[lI]/g, "1").replace(/,(?=\d{3}\b)/g, "").replace(/,/g, ".");
      return t ? t + (w.confidence < 75 && /\d/.test(t) ? "?" : "") : "";
    }).filter(t => /[A-Za-z0-9]/.test(t));
    if (toks.filter(t => isNumStr(t.replace(/\?$/, ""))).length >= 1) rows.push(toks);
  });
  // lost decimal point: if most coordinates on the page have 6 digits before the point, "739992096" -> "739992.096?" (flagged)
  const ints = rows.flat().map(t => t.replace(/\?$/, "").match(/^-?(\d+)\.\d+$/)).filter(Boolean).map(m => m[1].length);
  const cnt = {}; ints.forEach(n => cnt[n] = (cnt[n] || 0) + 1);
  const dom = +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || 0;
  if (dom >= 5) rows.forEach(r => r.forEach((t, i) => { const m = t.replace(/\?$/, "").match(/^(\d+)$/); if (m && m[1].length > dom && m[1].length <= dom + 3) r[i] = m[1].slice(0, dom) + "." + m[1].slice(dom) + "?"; }));
  const bare = t => t.replace(/\?$/, ""), intLen = t => { const m = bare(t).match(/^-?(\d+)(\.\d*)?$/); return m ? m[1].length : 0; };
  // flag cut-off coordinates ("73999" when most have 6 digits) and values far from all the others (a misread leading digit)
  if (dom >= 5) {
    const big = rows.flat().filter(t => intLen(t) === dom).map(t => num(bare(t)));
    rows.forEach(r => r.forEach((t, i) => {
      if (t.endsWith("?")) return;
      const L = intLen(t);
      if (L && L < dom && L >= dom - 2 && !bare(t).includes(".")) r[i] = t + "?";
      else if (L === dom) { const x = num(bare(t)); if (big.filter(y => Math.abs(y - x) < 5000).length < 2 && big.length > 3) r[i] = t + "?"; }
    }));
  }
  // keep only rows with a coordinate or level (5+ digits, or 3 decimals); drop timestamps, headings, page numbers
  const isData = r => r.some(t => intLen(t) >= 5 || /^-?\d+\.\d{3}$/.test(bare(t)));
  // normalise each row to [name, values...]: leading words and a leading row number form the name
  return rows.filter(isData).map(t => {
    const nm = []; while (t.length && !isNumStr(bare(t[0]))) nm.push(t.shift());
    if (t.length > 1 && /^\d{1,4}$/.test(bare(t[0])) && intLen(t[1]) >= 4) nm.push(bare(t.shift()));
    return [nm.join(" ").replace(/^[^\w]+/, "").trim(), ...t];
  });
}

/* ---------------- photos ---------------- */
async function addPhotos(files) {
  for (const f of files) {
    try { const { dataUrl } = await fileToJpeg(f, 1400, 0.78); S.check.photos.push({ id: uid(), src: dataUrl, cap: "" }); } catch (e) { toast(e.message); }
  }
  renderPhotos(); saveDraft();
}
function renderPhotos() {
  $("#photos").innerHTML = S.check.photos.map((p, i) => `<div class="ph" data-ph="${p.id}"><button class="ph-preview" data-phview title="Preview photo ${i + 1}"><img src="${p.src}" alt="Site photo ${i + 1}"></button><select data-ptsel aria-label="Point this photo shows"><option value="">Point: none</option>${S.check.points.filter(q => q.name).map(q => `<option value="${esc(q.name)}" ${q.name === p.pt ? "selected" : ""}>${esc(q.name)}</option>`).join("")}</select><input data-cap value="${esc(p.cap)}" placeholder="Caption ${i + 1} — location or observation"><button data-phdel>Remove photo</button></div>`).join("");
  $("#photoCount").textContent = S.check.photos.length ? `(${S.check.photos.length} attached)` : "";
}
$("#photos").addEventListener("change", e => { if (e.target.matches("[data-ptsel]")) { const p = S.check.photos.find(x => x.id === e.target.closest("[data-ph]").dataset.ph); p.pt = e.target.value; saveDraft(); } });
$("#photos").addEventListener("input", e => { if (e.target.matches("[data-cap]")) { const p = S.check.photos.find(x => x.id === e.target.closest("[data-ph]").dataset.ph); p.cap = e.target.value; saveDraft(); } });
$("#photos").addEventListener("click", e => {
  if (e.target.closest("[data-phdel]")) { const id = e.target.closest("[data-ph]").dataset.ph; S.check.photos = S.check.photos.filter(x => x.id !== id); renderPhotos(); saveDraft(); }
  else if (e.target.closest("[data-phview]")) { const p = S.check.photos.find(x => x.id === e.target.closest("[data-ph]").dataset.ph); if (p) openDlg("Photo preview", `<img src="${p.src}" alt="${esc(p.cap || "Site photo")}" style="display:block;max-width:100%;max-height:72vh;margin:auto;border-radius:8px"><p class="hint">${esc(p.cap || "No caption")}</p>`); }
});

