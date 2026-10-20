/* Set-Out Check - event wiring (runs after app.js, scanner.js and report.js are loaded) */
"use strict";
/* ---------------- events ---------------- */
function nextRev(r) {
  r = String(r || "").trim();
  if (!r || r === "0") return "1";
  if (/^\d+$/.test(r)) return String(+r + 1);
  if (/^[A-Ya-y]$/.test(r)) return String.fromCharCode(r.charCodeAt(0) + 1);
  return r + "+";
}
function startRecheck() {
  const bad = results().filter(x => x.r.st === "FAIL" || x.r.st === "CHECK"); if (!bad.length) return;
  const prev = S.check, saved = !!(prev.ref && S.register.some(x => x.ref === prev.ref));
  if (!confirmLocalized(`Re-check ${bad.length} failed point(s)?\nTheir design values are kept and the measured values are cleared. The revision goes up by one.${saved ? "" : "\n\nThis check has not been saved to the register yet: share or save its report first if you want to keep it."}`)) return;
  const nc = newCheck(prev); nc.rfi = prev.rfi; nc.rev = nextRev(prev.rev);
  nc.notes = `Re-check of ${prev.ref || "the previous check"} (rev ${(prev.rev || "").trim() || "0"}): ${bad.map(x => x.p.name || "?").join(", ")}.`;
  nc.points = bad.map(({ p }) => newPoint({ name: p.name, dE: p.dE, dN: p.dN, dZ: p.dZ, tolH: p.tolH, tolV: p.tolV, tolVPos: p.tolVPos, tolVNeg: p.tolVNeg }));
  S.check = nc; saveDraft(); renderAllUI(); toast(`Re-check started: revision ${nc.rev}`, 4000); goStep(1);
}
function startNewCheck() {
  if (!confirmLocalized("Start a new check?\nPoints, photos, notes and the ref. no. are cleared. Team, names, instrument, control and tolerance are kept.")) return;
  S.check = newCheck(S.check); S.check.rfi = ""; saveDraft(); renderAllUI(); closeDlg(); window.scrollTo({ top: 0, behavior: "smooth" });
}
$("#secDetails").addEventListener("click", e => {
  const x = e.target.closest("[data-unreveal]");
  if (x) {
    const f = document.getElementById(x.dataset.clear);
    if (f) { f.value = ""; f.dispatchEvent(new Event("input", { bubbles: true })); }
    showReveal(x.dataset.unreveal, false); return;
  }
  const b = e.target.closest("[data-reveal]"); if (!b) return;
  showReveal(b.dataset.reveal, true); const f = document.getElementById(b.dataset.focus); if (f) f.focus();
});
$("#secDetails").addEventListener("input", e => {
  const k = e.target.dataset.k; if (!k) return;
  if (k === "chainageFrom" || k === "chainageTo") {
    formatChainageInput(e.target);
    if (k === "chainageTo" && e.target.value) showReveal("chainageToWrap", true);
  }
  if (k === "location" && e.target.value) showReveal("specificLocationWrap", true);
  S.check[k] = e.target.value; refreshFlow();
  if (["tolH", "tolVPos", "tolVNeg"].includes(k)) e.target.classList.toggle("bad", num(e.target.value) == null || num(e.target.value) < 0);
  if (k === "team" || k === "name" || k === "desig" || k === "instModel" || k === "instSerial" || k === "instCalib") { const p = profile(); p[k] = e.target.value; localStorage.setItem("soc_profile", JSON.stringify(p)); }
  if (k === "preset") {
    const p = presets().find(x => x.id === e.target.value);
    if (p) {
      S.check.tolH = String(p.h); S.check.tolV = String(p.v); S.check.tolVPos = String(p.v); S.check.tolVNeg = String(p.v);
      $('[data-k="tolH"]').value = p.h; $('[data-k="tolVPos"]').value = p.v; $('[data-k="tolVNeg"]').value = p.v;
    }
  }
  if (k === "tolVPos") S.check.tolV = S.check.tolVPos;
  if (k === "tolH" || k === "tolVPos" || k === "tolVNeg") {
    const p = presets().find(x => x.id === S.check.preset);
    if (p && (String(p.h) !== S.check.tolH || String(p.v) !== S.check.tolVPos || String(p.v) !== S.check.tolVNeg)) { S.check.preset = "custom"; $("#selPreset").value = "custom"; }
  }
  if (k === "tolH" || k === "tolVPos" || k === "tolVNeg" || k === "preset") { S.check.points.forEach(updateCard); refreshSummary(); }
  saveDraft();
});
$("#structureSelect").onchange = e => {
  const custom = e.target.value === "__custom__";
  $("#customStructureEntry").hidden = !custom;
  if (custom) {
    $("#structureCustom").focus();
    S.check.structure = $("#structureCustom").value;
  } else S.check.structure = e.target.value;
  saveDraft();
};
$("#structureCustom").oninput = e => { S.check.structure = e.target.value; saveDraft(); };
$("#btnAddStructure").onclick = () => {
  const name = S.check.structure.trim();
  if (!name) return toast(t("Enter a structure first."));
  const names = customStructures();
  if ((S.setup.structures || []).some(x => (typeof x === "string" ? x : x.name) === name) || names.includes(name)) return toast("This structure is already in the list");
  names.push(name);
  try {
    localStorage.setItem(`soc_customStructures_${S.pkg}`, JSON.stringify(names));
    renderDetails();
    $("#structureSelect").value = name;
    $("#customStructureEntry").hidden = true;
    S.check.structure = name; saveDraft();
    toast(t("Structure added to this project's list."));
  } catch (e) { toast(`Could not save this project's structure list: ${e.message}`, 4000); }
};
$('[data-k="notes"]').addEventListener("input", e => { S.check.notes = e.target.value; saveDraft(); });
$("#segType").onclick = e => { const t = e.target.closest("button")?.dataset.type; if (t) setType(t); };
$("#plist").addEventListener("input", e => {
  const f = e.target.dataset.f; if (!f) return;
  const id = e.target.closest(".pt").dataset.id, p = S.check.points.find(x => x.id === id);
  p[f] = e.target.value; updateCard(p); refreshSummary(); saveDraft();
});
$("#plist").addEventListener("focusout", e => {
  const f = e.target.dataset.f; if (!f || !S.cfg.smart || !/^[dm][ENZ]$/.test(f)) return;
  const id = e.target.closest(".pt").dataset.id, idx = S.check.points.findIndex(x => x.id === id), p = S.check.points[idx];
  const prev = S.check.points[idx - 1] || {};
  const ax = f[1], ref = f[0] === "m" ? (p["d" + ax] || prev["m" + ax] || prev["d" + ax]) : (prev["d" + ax] || prev["m" + ax]);
  const x = smartExpand(e.target.value, ref);
  if (x && x !== e.target.value) { toast(`${e.target.value} → ${x}`); e.target.value = x; p[f] = x; updateCard(p); refreshSummary(); saveDraft(); }
});
$("#plist").addEventListener("click", e => {
  if (!e.target.matches("[data-del]")) return;
  const id = e.target.closest(".pt").dataset.id, p = S.check.points.find(x => x.id === id);
  if ((p.dE || p.mE || p.dZ || p.mZ) && !confirmLocalized(`Delete point ${p.name || ""}?`)) return;
  S.check.points = S.check.points.filter(x => x.id !== id); refreshAll(); saveDraft();
});
$("#btnAdd").onclick = () => {
  const pts = S.check.points, last = pts[pts.length - 1];
  let name = `P${pts.length + 1}`;
  if (last && /^(.*?)(\d+)$/.test(last.name)) { const m = last.name.match(/^(.*?)(\d+)$/); name = m[1] + String(+m[2] + 1).padStart(m[2].length, "0"); }
  const p = newPoint({ name }); pts.push(p); refreshAll(); saveDraft();
  const el = $(`.pt[data-id="${p.id}"]`); el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 900); setTimeout(() => $(`input[data-f="${S.check.type === "V" ? "dZ" : "dE"}"]`, el).focus(), 250);
};
$("#btnClearPts").onclick = () => { if (!S.check.points.length || !confirmLocalized("Remove all points from this check?")) return; S.check.points = []; refreshAll(); saveDraft(); };
$("#btnImport").onclick = () => $("#fileXls").click();
$("#btnPaste").onclick = openPaste;
$("#btnScan").onclick = openScan;
$("#btnTpl").onclick = async () => { try { const { blob, name } = await buildXlsx(true); download(blob, name); } catch (e) { toast(e.message); } };
$("#fileXls").onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (f) importFile(f); };
$("#fileImg").onchange = e => { const f = [...e.target.files]; e.target.value = ""; if (f.length) runScan(f); };
$("#fileCam").onchange = e => { const f = [...e.target.files]; e.target.value = ""; if (f.length) runScan(f); };
$("#btnPhotoCam").onclick = () => $("#filePhotoCam").click();
$("#btnPhotoAdd").onclick = () => $("#filePhoto").click();
$("#filePhoto").onchange = e => { const f = [...e.target.files]; e.target.value = ""; addPhotos(f); };
$("#filePhotoCam").onchange = e => { const f = [...e.target.files]; e.target.value = ""; addPhotos(f); };
$("#fileJson").onchange = async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    if (S._jsonMode === "reg") return importRegCsv(f);
    const b = JSON.parse(await f.text()); if (S._jsonMode === "pkg") return await addPackageFile(f);
    if (b.kind === "soc-check-transfer") {
      if (b.version !== 1 || !/^[\w-]{1,24}$/.test(b.project || "") || !b.check || !Array.isArray(b.check.points) || b.check.points.length > 2000 || !Array.isArray(b.check.photos || [])) throw new Error("Not a valid Setting-Out Check transfer file");
      if (!S.pkgs.some(p => p.code === b.project)) throw new Error(`Project ${b.project} is not available in this app version`);
      if (!confirmLocalized(`Import ${b.check.ref || "this check"} from ${b.project}? The current draft for that project will be replaced.`)) return;
      if (b.project !== (S.setup.projectCode || S.pkg)) await switchPackage(b.project);
      S.check = restoreCheck(b.check); saveDraft(); renderAllUI(); closeDlg(); toast("Check imported");
      return;
    }
    if (b.kind !== "soc-backup" && b.kind !== "wp12-soc-backup") throw new Error("Not a Setting-Out Check backup file");
    if (!confirmLocalized("Restore this backup? The register will be merged and the current check replaced.")) return;
    const key = S.cfg.apiKey; S.cfg = Object.assign({}, CFG_DEF, b.cfg, { apiKey: key }); saveCfg();
    if (b.profile) localStorage.setItem("soc_profile", JSON.stringify(b.profile));
    (b.register || []).forEach(e => { if (!S.register.some(x => x.ref === e.ref)) S.register.push(e); }); await saveRegister();
    if (b.draft) { S.check = restoreCheck(b.draft); saveDraft(); }
    renderAllUI(); closeDlg(); toast("Backup restored");
  } catch (err) { toast(err.message, 4000); }
};
$("#legalNoticeClose").onclick = () => { localStorage.setItem("soc_hideNotice_v1", "1"); $("#legalNotice").hidden = true; };
$("#legalNotice").hidden = localStorage.getItem("soc_hideNotice_v1") === "1";
$("#btnReport").onclick = openReport;
$("#btnRecheck").onclick = startRecheck;
$("#flow").addEventListener("click", ev => { const b = ev.target.closest("[data-go]"); if (b) goStep(+b.dataset.go); });
$("#btnReg").onclick = openRegister;
$("#btnSetup").onclick = openSetup;
$("#btnPkg").onclick = openPkgPicker;
$("#btnHelp").onclick = openHelp;
$("#btnShareApp").onclick = openAppShare;
$("#updateReload").onclick = () => location.reload();
$("#updateLater").onclick = () => { $("#updateNotice").hidden = true; };
$("#btnNew").onclick = () => {
  startNewCheck();
};

function renderAllUI() { renderDetails(); refreshAll(); renderPhotos(); $('[data-k="notes"]').value = S.check.notes || ""; localizeNode(document.body); }

function setupUpdateChecks() {
  if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController) $("#updateNotice").hidden = false;
    hadController = true;
  });
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(reg => {
    if (reg.waiting && navigator.serviceWorker.controller) $("#updateNotice").hidden = false;
    const check = () => reg.update().catch(e => console.warn("Could not check for an app update", e));
    check();
    window.addEventListener("online", check);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
    setInterval(check, 60 * 60 * 1000);
  }).catch(e => console.warn("Could not register the app service worker", e));
}

function showQrSummary(raw = new URLSearchParams(location.search).get("soc")) {
  if (!raw) return;
  let d;
  try { d = JSON.parse(raw); }
  catch (e) { console.error("Invalid report summary QR payload", e); toast("The report QR summary is invalid", 4500); return; }
  if (!d || typeof d.r !== "string" || !d.r || d.r.length > 120 || d.p !== (S.setup.projectCode || S.pkg) || !Number.isInteger(d.n) || d.n < 0) {
    toast("The report QR summary is incomplete or belongs to another project", 4500); return;
  }
  const row = (label, value) => `<div class="li"><b>${esc(t(label))}</b><span>${esc(value ?? "-")}</span></div>`;
  openDlg(t("Report summary"), `<p class="hint">${t("This is a snapshot from the report QR, not live data or independent verification. Point coordinates are not included.")}</p>
    <div class="list">${row("Project", d.p)}${row("Ref. no.", d.r)}${row("Date", d.d)}${row("Result", d.o)}${row("Points", d.n)}${row("Pass", d.pass)}${row("Fail", d.fail)}${row("To check", d.check)}${d.h != null ? row("Max radial", `${Number(d.h).toFixed(1)} mm`) : ""}${d.z != null ? row("Max ΔZ", `${Number(d.z).toFixed(1)} mm`) : ""}</div>`);
}

