# Set-Out Check

**Check set-out points on site in four steps and share a clean PDF record.**

Set-Out Check is a free web app for site engineers and surveyors. Enter or import the **design** and **measured** coordinates of each point and the app gives the offsets (ΔE, ΔN, radial, ΔZ), PASS / FAIL against the tolerance, a remark saying which way to move the point, and a professional A4 PDF record to share.

It works on iPhone, Android and laptop in the browser, with nothing to install from an app store, and it keeps working without signal once opened. Developed by WPN.

**New to the app?** Read the [user guide](GUIDE.md).

## What it does

| | |
|---|---|
| **Four steps** | **Details**, **Points**, **Review**, **Export**: the step bar under the header shows what is missing and turns green when a step is complete. |
| **Get the data in** | **Import** an Excel, CSV or text-PDF schedule (columns are matched from the headings), **scan** a photo of a schedule, field book page or instrument screen, **paste** rows, or **type** them. |
| **Coordinate order** | Instruments differ (E, N or N, E). The import review has a *Coordinate order* selector, and compares the file with the design values already in the check to pick the right order. |
| **Check types** | Horizontal (E, N), Level (RL), or Horizontal + Level. |
| **Offsets** | ΔE = Measured E − Design E, ΔN = Measured N − Design N, Radial = √(ΔE² + ΔN²), ΔZ = Measured RL − Design RL, all in mm. |
| **Result per point** | **PASS**, **PASS\*** (within tolerance but over 80 % of it), **FAIL**, **CHECK** (gross error, or E and N look swapped), or **PENDING** (a value is missing). |
| **Remarks** | Written automatically, e.g. *H exceeds tolerance by 4 mm - move 24 mm W*. You can type your own remark for any point. |
| **Tolerance** | Presets by element type, a check-wide tolerance, and an own tolerance per point. |
| **Review** | Max, mean and RMS radial offset, the mean shift (a sign of a station or orientation error), a plan-view target plot and a level chart. **Re-check failed points** starts the next revision with only those points. |
| **Quick entry** | Type only the last digits of a coordinate, e.g. `88.630`: the leading digits are taken from the design value. |
| **Photos** | Add site photos with captions and link each to the point it shows. |
| **PDF record** | A4 report with a header block (logos, project, title, ref. no. / date / revision, each optional), result panel, details, results table, plots, sign-off boxes with QR code and a photo appendix. Also Excel (live formulas), CSV and a short WhatsApp text and picture. |
| **Register** | Every shared check is kept in a register on the phone, with search, filters (result, team, date) and CSV export. |
| **Language and theme** | English or Bahasa Malaysia; light, dark (follows the phone) and other colour themes. |

## Projects

The app is not fixed to one project. Tap the project code at the top left to switch. Each project has its own report title, contract no., RFI prefix, logos, teams, coordinate systems, structures list, tolerance presets and ref. numbers. A link can open a project directly: add `?p=CODE` to the app's address.

Projects are files in the [`packages/`](packages) folder, listed in [`packages/index.json`](packages/index.json). To set up or correct one: open it in the app, then **Setup → Project details & logos**, edit, **Export project file** and upload that file to `packages/`.

The app's name and the developer credit (**WPN**) are part of the app and stay the same for every project.

## Scanning photos

- **AI (Gemini)**: best for handwriting and instrument screens. Each user adds their own free Google Gemini API key in **Setup → AI scan** (kept only on that phone). Needs signal. The app shows a short set-up note the first time you open **Scan photo** without a key.
- **Offline OCR**: for clear printed tables only. About 7 MB, part of the app, works without signal.

Every scanned value is shown for checking against the photo before it is used. Values that were hard to read are marked yellow.

## Data and privacy

There is no application server. Checks, the register and settings stay on the phone. Back up with **Setup → Save backup** and **Register → Export CSV**. Photos are sent to Google only when you use the AI scan.

## Project contents

`index.html` with `style.css`, `app.js`, `scanner.js`, `report.js` and `events.js` is the app (upload all of them). `version.json` drives update checks, `packages/` holds projects and logos, `lib/` the PDF, Excel, QR and OCR libraries, `sw.js` and `manifest.webmanifest` offline use and home-screen install. `samples/` has fictional test files, `tests/` the automated tests (Playwright) and `tools/` the sample generator. The documentation pages use the shared *Site Tools* theme (`_config.yml`, `_layouts/`, `_includes/`, `assets/`).

## Important

The results are a checking aid generated from information supplied by the user; they are not independent survey verification, acceptance or certification. The tolerance to apply is the one in the approved ITP, Method Statement or specification for the work. The tolerance presets in the app are indicative.

## Licence

See [LICENSE.md](LICENSE.md) and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). © 2026 WPN.
