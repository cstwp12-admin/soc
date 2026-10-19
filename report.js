/* Set-Out Check - report ref, PDF, Excel, CSV, WhatsApp
   Classic script: shares one global scope with the other files. Load order: app.js, scanner.js, report.js. */
"use strict";
/* ---------------- PDF ---------------- */
function imgSize(doc, src, maxW, maxH) { try { const p = doc.getImageProperties(src); const s = Math.min(maxW / p.width, maxH / p.height); return [p.width * s, p.height * s]; } catch { return [0, 0]; } }
async function buildPdf() {
  await loadPdfLibs();
  const c = S.check, st = S.setup, rs = results(), s = summary(rs), ref = ensureRef();
  const ro = { ...CFG_DEF.reportOptions, ...(S.cfg.reportOptions || {}) };
  const reportTitle = String(S.cfg.reportTitle || CFG_DEF.reportTitle).trim() || CFG_DEF.reportTitle;
  const land = c.type === "HV";
  const doc = new window.jspdf.jsPDF({ orientation: land ? "l" : "p", unit: "mm", format: "a4", compress: true });
  const W = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight(), M = 12;
  const appUrl = appShareUrl(), contentBottom = PH - 18;
  const { L, R } = pkgLogos(c.team);
  /* Palette shared with the app (navy ink, ember accent). */
  const NAVY = [20, 33, 43], MUTED = [89, 104, 115], LINE = [211, 218, 224], ACC = [217, 72, 15], SOFT = [245, 247, 248];
  const STCOL = { PASS: [47, 125, 59], MARG: [154, 91, 0], FAIL: [201, 42, 42], CHECK: [103, 65, 217], INC: [90, 100, 109], EMPTY: [90, 100, 109] };
  const STTINT = { PASS: [227, 242, 229], MARG: [251, 240, 217], FAIL: [253, 236, 236], CHECK: [243, 240, 255], INC: [241, 243, 245], EMPTY: [241, 243, 245] };
  const caps = (txt, x, yy, o = {}) => { doc.setFont("helvetica", "bold"); doc.setFontSize(o.size || 7); doc.setTextColor(...(o.color || ACC)); doc.setCharSpace(0.4); doc.text(String(txt).toUpperCase(), x, yy, o.opt); doc.setCharSpace(0); };
  /* Header: a bordered block. Logo cells of equal width either side, so the project name is truly centred between them;
     a navy title band below. Continuation pages get a compact band only. */
  const mmPerPt = 0.352778, hy = 7, cellLW = 46, bandH = 7.5, pad = 2.2, ctrlH = 6.5;
  const midW = W - 2 * M - 2 * cellLW;
  const rev = (c.rev || "").trim() || "0";
  const ctrl = [ro.docRef && [t("Ref. no."), ref], ro.docDate && [t("Date"), c.date || "-"], ro.docRev && [t("Revision"), rev]].filter(Boolean);
  const ctrlRowH = ctrl.length ? ctrlH : 0;
  /* Project name: largest size (up to 11 pt) at which no line has to wrap; never below 8 pt. */
  const projTitle = projectTitleLines(st.projectTitle || APP_NAME);
  let projFs = 8, projLines = null;
  for (let fs = 11; fs >= 8; fs -= 0.5) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(fs);
    const wrapped = projTitle.flatMap(line => doc.splitTextToSize(line.toUpperCase(), midW - 8));
    if (wrapped.length <= projTitle.length || fs === 8) { projFs = fs; projLines = wrapped; break; }
  }
  const projLH = projFs * 1.22 * mmPerPt;
  const subTxt = t("Setting-out coordinate check (horizontal / level)") + (st.contractNo ? "  |  " + t("Contract no.") + " " + st.contractNo : "");
  const topH = Math.max(19, projLines.length * projLH + 3.2 + 8);
  const fullBottom = hy + topH + bandH + ctrlRowH, compactBottom = hy + bandH;
  const drawHeader = (pageNo) => {
    doc.setLineWidth(0.25); doc.setDrawColor(...LINE);
    const bw0 = W - 2 * M;
    if (pageNo === 1) {
      doc.setFillColor(255, 255, 255); doc.rect(M, hy, bw0, topH, "FD");
      doc.line(M + cellLW, hy, M + cellLW, hy + topH); doc.line(W - M - cellLW, hy, W - M - cellLW, hy + topH);
      const fitLogo = (img, cx) => { if (!img) return; const [w, h] = imgSize(doc, img, cellLW - 2 * pad - 2, topH - 2 * pad); if (w) doc.addImage(img, "PNG", cx - w / 2, hy + (topH - h) / 2, w, h); };
      fitLogo(L, M + cellLW / 2); fitLogo(R, W - M - cellLW / 2);
      const total = projLines.length * projLH + 1.8 + 2.6, y0 = hy + (topH - total) / 2 + projFs * mmPerPt * 0.8;
      doc.setFont("helvetica", "bold"); doc.setFontSize(projFs); doc.setTextColor(...NAVY);
      projLines.forEach((line, i) => doc.text(line, W / 2, y0 + i * projLH, { align: "center" }));
      doc.setFont("helvetica", "normal"); doc.setFontSize(6.8); doc.setTextColor(...MUTED);
      doc.text(doc.splitTextToSize(subTxt, midW - 6)[0], W / 2, y0 + (projLines.length - 1) * projLH + 4.6, { align: "center" });
    }
    const by = pageNo === 1 ? hy + topH : hy;
    doc.setFillColor(...NAVY); doc.rect(M, by, bw0, bandH, "F");
    doc.setFillColor(...ACC); doc.rect(M, by, 2.2, bandH, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(255, 255, 255); doc.setCharSpace(0.7);
    doc.setCharSpace(0);
    const ttl = reportTitle.toUpperCase(), tracking = 0.7, ttlW = doc.getTextWidth(ttl) + (ttl.length - 1) * tracking;
    doc.setCharSpace(tracking);
    doc.text(ttl, pageNo === 1 ? W / 2 - ttlW / 2 : M + 6, by + bandH / 2 + 1.5);
    doc.setCharSpace(0);
    if (pageNo !== 1 && ctrl.length) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.2); doc.setTextColor(200, 210, 218);
      doc.text(ctrl.map(([k, v]) => k === t("Revision") ? `${k} ${v}` : v).join("  |  "), W - M - 3, by + bandH / 2 + 1.2, { align: "right" });
    }
    if (pageNo === 1 && ctrl.length) {
      const cy = by + bandH;
      doc.setFillColor(...SOFT); doc.setDrawColor(...LINE); doc.rect(M, cy, bw0, ctrlH, "FD");
      const cells = ctrl.map(([k, v]) => { const kt = k.toUpperCase(); doc.setFont("helvetica", "bold"); doc.setFontSize(6); const kw = doc.getTextWidth(kt) + kt.length * 0.3; return { kt, kw, v: String(v), fs: 8.2 }; });
      const natural = cl => { doc.setFont("helvetica", "bold"); doc.setFontSize(cl.fs); return 3 + cl.kw + 3 + doc.getTextWidth(cl.v) + 4; };
      let tot = cells.reduce((a, cl) => a + natural(cl), 0);
      while (tot > bw0 && cells[0].fs > 5.5) { cells.forEach(cl => { if (cl.v.length > 12) cl.fs = Math.max(5.5, cl.fs - 0.2); }); tot = cells.reduce((a, cl) => a + natural(cl), 0); }
      const extra = Math.max(0, bw0 - tot) / cells.length;
      let cx = M;
      cells.forEach((cl, i) => {
        const w = natural(cl) + extra; if (i) doc.line(cx, cy + 1, cx, cy + ctrlH - 1);
        doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.setTextColor(...MUTED); doc.setCharSpace(0.3); doc.text(cl.kt, cx + 3, cy + ctrlH / 2 + 1);
        doc.setCharSpace(0); doc.setFontSize(cl.fs); doc.setTextColor(...NAVY); doc.text(cl.v, cx + 3 + cl.kw + 3, cy + ctrlH / 2 + 1.2);
        cx += w;
      });
    }
    doc.setLineWidth(0.2);
  };
  const headerBottom = fullBottom, contBottom = compactBottom;
  let y = headerBottom + 4;
  const newPage = () => { doc.addPage(); y = contBottom + 8; };
  const useH = c.type !== "V", useV = c.type !== "H";

  /* ---- Result banner (cover block) ---- */
  const ov = s.overall;
  const word = ov === "PASS" ? "PASS" : ov === "FAIL" ? "FAIL" : ov === "CHECK" ? "CHECK" : t("INCOMPLETE");
  const bannerH = 18, bw = W - 2 * M;
  doc.setFillColor(...STTINT[ov]); doc.roundedRect(M, y, bw, bannerH, 1.8, 1.8, "F");
  doc.setFillColor(...STCOL[ov]); doc.roundedRect(M, y, 2.6, bannerH, 1.3, 1.3, "F"); doc.rect(M + 1.3, y, 1.3, bannerH, "F");
  caps(t("Result"), M + 7, y + 5.2, { color: MUTED, size: 6.5 });
  doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(...STCOL[ov]); doc.text(word, M + 7, y + 13.2);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.6); doc.setTextColor(...NAVY);
  const sentW = land ? 92 : 70;
  doc.text(doc.splitTextToSize(localizedOverallText(s).replace(/·/g, "-"), sentW).slice(0, 2), M + 7, y + 18);
  const tiles = [[String(s.n), t("Points")], [String(s.pass + s.marg), t("Pass")], [String(s.fail), t("Fail")]];
  if (s.check) tiles.push([String(s.check), t("To check")]);
  if (s.H) tiles.push([s.H.max.toFixed(1), `${t("Max radial")} mm (${s.H.maxPt || "-"})`]);
  if (s.H && land) tiles.push([s.H.rms.toFixed(1), `${t("RMS radial")} mm`]);
  if (s.V) tiles.push([sgn(s.V.max), `${t("Max dZ")} mm (${s.V.maxPt || "-"})`]);
  const shown = tiles.slice(0, land ? 6 : 4), tx0 = M + 7 + sentW + 4, tw2 = (M + bw - 3 - tx0) / shown.length;
  shown.forEach(([v, lb], i) => {
    const tx = tx0 + i * tw2;
    if (i) { doc.setDrawColor(...STCOL[ov]); doc.setLineWidth(0.15); doc.line(tx, y + 4, tx, y + bannerH - 4); }
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(...NAVY); doc.text(v, tx + tw2 / 2, y + 11.2, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(5.8); doc.setTextColor(...MUTED); doc.text(doc.splitTextToSize(lb.toUpperCase(), tw2 - 2).slice(0, 2), tx + tw2 / 2, y + 15.6, { align: "center" });
  });
  doc.setLineWidth(0.2);
  y += bannerH + 6;

  /* ---- Check details (label / value pairs, hairline rows) ---- */
  caps(t("Check details"), M, y); y += 2;
  const D = (a, b) => [{ content: a.toUpperCase(), styles: { fontStyle: "bold", fontSize: 6.2, textColor: MUTED, valign: "middle" } }, { content: String(b || "-").replace(/\u2212/g, "-"), styles: { fontSize: 8, textColor: NAVY, fontStyle: "bold" } }];
  const det = [
    [...D(t("Ref. no."), ref), ...D(t("Date"), c.date)],
    [...D(t("RFI no."), rfiFull(c)), ...D(t("Team"), c.team)],
    [...D(t("Structure"), c.structure), ...D(t("Chainage / location"), locationText(c))],
    [...D(t("Element / description"), c.element), ...D(t("Check type"), t(typeText(c.type)))],
    [...D(t("Tolerance"), tolText(c)), ...D(t("Coordinate system"), c.coord)],
    [...D(t("Tolerance source"), c.tolSource), ...(ro.instrument ? D(t("Instrument / S/N"), [c.instModel, c.instSerial && "S/N " + c.instSerial].filter(Boolean).join("  ")) : ["", ""])],
  ];
  if (ro.instrument) {
    det.push([...D(t("Station / backsight"), [c.ctlStn, c.ctlBs].filter(Boolean).join("  /  ")), ...D(t("Calibration date"), c.instCalib)]);
    if (c.type !== "H") det.push([...D(t("BM / TBM used"), c.bm), ...D("", "")]);
  }
  doc.autoTable({ startY: y, body: det, theme: "plain", margin: { left: M, right: M, top: contBottom + 8 },
    styles: { fontSize: 8, cellPadding: { top: 0.8, bottom: 0.8, left: 1, right: 2 }, textColor: NAVY, lineColor: LINE, lineWidth: { bottom: 0.15 } },
    columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: "auto" }, 2: { cellWidth: 30 }, 3: { cellWidth: "auto" } } });
  y = doc.lastAutoTable.finalY + 5;

  /* ---- Results table ---- */
  if (y > contentBottom - 40) newPage();
  caps(t("Results"), M, y); y += 2;
  const head1 = [{ content: t("No"), rowSpan: 2 }, { content: t("Point"), rowSpan: 2 }];
  const head2 = [];
  if (useH && useV) { head1.push({ content: t("Design"), colSpan: 3 }, { content: t("Measured"), colSpan: 3 }, { content: t("Offset (mm)"), colSpan: 4 }); head2.push("E (X)", "N (Y)", "RL", "E (X)", "N (Y)", "RL", "dE", "dN", t("Radial"), "dZ"); }
  else if (useH) { head1.push({ content: t("Design"), colSpan: 2 }, { content: t("Measured"), colSpan: 2 }, { content: t("Offset (mm)"), colSpan: 3 }); head2.push("E (X)", "N (Y)", "E (X)", "N (Y)", "dE", "dN", t("Radial")); }
  else { head1.push({ content: t("Design"), colSpan: 1 }, { content: t("Measured"), colSpan: 1 }, { content: t("Offset"), colSpan: 1 }); head2.push("RL", "RL", "dZ (mm)"); }
  head1.push({ content: t("Result"), rowSpan: 2 }, { content: t("Remarks"), rowSpan: 2 });
  const o1 = v => v == null ? "-" : sgn(v);
  const body = rs.map(({ p, r }, i) => {
    const row = [i + 1, p.name || "-"];
    if (useH) row.push(f3(p.dE), f3(p.dN)); if (useV) row.push(f3(p.dZ));
    if (useH) row.push(f3(p.mE), f3(p.mN)); if (useV) row.push(f3(p.mZ));
    if (useH) row.push(o1(r.h?.dx), o1(r.h?.dy), r.h?.rad != null ? r.h.rad.toFixed(1) : "-");
    if (useV) row.push(o1(r.v?.dz));
    row.push(LABEL[r.st] === "PASS (marginal)" ? "PASS*" : LABEL[r.st], localizedRemark(p, r));
    return row;
  });
  const nCols = body[0]?.length || head2.length + 4, resCol = nCols - 2;
  const lab2st = { PASS: "PASS", "PASS*": "MARG", FAIL: "FAIL", CHECK: "CHECK", PENDING: "INC" };
  const colSt = { 0: { cellWidth: 7, halign: "center", textColor: MUTED }, 1: { fontStyle: "bold" }, [resCol]: { fontStyle: "bold", halign: "center", cellWidth: 15 }, [nCols - 1]: { cellWidth: "auto", fontSize: 6.8, textColor: MUTED } };
  for (let k = 2; k < resCol; k++) colSt[k] = { halign: "right", font: "courier", fontSize: land ? 7.2 : (useH && useV ? 6.8 : 6.9), cellPadding: { top: 1, bottom: 1, left: 0.6, right: 1 } };
  const rowSt = rs.map(x => x.r.st);
  doc.autoTable({ startY: y, head: [head1, head2], body, theme: "plain", margin: { left: M, right: M, top: contBottom + 8, bottom: 18 },
    styles: { fontSize: 7.4, cellPadding: { top: 1, bottom: 1, left: 1.1, right: 1.1 }, lineColor: LINE, lineWidth: { bottom: 0.12 }, textColor: NAVY, overflow: "linebreak", valign: "middle" },
    headStyles: { fillColor: NAVY, textColor: 255, halign: "center", valign: "middle", fontSize: 7.2, fontStyle: "bold", lineWidth: 0 },
    alternateRowStyles: { fillColor: [250, 251, 252] },
    columnStyles: colSt,
    didParseCell: d => {
      if (d.section !== "body") return;
      const st0 = rowSt[d.row.index];
      if ((st0 === "FAIL" || st0 === "CHECK") && d.column.index !== resCol) d.cell.styles.fillColor = [255, 248, 248];
      if (d.column.index === resCol) { const k = lab2st[d.cell.raw]; if (k) { d.cell.styles.fillColor = STTINT[k]; d.cell.styles.textColor = STCOL[k]; } }
    },
    didDrawCell: d => {
      if (d.section === "body" && d.column.index === 0 && (rowSt[d.row.index] === "FAIL" || rowSt[d.row.index] === "CHECK")) { doc.setFillColor(...STCOL[rowSt[d.row.index]]); doc.rect(d.cell.x - 0.0, d.cell.y, 0.9, d.cell.height, "F"); }
    }
  });
  y = doc.lastAutoTable.finalY + 3;
  doc.setFontSize(6.6); doc.setTextColor(...MUTED); doc.setFont("helvetica", "normal");
  const fn = [];
  if (useH) fn.push(t("dE = Measured E - Design E, dN = Measured N - Design N, Radial = sqrt(dE^2 + dN^2)"));
  if (useV) fn.push(t("dZ = Measured RL - Design RL (+ high / - low)"));
  fn.push(S.cfg.language === "ms" ? `LULUS* = dalam toleransi tetapi melebihi ${num(S.cfg.marg) || 80}% daripadanya. Koordinat dalam meter, sisihan dalam mm.` : `PASS* = within tolerance but over ${num(S.cfg.marg) || 80}% of it. Coordinates in metres, offsets in mm.`);
  const fnLines = doc.splitTextToSize(fn.join(". "), W - 2 * M);
  if (y + 2.5 + (fnLines.length - 1) * 2.8 + 0.6 > contentBottom) newPage();
  doc.text(fnLines, M, y + 2.5); y += 3 + fnLines.length * 2.8 + 3;

  const drawNotice = () => {
  const notice = t("Checking aid only: this report is generated from user-provided inputs and is not acceptance or certification. The user is responsible for independently verifying source data, point identity, units, coordinate and vertical datums, tolerances and results against approved project documents and field observations before use.");
    doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    const noticeLines = doc.splitTextToSize(notice, W - 2 * M - 10), noticeH = noticeLines.length * 2.9 + 5;
    if (y + noticeH > contentBottom) newPage();
    doc.setFillColor(...SOFT); doc.roundedRect(M, y, W - 2 * M, noticeH, 1.2, 1.2, "F");
    doc.setFillColor(...ACC); doc.rect(M, y + 1, 0.9, noticeH - 2, "F");
    doc.setTextColor(...MUTED); doc.text(noticeLines, M + 5, y + 4); y += noticeH + 6;
  };
  /* ---- Error distribution: plan plot, level chart and statistics ---- */
  if ((useH && ro.plan) || (useV && ro.plots)) {
    const planPointCount = useH && ro.plan ? rs.filter(x => x.r.h && x.r.h.rad != null).length : 0;
    const planLarge = planPointCount > 16;
    let plotH = planLarge ? Math.min(165, PH - contBottom - 40) : land ? 80 : 84;
    if (planLarge || contentBottom - y - 10 < Math.min(plotH, 58)) newPage();
    caps(t("Point error distribution"), M, y); y += 3;
    const room = contentBottom - y - 4; if (plotH > room) plotH = Math.max(50, room);
    let px = M;
    const hasPlan = useH && ro.plan, hasLevel = useV && ro.plots;
    if (hasPlan) {
      const cv = document.createElement("canvas"); cv.width = planLarge ? 1800 : 1100; cv.height = cv.width; drawTarget(cv, rs, tolNum(c.tolH));
      doc.addImage(cv.toDataURL("image/png"), "PNG", px, y, plotH, plotH); doc.setDrawColor(...LINE); doc.rect(px, y, plotH, plotH); px += plotH + 6;
    }
    if (hasLevel) {
      const cv = document.createElement("canvas"); drawLevel(cv, rs, tolNum(c.tolVPos, tolNum(c.tolV)), tolNum(c.tolVNeg, tolNum(c.tolV)), 900);
      const ar = cv.height / cv.width; let w = hasPlan ? Math.min(W - M - px - 52, plotH * 1.3) : Math.min(W - 2 * M - 56, 120), h = w * ar;
      if (h > plotH) { h = plotH; w = h / ar; }
      doc.addImage(cv.toDataURL("image/png"), "PNG", px, y, w, h); doc.setDrawColor(...LINE); doc.rect(px, y, w, h); px += w + 6;
    }
    const sx = px, sw = W - M - sx;
    if (ro.plots && sw > 36) {
      const rows = [];
      const grp = (name) => rows.push([{ content: name.toUpperCase(), colSpan: 2, styles: { fontStyle: "bold", fontSize: 6.4, textColor: ACC, cellPadding: { top: 2.4, bottom: 0.8, left: 0, right: 0 }, lineWidth: 0 } }]);
      const kv = (k, v) => rows.push([k, { content: v, styles: { halign: "right", fontStyle: "bold" } }]);
      grp(t("Summary")); kv(t("Points"), String(s.n)); kv(t("Pass"), `${s.pass + s.marg}${s.marg ? ` (${s.marg} ${t("marginal")})` : ""}`); kv(t("Fail"), String(s.fail));
      if (s.check) kv(t("To check"), String(s.check)); if (s.inc) kv(t("Pending"), String(s.inc));
      if (s.H) { grp(t("Horizontal (mm)")); kv(t("Max radial"), `${s.H.max.toFixed(1)} (${s.H.maxPt})`); kv(t("Mean radial"), s.H.mean.toFixed(1)); kv(t("RMS radial"), s.H.rms.toFixed(1)); kv(t("Mean shift dE/dN"), `${sgn(s.H.mdx)} / ${sgn(s.H.mdy)}`); }
      if (s.V) { grp(t("Level (mm)")); kv(t("Max dZ"), `${sgn(s.V.max)} (${s.V.maxPt})`); kv(t("Mean dZ"), sgn(s.V.mean)); kv(t("RMS dZ"), s.V.rms.toFixed(1)); }
      doc.autoTable({ startY: y, body: rows, theme: "plain", margin: { left: sx, right: M, top: y, bottom: 18 }, tableWidth: sw,
        styles: { fontSize: 7.6, cellPadding: { top: 1.1, bottom: 1.1, left: 0, right: 0 }, textColor: NAVY, lineColor: LINE, lineWidth: { bottom: 0.1 } }, columnStyles: { 0: { textColor: MUTED } } });
    }
    y += plotH + 8;
  }

  /* ---- Notes ---- */
  if (ro.notes && (c.notes || "").trim()) {
    const nl = doc.splitTextToSize(c.notes.trim(), W - 2 * M);
    if (y + 10 + nl.length * 3.6 > contentBottom) newPage();
    caps(t("Notes"), M, y + 2); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...NAVY); doc.text(nl, M, y + 7); y += 11 + nl.length * 3.6;
  }

  /* ---- Sign-off: prepared / checked boxes and QR ---- */
  if (ro.signoff) {
    const so = 30;
    if (y + so + 4 > contentBottom) newPage();
    caps(t("SIGN-OFF"), M, y + 1); y += 4;
    const qrSize = appUrl ? 24 : 0, gapX = 6, boxW = (W - 2 * M - qrSize - (appUrl ? gapX : 0) - gapX) / 2;
    const who = (x, label, name, desig, team) => {
      doc.setDrawColor(...LINE); doc.setFillColor(255, 255, 255); doc.roundedRect(x, y, boxW, so - 4, 1.2, 1.2, "FD");
      caps(label, x + 3, y + 4.6, { color: MUTED, size: 6.2 });
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...NAVY); doc.text(displayInitials(name) || "-", x + 3, y + 10);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.2); doc.setTextColor(...MUTED); doc.text([desig, team && `(${team})`].filter(Boolean).join(" ") || "-", x + 3, y + 14);
      doc.setDrawColor(...MUTED); doc.setLineWidth(0.15); doc.line(x + 3, y + so - 10, x + boxW - 3, y + so - 10); doc.setLineWidth(0.2);
      doc.setFontSize(5.8); doc.text(t("Signature (optional)").toUpperCase() + "   ·   " + (c.date || "-"), x + 3, y + so - 7);
    };
    who(M, t("Prepared by"), c.name, c.desig, c.team);
    who(M + boxW + gapX, t("Checked by"), c.checker, c.checkerDesig, c.checkerTeam);
    if (appUrl) {
      const qr = qrcode(0, "M"); qr.addData(appUrl); qr.make();
      const modules = qr.getModuleCount(), quiet = 2, cell = qrSize / (modules + quiet * 2), qx = W - M - qrSize, qy = y - 1;
      doc.setFillColor(...NAVY);
      for (let r = 0; r < modules; r++) for (let col = 0; col < modules; col++) if (qr.isDark(r, col)) doc.rect(qx + (col + quiet) * cell, qy + (r + quiet) * cell, cell, cell, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); doc.setTextColor(...MUTED); doc.text(t("Scan to open the app"), qx + qrSize / 2, qy + qrSize + 1.5, { align: "center" });
    }
    y += so;
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...MUTED);
    doc.text(t("Generated document — no signature required. Physical signatures may be added after printing if required."), M, y); y += 4;
  }

  drawNotice();

  /* ---- Photos (appendix) ---- */
  if (ro.photos && c.photos.length) {
    const perPage = Number(S.cfg.photoPerPage) === 4 ? 4 : 2;
    const gap = 7, contentTop = contBottom + 14, pBottom = PH - 18;
    const captionH = 11, pad = 3, capGap = 3;
    const grid = (() => {
      if (perPage === 4) return { cols: 2, rows: 2 };
      let pr = null; try { pr = doc.getImageProperties(c.photos[0].src); } catch { }
      const ar = pr && pr.width && pr.height ? pr.width / pr.height : 4 / 3;
      const availW = W - 2 * M, availH = pBottom - contentTop - 3;
      const stkCardH = (availH - gap) / 2;
      const sbsW = Math.min((availW - gap) / 2 - pad * 2, (availH - captionH - capGap - pad * 2) * ar);
      const stkW = Math.min(availW - pad * 2, (stkCardH - captionH - capGap - pad * 2) * ar);
      return stkW > sbsW ? { cols: 1, rows: 2 } : { cols: 2, rows: 1 };
    })();
    const cols = grid.cols, rows = grid.rows;
    const cellW = (W - 2 * M - gap * (cols - 1)) / cols;
    const cellH = (pBottom - contentTop - 3 - gap * (rows - 1)) / rows;
    for (let i = 0; i < c.photos.length; i += perPage) {
      doc.addPage();
      caps(`${t("Site photos")}  (${i + 1}-${Math.min(i + perPage, c.photos.length)} / ${c.photos.length})`, M, contentTop - 4);
      c.photos.slice(i, i + perPage).forEach((p, j) => {
        const col = j % cols, row = Math.floor(j / cols), x = M + col * (cellW + gap), top = contentTop + 3 + row * (cellH + gap);
        const [w, h] = imgSize(doc, p.src, cellW - pad * 2, cellH - captionH - capGap - pad * 2);
        const cardW = cellW, cardH = w > 0 && h > 0 ? h + captionH + capGap + pad * 2 : cellH;
        doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.rect(x, top, cardW, cardH);
        if (w > 0 && h > 0) doc.addImage(p.src, "JPEG", x + (cardW - w) / 2, top + pad, w, h);
        doc.setDrawColor(...LINE); doc.line(x, top + cardH - captionH, x + cardW, top + cardH - captionH);
        doc.setFont("helvetica", "bold"); doc.setFontSize(7.2); doc.setTextColor(...ACC); doc.text(`${t("Photo")} ${i + j + 1}${p.pt ? "  -  " + t("Point") + " " + p.pt : ""}`, x + pad, top + cardH - captionH + 4);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...NAVY);
        const caption = doc.splitTextToSize(p.cap || "", cardW - pad * 2).slice(0, 2);
        if (caption.length) doc.text(caption, x + pad, top + cardH - captionH + 8);
      });
    }
  }

  /* ---- Header / footer on every page ---- */
  const n = doc.getNumberOfPages();
  const reportDate = new Date().toLocaleString(S.cfg.language === "ms" ? "ms-MY" : "en-GB");
  const fy = PH - 13, fh = 7, fw = W - 2 * M, segs = [0.27, 0.23, 0.36, 0.14];
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); drawHeader(i);
    doc.setFillColor(...SOFT); doc.setDrawColor(...LINE); doc.setLineWidth(0.25); doc.rect(M, fy, fw, fh, "FD");
    let x = M; const cx = [];
    segs.forEach((f, k) => { cx.push([x, f * fw]); x += f * fw; if (k < segs.length - 1) doc.line(x, fy + 1.2, x, fy + fh - 1.2); });
    const ty = fy + fh / 2 + 1.1;
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.8); doc.setTextColor(...NAVY); doc.text(ref, cx[0][0] + 3, ty);
    doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED); doc.text(reportDate, cx[1][0] + 3, ty);
    doc.setFontSize(6.2); doc.text(`${APP_CREDIT} (v${APP_VERSION})`, cx[2][0] + cx[2][1] / 2, ty, { align: "center" });
    doc.setFontSize(6.8); doc.setFont("helvetica", "bold"); doc.setTextColor(...NAVY); doc.text(`${t("Page")} ${i} ${t("of")} ${n}`, cx[3][0] + cx[3][1] - 3, ty, { align: "right" });
    doc.setLineWidth(0.2);
  }
  doc.setProperties({ title: `${reportTitle} ${ref}`, subject: st.projectTitle || "", author: "", creator: APP_CREDIT });
  return { blob: doc.output("blob"), name: safeName(`${ref}_SetOutCheck${c.element ? "_" + c.element.slice(0, 30) : ""}.pdf`) };
}

/* ---------------- Excel export (WP12 template layout + RL) ---------------- */
async function buildXlsx(blank) {
  await loadXlsx();
  const c = S.check, rs = blank ? [] : results();
  const ws = {}, S_ = v => ({ t: "s", v: String(v ?? "") }), N_ = v => ({ t: "n", v });
  const set = (a, cell) => { ws[a] = cell; };
  set("A1", S_(t("Checking template"))); set("K1", S_(t("Coordinate System (RSO/UTM):"))); set("L1", S_(blank ? (S.setup.coordSystems || [""])[0] : c.coord));
  set("I2", S_(t("Date:"))); set("J2", S_(blank ? "" : c.date)); set("K2", S_(t("Horizontal Tolerance (mm):"))); set("L2", N_(blank ? 25 : (num(c.tolH) ?? 25)));
  set("N2", S_(t("Vertical tolerance (+ mm):"))); set("P2", N_(blank ? 25 : (num(c.tolVPos) ?? num(c.tolV) ?? 25)));
  set("Q2", S_(t("Vertical tolerance (− mm):"))); set("R2", N_(blank ? 25 : (num(c.tolVNeg) ?? num(c.tolV) ?? 25)));
  const h3 = { A3: "No.", B3: "Point", C3: "Design coordinates", E3: "Measured coordinates", G3: "Offset (mm)", J3: "Remarks", K3: "X-value:", L3: "Easting", M3: "Level (RL)", Q3: "Remarks (app)" };
  const h4 = { C4: "X-value", D4: "Y-value", E4: "X-value", F4: "Y-value", G4: "X offset", H4: "Y offset", I4: "Eccentricity", K4: "Y-value:", L4: "Northing", M4: "Design RL", N4: "Measured RL", O4: "dZ (mm)", P4: "Level result" };
  Object.entries({ ...h3, ...h4 }).forEach(([a, v]) => set(a, S_(t(v))));
  const n = blank ? 40 : Math.max(rs.length, 1);
  for (let i = 0; i < n; i++) {
    const R = 5 + i, x = rs[i], p = x?.p || {}, r = x?.r || {};
    const tH = num(p.tolH) != null ? num(p.tolH) : "$L$2";
    const tVPos = num(p.tolVPos) ?? num(p.tolV) ?? "$P$2", tVNeg = num(p.tolVNeg) ?? num(p.tolV) ?? "$R$2";
    set("A" + R, N_(i + 1)); if (p.name) set("B" + R, S_(p.name));
    [["C", "dE"], ["D", "dN"], ["E", "mE"], ["F", "mN"], ["M", "dZ"], ["N", "mZ"]].forEach(([col, f]) => { const v = num(p[f]); if (v != null) set(col + R, N_(v)); });
    const hv = r.h && r.h.rad != null, vv = r.v && r.v.dz != null;
    set("G" + R, { t: hv ? "n" : "s", v: hv ? r.h.dx : "", f: `IF(AND(C${R}<>"",E${R}<>""),ROUND((E${R}-C${R})*1000,1),"")` });
    set("H" + R, { t: hv ? "n" : "s", v: hv ? r.h.dy : "", f: `IF(AND(D${R}<>"",F${R}<>""),ROUND((F${R}-D${R})*1000,1),"")` });
    set("I" + R, { t: hv ? "n" : "s", v: hv ? r.h.rad : "", f: `IF(AND(C${R}<>"",E${R}<>""),ROUND(SQRT(G${R}^2+H${R}^2),1),"")` });
    set("J" + R, { t: "s", v: hv ? (r.h.rad <= r.tH ? "PASS" : "FAIL") : "", f: `IF(I${R}="","",IF(I${R}<=${tH},"PASS","FAIL"))` });
    set("O" + R, { t: vv ? "n" : "s", v: vv ? r.v.dz : "", f: `IF(AND(M${R}<>"",N${R}<>""),ROUND((N${R}-M${R})*1000,1),"")` });
    set("P" + R, { t: "s", v: vv ? (Math.abs(r.v.dz) <= r.v.limit ? "PASS" : "FAIL") : "", f: `IF(O${R}="","",IF(O${R}<0,IF(ABS(O${R})<=${tVNeg},"PASS","FAIL"),IF(O${R}<=${tVPos},"PASS","FAIL")))` });
    if (x) set("Q" + R, S_(localizedRemark(p, r)));
  }
  ws["!ref"] = `A1:R${4 + n}`;
  ws["!merges"] = [{ s: { r: 2, c: 2 }, e: { r: 2, c: 3 } }, { s: { r: 2, c: 4 }, e: { r: 2, c: 5 } }, { s: { r: 2, c: 6 }, e: { r: 2, c: 8 } }, { s: { r: 2, c: 12 }, e: { r: 2, c: 15 } }];
  ws["!cols"] = [5, 12, 14, 14, 14, 14, 9, 9, 12, 9, 26, 22, 12, 12, 9, 11, 40, 14].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  if (!blank) {
    const info = [[t("Setting-out check")],     [t("Project"), S.setup.projectTitle || S.setup.projectCode], [t("Ref. no."), ensureRef()], [t("Revision"), (c.rev || "").trim() || "0"], [t("Date"), c.date], [t("RFI no."), rfiFull(c)], [t("Team"), c.team], [t("Surveyed by (initials)"), displayInitials(c.name)], [t("Designation"), c.desig], [t("Checked by (initials)"), displayInitials(c.checker)],
      [t("Structure"), c.structure], [t("Chainage / location"), locationText(c)], [t("Element"), c.element], [t("Check type"), t(typeText(c.type))], [t("Tolerance"), tolText(c)], [t("Tolerance source"), c.tolSource],
      [t("Coordinate system"), c.coord], [t("Instrument"), c.instModel], [t("Serial no."), c.instSerial], [t("Calibration date"), c.instCalib], [t("Station"), c.ctlStn], [t("Backsight"), c.ctlBs], [t("BM / TBM"), c.bm], [t("Notes"), c.notes], [t("Checker designation"), c.checkerDesig], [t("Generated document"), t("Generated document — no signature required. Physical signatures may be added after printing if required.")], [t("Result"), localizedOverallText(summary(rs))], [], [t("Verification notice"), t("Checking aid only; not acceptance or certification. Independently verify source data, point identity, units, coordinate and vertical datums, approved tolerances and results against project documents and field observations before use.")], [], [t("Generated by"), `${APP_CREDIT}, v${APP_VERSION}`]];
    const ws2 = XLSX.utils.aoa_to_sheet(info); ws2["!cols"] = [{ wch: 20 }, { wch: 60 }]; XLSX.utils.book_append_sheet(wb, ws2, t("Details"));
  }
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return { blob: new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), name: blank ? `${safeName(S.setup.projectCode || "")}_Survey_Checking_Template.xlsx` : safeName(`${c.ref || "check"}_SetOutCheck.xlsx`) };
}
function buildCsv() {
  const c = S.check, rs = results();
  const q = v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const headers = ["No", "Point", "Design E", "Design N", "Design RL", "Measured E", "Measured N", "Measured RL", "dE (mm)", "dN (mm)", "Radial (mm)", "dZ (mm)", "Tol H radial (mm)", "Tol RL upper + (mm)", "Tol RL lower - (mm)", "Result", "Remarks"];
  const rows = [headers.map(t)];
  rs.forEach(({ p, r }, i) => rows.push([i + 1, p.name, p.dE, p.dN, p.dZ, p.mE, p.mN, p.mZ, r.h?.dx ?? "", r.h?.dy ?? "", r.h?.rad ?? "", r.v?.dz ?? "", r.useH ? r.tH : "", r.useV ? r.tVPos : "", r.useV ? r.tVNeg : "", t(LABEL[r.st]), localizedRemark(p, r)]));
  const txt = "\ufeff" + rows.map(r => r.map(q).join(",")).join("\r\n");
  return { blob: new Blob([txt], { type: "text/csv" }), name: safeName(`${c.ref || "check"}_points.csv`) };
}
function waText() {
  const c = S.check, rs = results(), s = summary(rs);
  const L = [`*${t("Set-out check")}* - ${c.ref || "(no ref yet)"}`];
  if (c.rfi) L.push(`${t("RFI")}: ${rfiFull(c)}`);
  const where = [c.structure, c.element, locationText(c)].filter(Boolean).join(" · "); if (where) L.push(where);
  L.push(`${t(typeText(c.type))} · ${t("tol")} ${tolText(c)}`);
  L.push(`*${t("Result")}: ${localizedOverallText(s)}*`);
  if (s.H) L.push(`${t("Max radial")} ${s.H.max.toFixed(1)} mm (${s.H.maxPt}) · ${t("RMS")} ${s.H.rms.toFixed(1)} mm`);
  if (s.V) L.push(`${t("Max ΔZ")} ${sgn(s.V.max)} mm (${s.V.maxPt})`);
  rs.filter(x => x.r.st === "FAIL" || x.r.st === "CHECK").forEach(({ p, r }) => L.push(`❌ ${p.name}: ${localizedRemark(p, r)}`));
  L.push(`${t("By")} ${displayInitials(c.name)} (${c.team}), ${c.date}`);
  L.push(t("Checking aid only: the user must independently verify inputs and results against approved documents and field observations."));
  return L.join("\n");
}
/* Feedback: opens WhatsApp with a short, pre-filled message and NO recipient.
   WhatsApp then shows the chat list, so the sender picks who to send it to -
   people who know the developer will send it to them anyway. */
function feedbackUrl() {
  const c = S.check;
  const ua = navigator.userAgent || "";
  const browser = (ua.match(/(Edg|OPR|Chrome|Firefox|Safari)\/[\d.]+/) || ["-"])[0];
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iPod/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac/i.test(ua) ? "macOS" : "-";
  const msg = [
    `${APP_NAME} v${APP_VERSION} - feedback`,
    `${t("Project")}: ${S.setup.projectCode || S.pkg}`,
    `${t("Ref. no.")}: ${c.ref || "(none)"}`,
    `${t("Device")}: ${os} / ${browser}`,
    "",
    t("What happened / what would help:")
  ].join("\n");
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}
function sendFeedback() {
  window.open(feedbackUrl(), "_blank", "noopener");
  logRegister();
}

async function openShareBoard() {
  const c = S.check, rs = results(), s = summary(rs), where = [c.structure, c.element, locationText(c)].filter(Boolean).join(" · ") || t("Site check");
  const bo = { ...CFG_DEF.boardOptions, ...(S.cfg.boardOptions || {}) };
  openDlg(t("WhatsApp summary board"), `<p class="hint">${t("Preview the image and edit the caption before sharing. No point coordinates are included in the board.")}</p>
    <fieldset style="border:1px solid var(--line);border-radius:8px;margin:8px 0;padding:8px 10px"><legend class="f">${t("Board information")}</legend>
      <div class="fg">${[
        ["project", "Project and location"], ["result", "Overall result and counts"], ["metrics", "Technical summary"],
        ["attention", "Points needing attention"], ["points", "Point results table"], ["instrument", "Instrument and control details"],
        ["branding", "App QR and WPN credit"]
      ].map(([key, label]) => `<label style="display:flex;gap:8px;align-items:center;padding:4px 0"><input type="checkbox" data-boardopt="${key}" ${bo[key] ? "checked" : ""}> ${t(label)}</label>`).join("")}</div>
    </fieldset>
    <div class="qrbox" style="padding:8px"><canvas id="shareBoardCanvas" class="board-preview" width="1200" height="675" aria-label="${esc(t("Set-out check summary board"))}"></canvas></div>
    <label class="f" for="shareBoardCaption">${t("WhatsApp caption")}</label><textarea class="i" id="shareBoardCaption" rows="7">${esc(waText())}</textarea>
    <div class="row"><button class="btn primary" id="shareBoardSend">${t("Share image + caption")}</button><button class="btn" id="shareBoardSave">${t("Download PNG")}</button><button class="btn" id="shareBoardCopy">${t("Copy caption")}</button></div><div id="shareBoardStatus"></div>`);
  const cv = $("#shareBoardCanvas"), ctx = cv.getContext("2d");
  const appUrl = appShareUrl();
  if (appUrl && bo.branding) await loadScript("lib/qrcode.min.js");
  /* The board is drawn at 860 px wide with poster-scale type: WhatsApp shows the image at roughly
     390 px, so body text stays legible. Every run of text sets its own font, colour and alignment,
     and long remarks wrap onto extra lines instead of being squeezed with maxWidth. The layout is
     measured first (DRAW = false) so the canvas height always matches the content. */
  const W = 860, pad = 34, cw = W - pad * 2, MAX_ROWS = 9;
  const F = {
    kicker: "700 17px system-ui, sans-serif", proj: "800 32px system-ui, sans-serif", meta: "19px system-ui, sans-serif",
    ref: "700 22px system-ui, sans-serif", hero: "800 30px system-ui, sans-serif", num: "800 42px system-ui, sans-serif",
    cap: "700 16px system-ui, sans-serif", name: "800 24px system-ui, sans-serif", rl: "18px system-ui, sans-serif",
    rv: "700 19px system-ui, sans-serif", th: "700 17px system-ui, sans-serif", td: "600 20px system-ui, sans-serif",
    pill: "700 16px system-ui, sans-serif", body: "19px system-ui, sans-serif", small: "18px system-ui, sans-serif",
    tiny: "16px system-ui, sans-serif", value: "700 19px system-ui, sans-serif"
  };
  const px = f => parseFloat((String(f).match(/(\d+(?:\.\d+)?)px/) || [0, 20])[1]);
  const lh = f => Math.round(px(f) * 1.4);
  const wrapText = (value, font, maxW, maxLines) => {
    ctx.font = font;
    const words = String(value == null ? "" : value).split(/\s+/).filter(Boolean);
    const lines = []; let cur = "", i = 0;
    for (; i < words.length; i++) {
      const test = cur ? cur + " " + words[i] : words[i];
      if (ctx.measureText(test).width <= maxW) { cur = test; continue; }
      if (cur) { lines.push(cur); cur = words[i]; } else { lines.push(words[i]); cur = ""; }
      if (maxLines && lines.length >= maxLines) break;
    }
    if (cur && (!maxLines || lines.length < maxLines)) lines.push(cur);
    if (maxLines && lines.length >= maxLines && i < words.length) {
      let last = lines[maxLines - 1];
      while (last.length > 1 && ctx.measureText(last + "…").width > maxW) last = last.slice(0, -1);
      lines[maxLines - 1] = last + "…";
    }
    return lines.length ? lines : [""];
  };
  let DRAW = false, H = 0;
  const drawText = (value, x, y, o) => {
    const opt = o || {}, font = opt.font || F.body;
    const lines = opt.maxW ? wrapText(value, font, opt.maxW, opt.maxLines || 1) : [String(value == null ? "" : value)];
    if (DRAW) {
      ctx.font = font; ctx.fillStyle = opt.color || "#14212B"; ctx.textAlign = opt.align || "left";
      lines.forEach((line, i) => ctx.fillText(line, x, y + i * lh(font)));
    }
    return lines;
  };
  const section = (y, h) => { if (!DRAW) return; ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.roundRect(pad, y, cw, h, 12); ctx.fill(); };
  const chip = (label, color, x, baseline) => {
    ctx.font = F.th; const w = ctx.measureText(label).width + 22;
    if (DRAW) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, baseline - 17, w, 25, 12); ctx.fill();
      ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "left"; ctx.fillText(label, x + 11, baseline + 1);
    }
    return w;
  };
  const status = localizedOverallText(s);
  const statusColor = s.overall === "PASS" ? "#2B8A3E" : (s.overall === "FAIL" || s.overall === "CHECK" ? "#C92A2A" : "#C77700");
  const countsText = `${s.n} ${t("Points")}  ·  ${s.pass + s.marg} ${t("Pass")}${s.marg ? ` (${s.marg} ${t("marginal")})` : ""}  ·  ${s.fail} ${t("Fail")}${s.check ? `  ·  ${s.check} ${t("To check")}` : ""}${s.inc ? `  ·  ${s.inc} ${t("Pending")}` : ""}`;
  const metrics = [
    [t("Check type"), t(typeText(c.type))],
    [t("Date"), c.date || "-"],
    [t("Horizontal tolerance"), c.type !== "V" ? tolNum(c.tolH) + " mm radial" : "-"],
    [t("Level tolerance"), c.type !== "H" ? "+" + tolNum(c.tolVPos, tolNum(c.tolV)) + " / −" + tolNum(c.tolVNeg, tolNum(c.tolV)) + " mm" : "-"],
    [t("Max radial / RMS"), s.H ? `${s.H.max.toFixed(1)} / ${s.H.rms.toFixed(1)} mm` : "-"],
    [t("Max / mean / RMS ΔZ"), s.V ? `${sgn(s.V.max)} / ${sgn(s.V.mean)} / ${s.V.rms.toFixed(1)} mm` : "-"],
    [t("Mean shift"), s.H ? `ΔE ${sgn(s.H.mdx)} / ΔN ${sgn(s.H.mdy)} mm` : "-"],
    [t("Tolerance source"), c.tolSource || "-"]
  ];
  const attItems = rs.filter(({ r }) => r.st !== "PASS").map(({ p, r }) => ({
    name: p.name || "-", label: LABEL[r.st] === "PASS (marginal)" ? "PASS*" : LABEL[r.st], color: STC[r.st] || "#5F6B76",
    nums: [r.h && r.h.rad != null ? `${t("Radial")} ${r.h.rad.toFixed(1)} mm` : "", r.h && r.h.dx != null ? `ΔE ${sgn(r.h.dx)}` : "", r.h && r.h.dy != null ? `ΔN ${sgn(r.h.dy)}` : "", r.v && r.v.dz != null ? `ΔZ ${sgn(r.v.dz)}` : ""].filter(Boolean).join(" · "),
    remark: localizedRemark(p, r) || ""
  }));
  const colX = { name: 24, dx: 262, dy: 372, rad: 500, dz: 610, res: 636 };
  const colLabels = [t("Point"), "ΔE mm", "ΔN mm", t("Radial mm"), "ΔZ mm", t("Result")];
  const INK = "#14212B", MUTED = "#5F6B76", LINE = "#E1E7EC", ACC = "#CF4409";
  const stText = r => LABEL[r.st] === "PASS (marginal)" ? "PASS*" : LABEL[r.st];
  const card = (y, h, rail) => {
    if (!DRAW) return;
    ctx.save(); ctx.shadowColor = "rgba(20,33,43,.10)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.roundRect(pad, y, cw, h, 18); ctx.fill(); ctx.restore();
    ctx.strokeStyle = LINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(pad + .5, y + .5, cw - 1, h - 1, 18); ctx.stroke();
    if (rail) { ctx.save(); ctx.beginPath(); ctx.roundRect(pad, y, cw, h, 18); ctx.clip(); ctx.fillStyle = rail; ctx.fillRect(pad, y, 9, h); ctx.restore(); }
  };
  const cap = (txt, x, y) => drawText(String(txt).toUpperCase(), x, y, { font: F.kicker, color: MUTED });
  const hline = (x1, x2, y) => { if (!DRAW) return; ctx.strokeStyle = LINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x1, y + .5); ctx.lineTo(x2, y + .5); ctx.stroke(); };
  const pill = (label, color, x, cy, rightAlign) => {
    ctx.font = F.pill; const w = Math.ceil(ctx.measureText(label).width) + 22, x0 = rightAlign ? x - w : x;
    if (DRAW) {
      ctx.save(); ctx.globalAlpha = .14; ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x0, cy - 14, w, 28, 14); ctx.fill(); ctx.restore();
      ctx.font = F.pill; ctx.fillStyle = color; ctx.textAlign = "left"; ctx.fillText(label, x0 + 11, cy + 6);
    }
    return w;
  };
  const MAX_ATT = 6, attShown = attItems.slice(0, MAX_ATT), attMore = attItems.length - attShown.length;
  const render = () => {
    let y = 0;
    const projectLines = bo.project ? wrapText(S.setup.projectTitle || S.setup.projectCode || APP_NAME, F.proj, cw, 2) : [];
    const whereLines = bo.project ? wrapText([c.rfi ? rfiFull(c) : "", where].filter(Boolean).join("  ·  "), F.meta, cw, 2) : [];
    const projLH = Math.round(px(F.proj) * 1.25), whereLH = lh(F.meta);
    let hy = 86;
    const projTop = hy + 4; hy = projTop + (projectLines.length ? projectLines.length * projLH : 0);
    const whereTop = hy + 6; hy = whereTop + (whereLines.length ? whereLines.length * whereLH : 0);
    const refTop = hy + 8; const headerH = refTop + 52 + 22;
    if (DRAW) {
      ctx.fillStyle = INK; ctx.fillRect(0, 0, W, headerH);
      ctx.fillStyle = ACC; ctx.fillRect(0, 0, W, 8);
      drawText(t("FIELD CHECK SUMMARY"), pad, 52, { font: F.kicker, color: "#F2A27C" });
      drawText(c.date || "", W - pad, 52, { font: F.kicker, color: "#9FB0BC", align: "right" });
      projectLines.forEach((line, i) => drawText(line, pad, projTop + 30 + i * projLH, { font: F.proj, color: "#FFFFFF" }));
      whereLines.forEach((line, i) => drawText(line, pad, whereTop + 20 + i * whereLH, { font: F.meta, color: "#AEBCC6" }));
      const refText = c.ref || t("Draft check"); ctx.font = F.ref;
      const rw = Math.min(cw, Math.ceil(ctx.measureText(refText).width) + 78);
      ctx.fillStyle = "rgba(255,255,255,.10)"; ctx.beginPath(); ctx.roundRect(pad, refTop, rw, 46, 23); ctx.fill();
      drawText("REF", pad + 20, refTop + 30, { font: F.cap, color: "#9FB0BC" });
      drawText(refText, pad + 62, refTop + 31, { font: F.ref, color: "#FFFFFF", maxW: cw - 78, maxLines: 1 });
    }
    y = headerH + 20;
    // result hero
    if (bo.result) {
      const statusLines = wrapText(status.toUpperCase(), F.hero, cw - 64, 2);
      const sTop = y + 52, tilesTop = sTop + (statusLines.length - 1) * lh(F.hero) + 24, tileH = 104, hh = tilesTop - y + tileH + 24;
      if (DRAW) {
        card(y, hh, statusColor);
        statusLines.forEach((line, i) => drawText(line, pad + 32, sTop + i * lh(F.hero), { font: F.hero, color: statusColor }));
        const four = s.H ? [s.H.max.toFixed(1), "Max radial mm"] : s.V ? [sgn(s.V.max), "Max ΔZ mm"] : [s.check + s.inc, "Pending"];
        const tiles = [[s.n, t("Points"), INK], [s.pass + s.marg, t("Pass"), "#2B7436"], [s.fail, t("Fail"), s.fail ? "#C92A2A" : INK], [four[0], t(four[1]), INK]];
        const tx0 = pad + 32, tw = (cw - 32 - 24 - 36) / 4;
        tiles.forEach((tl, i) => {
          const x = tx0 + i * (tw + 12);
          ctx.fillStyle = "#F3F6F8"; ctx.beginPath(); ctx.roundRect(x, tilesTop, tw, tileH, 14); ctx.fill();
          drawText(String(tl[0]), x + tw / 2, tilesTop + 52, { font: F.num, color: tl[2], align: "center" });
          drawText(String(tl[1]).toUpperCase(), x + tw / 2, tilesTop + 84, { font: F.cap, color: MUTED, align: "center", maxW: tw - 12, maxLines: 1 });
        });
      }
      y += hh + 18;
    }
    // technical summary
    if (bo.metrics) {
      const grid = metrics.slice(0, 4), full = metrics.slice(4), rows = Math.ceil(grid.length / 2), rowH = 46;
      const mh = 60 + (rows + full.length) * rowH + 14, colW = (cw - 48 - 28) / 2;
      if (DRAW) {
        card(y, mh);
        cap(t("Technical summary"), pad + 24, y + 38);
        grid.forEach((pair, i) => {
          const col = i % 2, row = Math.floor(i / 2), x = pad + 24 + col * (colW + 28), top = y + 60 + row * rowH;
          drawText(pair[0], x, top + 28, { font: F.rl, color: MUTED, maxW: colW * .5, maxLines: 1 });
          drawText(pair[1], x + colW, top + 28, { font: F.rv, color: INK, align: "right", maxW: colW * .5, maxLines: 1 });
          hline(x, x + colW, top + rowH);
        });
        full.forEach((pair, i) => {
          const top = y + 60 + (rows + i) * rowH;
          drawText(pair[0], pad + 24, top + 28, { font: F.rl, color: MUTED, maxW: 260, maxLines: 1 });
          drawText(pair[1], pad + cw - 24, top + 28, { font: F.rv, color: INK, align: "right", maxW: cw - 48 - 280, maxLines: 1 });
          if (i < full.length - 1) hline(pad + 24, pad + cw - 24, top + rowH);
        });
      }
      y += mh + 18;
    }
    // points needing attention
    if (bo.attention && attItems.length) {
      const remLines = attShown.map(it => wrapText(it.remark, F.small, cw - 48, 2));
      const blockH = (i) => 20 + lh(F.name) + (remLines[i][0] ? remLines[i].length * lh(F.small) : 0) + 10;
      const ah = 62 + attShown.reduce((a, _, i) => a + blockH(i), 0) + (attMore ? 40 : 0) + 6;
      const worst = attItems.some(i => i.label === "FAIL") ? "#C92A2A" : "#C77700";
      if (DRAW) {
        card(y, ah, worst);
        cap(t("Points needing attention"), pad + 28, y + 38);
        drawText(String(attItems.length), pad + cw - 24, y + 38, { font: F.value, color: worst, align: "right" });
        let iy = y + 62;
        attShown.forEach((it, i) => {
          const base = iy + 20 + 22;
          ctx.font = F.name; const nameW = ctx.measureText(it.name).width;
          drawText(it.name, pad + 28, base, { font: F.name, color: INK, maxW: 200, maxLines: 1 });
          const pw = pill(it.label, it.color, pad + 28 + Math.min(nameW, 200) + 14, base - 8);
          const nx = pad + 28 + Math.min(nameW, 200) + 14 + pw + 14;
          if (it.nums) drawText(it.nums, pad + cw - 24, base - 2, { font: F.small, color: MUTED, align: "right", maxW: pad + cw - 24 - nx, maxLines: 1 });
          remLines[i].forEach((line, j) => { if (line) drawText(line, pad + 28, base + 26 + j * lh(F.small), { font: F.small, color: "#34434D" }); });
          iy += blockH(i);
          if (i < attShown.length - 1) hline(pad + 28, pad + cw - 24, iy - 4);
        });
        if (attMore) drawText(`+ ${attMore} ${t("more points in the PDF report")}`, pad + 28, iy + 26, { font: F.small, color: MUTED });
      }
      y += ah + 18;
    }
    // point table
    const tableRows = rs.slice(0, MAX_ROWS), moreRows = rs.length - tableRows.length, rowH = 42;
    if (bo.points) {
      const th = 62 + 36 + tableRows.length * rowH + (moreRows ? 44 : 14);
      if (DRAW) {
        card(y, th);
        cap(t("Point-level technical results"), pad + 24, y + 38);
        const hy2 = y + 58, x0 = pad;
        ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(x0 + 14, hy2, cw - 28, 36, 8); ctx.fill();
        colLabels.forEach((label, i) => { const k = ["name", "dx", "dy", "rad", "dz", "res"][i]; drawText(label, x0 + colX[k] + (k === "res" ? 0 : 0), hy2 + 25, { font: F.th, color: "#FFFFFF", align: i === 0 || i === 5 ? "left" : "right", maxW: i === 0 ? 150 : 110, maxLines: 1 }); });
        tableRows.forEach(({ p, r }, i) => {
          const top = hy2 + 40 + i * rowH, bad = r.st === "FAIL" || r.st === "CHECK";
          ctx.fillStyle = bad ? "#FDF1F1" : (i % 2 ? "#FFFFFF" : "#F5F7F9"); ctx.fillRect(x0 + 14, top, cw - 28, rowH);
          if (bad) { ctx.fillStyle = "#C92A2A"; ctx.fillRect(x0 + 14, top, 5, rowH); }
          const cy = top + 28;
          drawText(p.name || `P${i + 1}`, x0 + colX.name, cy, { font: "700 20px system-ui, sans-serif", color: INK, maxW: 150, maxLines: 1 });
          const vals = [r.h?.dx == null ? "-" : sgn(r.h.dx), r.h?.dy == null ? "-" : sgn(r.h.dy), r.h?.rad == null ? "-" : r.h.rad.toFixed(1), r.v?.dz == null ? "-" : sgn(r.v.dz)];
          ["dx", "dy", "rad", "dz"].forEach((k, j) => drawText(vals[j], x0 + colX[k], cy, { font: F.td, color: INK, align: "right", maxW: 110, maxLines: 1 }));
          pill(stText(r), STC[r.st] || "#5F6B76", x0 + colX.res, top + rowH / 2);
        });
        if (moreRows) drawText(`+ ${moreRows} ${t("more points in the PDF report")}`, pad + 24, hy2 + 40 + tableRows.length * rowH + 28, { font: F.small, color: MUTED });
      }
      y += th + 18;
    }
    // instrument and control
    if (bo.instrument) {
      const colW = (cw - 48 - 24) / 2;
      const instLines = wrapText(`${c.instModel || "-"}${c.instSerial ? " · S/N " + c.instSerial : ""}${c.instCalib ? " · " + c.instCalib : ""}`, F.body, colW, 2);
      const ctlLines = wrapText(`${t("Station")} ${c.ctlStn || "-"} / ${t("Backsight")} ${c.ctlBs || "-"}${c.bm ? " / BM " + c.bm : ""}`, F.body, colW, 2);
      const ih = 60 + Math.max(instLines.length, ctlLines.length) * lh(F.body) + 14;
      if (DRAW) {
        card(y, ih);
        cap(t("Instrument"), pad + 24, y + 38); cap(t("Control"), pad + 24 + colW + 24, y + 38);
        instLines.forEach((l, i) => drawText(l, pad + 24, y + 70 + i * lh(F.body), { font: F.body, color: "#34434D" }));
        ctlLines.forEach((l, i) => drawText(l, pad + 24 + colW + 24, y + 70 + i * lh(F.body), { font: F.body, color: "#34434D" }));
      }
      y += ih + 18;
    }
    // footer
    const qrSize = appUrl && bo.branding ? 96 : 0;
    const footTextW = cw - 48 - (qrSize ? qrSize + 20 : 0);
    const footLines = [
      { text: `${t("Prepared by")} ${displayInitials(c.name)} (${c.team || "-"})   ·   ${t("Checked by")} ${displayInitials(c.checker)} (${c.checkerTeam || "-"})`, font: F.value, color: INK },
      { text: t("Generated document — no signature required."), font: F.small, color: MUTED },
      { text: t("Checking aid only. Independently verify all inputs and results."), font: F.small, color: "#A94700" },
      ...(bo.branding ? [{ text: `${t("Generated by")} ${APP_NAME} v${APP_VERSION} · ${APP_AUTHOR}`, font: F.tiny, color: "#8C99A3" }] : [])
    ];
    const footWrapped = footLines.map(l => wrapText(l.text, l.font, footTextW, 2));
    const footTextH = footWrapped.reduce((a, l, i) => a + l.length * lh(footLines[i].font), 0);
    const footH = Math.max(footTextH + 40, qrSize ? qrSize + 52 : 0);
    if (DRAW) {
      card(y, footH);
      let fy = y + 38;
      footLines.forEach((l, i) => { footWrapped[i].forEach((line, j) => drawText(line, pad + 24, fy + j * lh(l.font), { font: l.font, color: l.color })); fy += footWrapped[i].length * lh(l.font); });
      if (appUrl && bo.branding) {
        const qr = qrcode(0, "M"); qr.addData(appUrl); qr.make();
        const modules = qr.getModuleCount(), cell = qrSize / modules, qx = W - pad - 24 - qrSize, qy = y + 22;
        ctx.fillStyle = INK;
        for (let r = 0; r < modules; r++) for (let col = 0; col < modules; col++) if (qr.isDark(r, col)) ctx.fillRect(qx + col * cell, qy + r * cell, Math.ceil(cell), Math.ceil(cell));
        drawText(t("Scan to open the app"), qx + qrSize, qy + qrSize + 22, { font: F.tiny, color: MUTED, align: "right" });
      }
    }
    return y + footH + 28;
  };
  const redraw = () => {
    DRAW = false; H = render();
    cv.width = W; cv.height = H;
    ctx.fillStyle = "#EAEFF3"; ctx.fillRect(0, 0, W, H);
    DRAW = true; render(); ctx.textAlign = "left";
  };
  redraw();
  $$("[data-boardopt]").forEach(input => input.addEventListener("change", async () => {
    bo[input.dataset.boardopt] = input.checked;
    S.cfg.boardOptions = { ...bo }; saveCfg();
    if (bo.branding && appUrl && !window.qrcode) await loadScript("lib/qrcode.min.js");
    redraw();
  }));
  const exportTransfer = () => {
    const transfer = transferCheck(true);
    download(new Blob([JSON.stringify(transfer)], { type: "application/json" }), safeName(`${c.ref || "setout-check"}_transfer.json`));
  };
  if (!$("#shareBoardExport")) {
    const button = document.createElement("button"); button.id = "shareBoardExport"; button.className = "btn"; button.textContent = t("Export check data");
    $("#shareBoardStatus").before(button); button.onclick = exportTransfer;
  }
  const boardBlob = () => new Promise((resolve, reject) => cv.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not create the summary image")), "image/png"));
  const saveCaption = async () => {
    try { await navigator.clipboard.writeText($("#shareBoardCaption").value); return true; }
    catch (e) { console.warn("Clipboard API unavailable", e); return false; }
  };
  $("#shareBoardSave").onclick = async () => { try { download(await boardBlob(), safeName(`${c.ref || "setout-summary"}_summary.png`)); } catch (e) { $("#shareBoardStatus").innerHTML = `<div class="err">${esc(e.message)}</div>`; } };
  $("#shareBoardCopy").onclick = async () => { if (await saveCaption()) toast(t("Caption copied")); else { $("#shareBoardCaption").select(); toast(t("Select and copy the caption"), 4000); } };
  $("#shareBoardSend").onclick = async () => {
    const btn = $("#shareBoardSend"); btn.disabled = true;
    try {
      const blob = await boardBlob(), file = new File([blob], safeName(`${c.ref || "setout-summary"}_summary.png`), { type: "image/png" });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) await navigator.share({ files: [file], title: `${APP_NAME} ${c.ref || ""}`, text: $("#shareBoardCaption").value });
      else { download(blob, file.name); if (await saveCaption()) toast(t("Image downloaded; caption copied")); else toast(t("Image downloaded; copy the caption to share")); }
    } catch (e) { if (e.name !== "AbortError") $("#shareBoardStatus").innerHTML = `<div class="err">${esc(e.message || e)}</div>`; }
    finally { btn.disabled = false; }
  };
}

