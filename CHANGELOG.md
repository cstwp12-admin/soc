# Change log

## v2.0.0-rc.2 (19 Oct 2026) - report screen, board and field polish

- **Generate report screen redesigned:** result summary, *Document* settings, *Header shows* and *Report contents* as switch rows with short descriptions, *More outputs* grid, and **Share PDF / Preview / Save** fixed at the bottom.
- **WhatsApp board redesigned:** dark header with the ref. no., result panel with big counts, tidy technical summary, point cards, rounded result tags and a cleaner footer.
- **Optional fields:** *+ Chainage to* and *+ Specific location / offset* are dashed buttons that open their field when tapped.
- **Portrait PDF:** the ref. no. no longer runs into the date; the header control row sizes each cell to its content.
- Guide: new screenshots (fictional data), report screen and optional-field sections.

## v2.0.0-rc.1 (19 Oct 2026) - rebuild, step 5: polish and release candidate

- **First-run AI note:** the first time *Scan photo* is used without a Gemini key, a short note explains the AI and offline options and links to Setup.
- **Accessibility:** automated check (axe-core) reports no violations in the app, dialogs and dark theme; every control has a label, contrast raised, one page heading.
- **Offline:** the app, libraries and OCR work without signal; the PDF-import library loads on first use.
- **Performance:** a 500-point check builds its PDF in about 10 s.
- **Docs:** user guide, roadmap, third-party notices (including pdf.js) and a documentation site theme shared with the other tools.
- Remaining before 2.0.0: confirm SheetJS and jsQR licence wording (see notices) and field-test on site.

## v2.0.0-beta.6 (19 Oct 2026) - rebuild, step 4: new features

- **Coordinate order (E,N or N,E):** the import review has a *Coordinate order* selector. If the check already has design values, the app compares the file with them (by point name) and reads the columns the right way round by itself, with a message. Without design values, a file with no headings is flagged as *assumed E, N*.
- **Better column recognition:** *Pile, Stake, Marker, Bolt, Hole, Node, Position* headings are point names; a title line above the headings is no longer glued to every heading; OCR and headerless data tell grid coordinates from levels by size, so an RL column is never read as a coordinate.
- **PDF schedules:** import a PDF with a text table (not a scan) straight into the review table.
- **Photos linked to points:** pick the point each photo shows; the PDF prints *Photo 2 - Point P10*.
- **Re-check failed points:** in *Review*, one tap starts the next revision with only the failed points (design values kept, measured cleared, note added).
- **Register:** filters by result, team and date range, with counts; revision shown on each entry and in the CSV.
- **Check before sharing:** if points are incomplete or flagged CHECK, or the tolerance is not set, *Share PDF* and *Save PDF* ask for confirmation first.
- **Excel:** the *Details* sheet includes the revision.

## v2.0.0-beta.5 (19 Oct 2026) - PDF header: larger project name, document control

- **Project name larger** (up to 11 pt, shrinking only if it would wrap) and centred between the logos.
- **Document-control row** under the title band: *Ref. no. / Date / Revision*. In *Report*, choose which of the three to show (and type the revision, e.g. 0, A, B). Later pages show them in the compact title band.
- Portrait reports (horizontal-only and level-only): the plan plot now fits on page 1 when there is room; coordinate columns no longer touch.

## v2.0.0-beta.4 (19 Oct 2026) - PDF header and footer

- **Header redesigned as a table:** logo cells of equal width on both sides, so the project name is centred between them; a smaller navy title band ("SETTING-OUT CHECK RECORD") below. Continuation pages carry a compact title band with the reference and date.
- **Footer as a table strip:** reference | date | credit and version | page x of y, in one tidy band on every page.

## v2.0.0-beta.3 (19 Oct 2026) - rebuild, step 3: new PDF report

- **PDF redesigned:** a result panel at the top (big PASS / FAIL, counts, max radial, RMS, max dZ), check details as a clean label / value list, a lighter results table (failed rows marked with a red edge and tint, result as a coloured tag, header repeats on every page), a larger plan plot beside the level chart and a statistics list, sign-off boxes for *Prepared by* / *Checked by* with a signature line and the app QR code, and photos as a captioned appendix.
- Consistent header (accent rule) and footer (reference, date, page x of y, credit) on every page. The checking-aid notice stays on the report, now after the sign-off so the results fit on page 1.
- Fixed: the level tolerance minus sign printed as a quote mark (`"10 mm`).

## v2.0.0-beta.2 (19 Oct 2026) - rebuild, step 2

- **Step bar:** *Details, Points, Review, Export* under the header, like ClaimPack. Each step shows what is missing or its result (e.g. "Name needed", "12 points", "1 fail / 12") and turns green when complete. Tap a step to jump to it.
- **Welcome screen** on first use (four steps, *Try with sample data*).
- Section 3 is now called *Review*; point tools sit in a tidy two-column grid on phones.

## v2.0.0-beta.1 (19 Oct 2026) - rebuild, step 1

- **Code split** into `index.html`, `style.css`, `app.js`, `scanner.js`, `report.js` and `events.js` (was one 227 KB file). No change to how the app works: the sample check gives identical results, PDF and Excel to beta.13.
- **Shared look** with ClaimPack and Timesheet: Barlow / Barlow Condensed / IBM Plex Mono type, the same colours, numbered section badges, condensed headings and action button. Dark mode follows the phone by default (*Setup -> Color theme* still lets you choose).
- Added `version.json`, `THIRD-PARTY-NOTICES.md`, `samples/` (fictional test files), `tools/` (sample generator) and `tests/` (regression test).

## v1.3.0-beta.13 (18 Oct 2026)

- The chainage end and specific location/offset fields are now collapsed optional inputs, opened only when needed.
- Fixed chainage formatting while typing: the cursor is preserved, all digits are retained, and multi-digit chainage values are supported (e.g. `1234567` becomes `1234+567`).
- Restored the structure selector's category-grouped list. Custom structure names can be added and removed in Project Setup, remain per-project on the device, and are included in exported project files.

## v1.3.0-beta.12 (18 Oct 2026)

- Added a visible “Start a new check” action in the report dialog after PDF preview, save or share, so users can begin the next report without scrolling to the bottom of the form.
- Structure is now an editable suggestion field. Users can enter any structure and optionally save it to a custom list for the current project on that device.
- Replaced the combined location field with optional start/end chainages and a separate free-text location/offset field. Numeric chainage entry inserts `+` before the final three digits; chainage and location now flow into reports, register entries and the WhatsApp board.

## v1.3.0-beta.11 (18 Oct 2026)

- Help, About and Setup now open the user guide, change log and licence in GitHub's rendered Markdown view instead of displaying raw Markdown from GitHub Pages.
- Report references now form a three-letter preparer code from the entered name when enough letters are provided, including single- and two-word names; full names with three or more parts continue to use their first three initials.
- Enlarged dense horizontal plan plots on a dedicated report page and increased their render resolution for clearer point presentation.
- Corrected the default app-sharing URL to the published project's GitHub Pages site.

## v1.3.0-beta.10 (17 Oct 2026)

- Moved the app QR caption below the first-page QR and shifted the WPN app attribution below the footer reference/page-count row to prevent overlap.

## v1.3.0-beta.9 (17 Oct 2026)

- Added a compact, scannable app-link QR to the bottom-right corner of the first PDF page, with the footer attribution aligned to the footer text.
- Simplified the report sign-off to a plain prepared/checked initials line and the generated-document notice.
- Added preview controls to show or hide project/location, overall result, technical summary, attention points, point results, instrument/control details and app branding on the WhatsApp summary board.

## v1.3.0-beta.8 (17 Oct 2026)

- Restored the report reference and “Page X of Y” to the PDF footer only; repeated page headers remain free of reference and page-count text.

## v1.3.0-beta.7 (17 Oct 2026)

- Extended the top and bottom bar backgrounds across the window while keeping their controls in the existing responsive content column.
- Removed check-data QR generation and scanning; check details and photos are transferred as a JSON file. App-sharing QR codes on the report and summary board remain.
- Report references now reflect the current project code, team, preparer initials and report date; honorifics are excluded when deriving initials.
- Removed reference and page-count text from the repeated PDF header and footer; the reference remains in the report details.
- Generated report and Excel details use initials instead of exposing preparer/checker full names.
- Updated the guide and README for JSON transfer and the revised report references.

## v1.3.0-beta.6 (17 Oct 2026)

- **Send feedback** now simply opens WhatsApp with the message ready so you choose the chat yourself; there is no stored feedback number to configure, and the feedback buttons are always available.
- The QR code on the PDF report and on the WhatsApp summary board now carries **only the web-app link**, so scanning it opens the app instead of importing a check.
- Added a separate, deliberate way to move a check between phones: **Show check QR** in the Report dialog displays a QR of the check details and point measurements, and **Scan check QR** under Points reads it with the camera (or from a photo) and imports it. Photos are not encoded in the QR - use *Export check data* for those.
- Fixed dark-theme contrast: the dock, toast, update notice, table headers, focused inputs, prefix chips, mapped/flagged grid cells and accent chips no longer leave light text on light surfaces in the Graphite theme. Light-theme text contrast was also raised to meet WCAG AA.
- The top header, the bottom dock and the checking notice now share the same column as the cards, so their edges line up with the input boxes instead of spanning the whole window.
- Updated the user guide for the feedback, QR and layout changes and refreshed the guide screenshots, adding a report-actions shot that shows **Show check QR**.

## v1.3.0-beta.5 (17 Oct 2026)

- PDF photo pages now pick the grid that renders each photo largest — two side by side on a landscape page, or stacked when that is better — instead of always squeezing photos into tall half-width cards. Each card is sized to hug its own photo and caption, so mixed photo sizes no longer leave dead space.
- The PDF **Sign-off** block is now a proper section with a heading, a rule line, and the preparer and checker shown as **full names** with designation and date (auto-shrinking for long names) instead of initials. Initials remain only in compact places such as the WhatsApp summary footer.
- Added a **Checker designation** field to check details, carried through to the report sign-off block and the Excel *Details* sheet.
- Moved the app branding off the top of the WhatsApp summary board to a low-key *generated by* line at the bottom, leaving the board's top for the report title and reference.
- Added **Send feedback** (Report dialog and check-before-share area) which opens WhatsApp with a short pre-filled message for the project group. Internal only: set the **Feedback WhatsApp number** in Setup; leave it blank to hide the feedback buttons. The report check now also warns when the checked-by name is empty.
- Added an **Auto (follow system)** color theme that follows the phone's dark-mode setting.
- UI polish: toast is positioned clear of the fixed dock using the safe-area inset and is announced to screen readers; the empty points list is now a proper empty state; adding a point flashes its card; `prefers-reduced-motion` disables animation and transitions.

## v1.3.0-beta.4 (17 Oct 2026)

- Rebuilt the WhatsApp summary board so it is legible on a phone: the board is now 860 px wide with poster-scale type and a phone-shaped aspect ratio, so it fills the screen instead of shrinking. Long remarks wrap onto extra lines instead of being squeezed, and every run of text sets its own font, colour and alignment.
- Fixed the board drawing off-canvas: the left column no longer runs off the edge, row numbers no longer spill outside their rows, and the point table is capped at nine rows with a "+N more points in the PDF report" note.
- Fixed the PDF page-1 header overlap: the project heading, logos and report title are measured once and drawn once per page, so the title no longer wraps differently between the first and later pages and the "Page 1 of 1 / Page 1 of 2" ghost line is gone.
- Fixed the PDF result bar so the overall result and the pass/fail counts no longer overlap; the bar shrinks its font or stacks the counts when space is tight.
- Fixed the PDF notice box, which measured its text before setting the font size and ran past the right margin; the notice now wraps inside its box.
- Fixed the PDF footnote under the point table, which could run into the footer on long checks; it now starts a new page when it does not fit.
- Moved the PDF footer credit clear of the page edge and kept the QR caption inside its panel.

## v1.3.0-beta.3 (17 Oct 2026)

- Kept report dialogs and the technical WhatsApp board within narrow mobile viewports, including the board preview canvas.
- Removed the narrow-screen overflow caused by the minimum width of the summary plots.
- Refreshed the report-options and WhatsApp-board guide screenshots with fictional training data.

## v1.3.0-beta.2 (17 Oct 2026)

- Added selectable two- or four-photo PDF pages with balanced image and caption sizing.
- Repeated the complete project heading, logos and report title on every PDF page; project-title text before and after the colon is split onto separate lines.
- Enlarged plan views on larger checks, expanded the plot scale to include outliers, and reduced labels on dense plots.
- Replaced the simplified WhatsApp graphic with a technical results board showing tolerances, setup details, summary metrics and per-point offsets / results / remarks.
- Replaced report signature pads with prepared / checked initials and a generated-document note that no signature is required.
- Added QR-based check transfer for supported-sized payloads and JSON transfer-file export including photos.
- Added worked fictional results and refreshed/cropped the screenshot-led guide.
- Updated the README to remove beta and GitHub Pages publishing-status text.

## v1.3.0-beta.1 (17 Oct 2026)

- Renamed the app **Set-Out Check** and compacted the phone header from 340 px through 560 px; the project switcher and icon navigation no longer overlap.
- Added English / Bahasa Malaysia language selection, with localized core UI, notices, report/share labels and generated summaries.
- Added optional drawn surveyor and checker signatures for PDF sign-off; these are device-local images, not identity-verified approvals.
- Redesigned photo pages to use two captioned photos per page and repeat the project/report header on every continuation page.
- The report QR now carries the hosted app link plus a compact, coordinate-free result summary.
- Added a previewable WhatsApp summary image with editable caption and native-share / download fallback.
- Made the on-screen checking notice dismissible; the full responsibility disclaimer remains in About and generated reports.
- Hosted Share QR links are derived from the deployed address; Setup accepts an override only when needed.

## v1.2.0-beta.2 (17 Oct 2026)

- Aligned the survey app more closely with the companion Timesheet design: shared ink-and-ember palette, compact content width, card styling and a Help entry point, without bringing over timesheet-specific workflows.
- Added the Graphite dark theme and a purpose-designed setting-out target / verification app icon.
- Added a concise on-screen responsibility notice and a permanent verification disclaimer in PDF and Excel reports.
- Added a phone-sized, screenshot-led user guide using fictional training data.
- Refined the narrow-screen header so the project switcher and primary navigation remain usable.

## v1.2.0-beta.1 (17 Oct 2026)

- Replaced full-name attribution with **WPN** throughout the app and project documentation.
- Added Slate & Ember, Ocean Teal, Forest Green and Plum appearance themes, plus larger form targets and clearer keyboard focus.
- Level checks now support independent upper (+) and lower (−) tolerances while horizontal checks retain the radial tolerance. The signed limits are reflected in remarks, plots, reports and Excel formulas; prior saved checks migrate by using their existing level tolerance for both limits.
- Added report title and optional section controls for plots, instrument/control details, notes, photos and sign-off.
- Added a Share button with a project-specific QR code when a valid web URL is configured. This beta remains local/unpublished; no public test site was created.
- Added service-worker update checks and an in-app reload prompt for hosted builds; no push service or server-side check data is used.
- Photo thumbnails open a larger preview, show the attachment count and explain local resized storage.

## v1.1.0 (14 Oct 2026)

- **Projects:** the app is no longer fixed to one project. Choose a project from the code at the top left, or open one by link (`?p=CODE`). Each project has its own title, RFI prefix, logos, teams, structures, current check and ref. numbers. Projects are files in `packages/`.
- **Project details & logos** editor in Setup: edit the project, upload logos (left, right, and per team), save on the phone, and export the project file for GitHub. **+ Add project from file** to use a project file someone shared.
- **Register:** each entry records its project; the list shows the current project, with *Show all projects* to see everything. Opening an entry from another project switches to that project.
- **About** screen and developer credit: *Setting-Out Check app developed by WPN* on the About screen, the PDF footer and the Excel *Details* sheet.
- **AI scan** fixed for the current Gemini API: default model `gemini-3.5-flash` and the `Api-Revision` header. Clearer messages for a wrong key or model name.
- **Offline OCR now really works offline:** the OCR engine and English data are part of the app (`lib/tesseract/`, about 7 MB, downloaded on first use only). Better reading of phone photos (black-and-white threshold), cell borders removed, a lost decimal point put back (e.g. `739992096` → `739992.096`, marked yellow), cut-off or out-of-line values marked yellow, timestamps and headings skipped, and the row number kept as the point name.
- Review table: tick column stays in view and coordinates fit on a phone.
- **Phone layout:** coordinates show all their digits on narrow phones (tested from 340 px wide); the page no longer scrolls sideways; the RFI box no longer wraps.
- PDF reports are compressed: about 0.2 MB instead of 4–6 MB, easier to share on WhatsApp.
- PDF: contract no. in the header when set; the plan plot shrinks to stay on page 1 when there is room; the QR code opens the same project.
- Offline use and *Add to Home Screen* (service worker and manifest added).
- Ref. numbers count per project and day.

## v1.0.0

- First version: horizontal / level checks, tolerance presets, offsets and remarks, Excel / CSV import, paste, photo scan, PDF / Excel / CSV / WhatsApp output, register and backup.
