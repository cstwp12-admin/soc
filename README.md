# Set-Out Check

A web app for checking setting-out on site. Enter or import the **design** and **measured** coordinates of each point, and the app gives the offsets (ΔE, ΔN, radial, ΔZ), PASS / FAIL against the tolerance, a remark saying which way to move the point, and a PDF record to share.

It works on iPhone, Android and laptop in the browser, with nothing to install from an app store, and it keeps working without signal once opened.

**Developed by WPN.** First used on Projek Lebuhraya Pan Borneo Sabah Fasa 1B, Work Package 12 (Sarang – Temuno). It can be used on any project: see [Projects](#projects-wp12-wp13-wp14-or-any-other-job).

**New to the app?** Read the [user guide](GUIDE.md).

**Worked example:** see [sample results](SAMPLE-RESULTS.md) for fictional coordinates, tolerances and calculated outcomes.

## What it does

| | |
|---|---|
| **Three ways to get the data in** | **Import** an Excel or CSV file (the columns are matched from the headings, e.g. the *WP12 Survey Checking Template*). **Scan** a photo of a coordinate schedule, a field book page or an instrument screen. **Type** the values in, or **paste** rows copied from Excel. |
| **Check types** | Horizontal (E, N), Level (RL), or Horizontal + Level. |
| **Offsets** | ΔE = Measured E − Design E, ΔN = Measured N − Design N, Radial = √(ΔE² + ΔN²), ΔZ = Measured RL − Design RL, all in mm. The same formulas as the Excel checking template. |
| **Result per point** | **PASS**, **PASS\*** (within tolerance but over 80 % of it), **FAIL**, **CHECK** (gross error, or E and N look swapped), or **PENDING** (a value is missing). |
| **Remarks** | Written automatically, e.g. *H exceeds tolerance by 4 mm - move 24 mm W* or *RL exceeds tolerance by 5 mm - raise 15 mm*. You can type your own remark for any point. |
| **Tolerance** | Presets by element type, a radial horizontal tolerance, independent upper (+) and lower (−) level limits, and own tolerances per point. Confirm all acceptance limits against the approved project documents. |
| **Summary** | Max, mean and RMS radial offset, the mean shift (a sign of a station or orientation error), a plan-view target plot and a level chart. |
| **Quick entry** | Type only the last digits of a coordinate, e.g. `88.630`: the leading digits are taken from the design value (`739988.630`). |
| **Report** | Customizable A4 PDF title and section selection, repeated full project headers, adaptive plan-view scaling, selectable two- or four-photo pages, initials-only prepared/checked details and technical point results. A compact app-link QR appears at the bottom right of page one; the board preview has toggles for its information sections. Move checks between users with a JSON transfer file, including photos. Also Excel (template layout with live formulas), CSV and a technical WhatsApp summary board with an editable caption. |
| **Language** | English or Bahasa Malaysia for the app interface and key report / sharing labels. |
| **Field preferences** | Choose from five high-contrast color themes, including Graphite dark. Photos are resized, kept on the device, captioned and previewable before reporting. |
| **Responsibility** | The app, PDF, Excel Details sheet and share summary make clear that output is a checking aid based on user inputs. Users remain responsible for independently verifying source data and results against approved documents and field observations. |
| **Updates** | When hosted over HTTP(S), the app checks for a new service-worker version while online and offers an in-app reload prompt. It does not use push notifications or send data to a server. |
| **Register** | Every shared check is kept in a register on the phone, searchable, with CSV export. |

## Projects: WP12, WP13, WP14 or any other job

The app is not fixed to one project. Tap the project code at the top left (e.g. **WP12 ▾**) to switch. Each project has its own:

- report title, contract no. and RFI prefix;
- logos (left, right, and a right logo per team, e.g. the consultant's logo when the team is CST);
- teams, coordinate systems, structures list and tolerance presets;
- current check and ref. numbers (e.g. `WP13-SOC-CST-WPN-20261014-1`).

A link can open a project directly: add `?p=WP13` to the app's address.

Projects are files in the [`packages/`](packages) folder, listed in [`packages/index.json`](packages/index.json):

| File | Project |
|---|---|
| `WP12.json` | Pan Borneo Sabah Fasa 1B, WP12 Sarang – Temuno |
| `WP13.json` | Pan Borneo Sabah Fasa 1B, WP13: **title, RFI prefix, structures and contractor logo are placeholders to confirm** |
| `WP14.json` | Pan Borneo Sabah Fasa 1B, WP14: **same, to confirm** |
| `OTHER.json` | Blank project for any other job |

**To set up or correct a project:** open it in the app, then **Setup → Project details & logos**. Edit the details, upload the logos, **Save** (this phone only), then **Export project file** and upload that file to `packages/` on GitHub. Add a line for a new project to `packages/index.json`. Everyone gets it the next time they open the app.

The app's name and the developer credit (**WPN**) are part of the app itself and stay the same for every project.

## Shared project-tools style

The separate WP12 Timesheet app is a useful companion reference. This app shares its ink-and-ember palette, compact 780 px content width, rounded white panels, touch-friendly forms and clear primary action. It also adopts the Timesheet's Help entry point and screenshot-led task guide, while keeping survey-specific inputs, calculations and reports. Timesheet-only attendance and leave workflows do not belong in a setting-out checker.

The recommended family brand is **WP12 Project Tools**: consistent navy, ember-orange actions and typography, with each tool retaining a clear functional name. **Set-Out Check** describes the current function in a short, mobile-friendly name. Its mark uses a survey target and verification tick; project/client logos belong on project reports, not the generic app icon. The app credit stays **WPN**.

## Scanning photos

- **AI (Gemini)**: best for handwriting and instrument screens. Each user adds their own free Google Gemini API key in **Setup → AI scan** (kept only on that phone). Needs signal. The default model is `gemini-3.5-flash`; it can be changed in Setup.
- **Offline OCR**: for clear printed tables only. The first use downloads about 7 MB from the app (`lib/tesseract/`); after that it works without signal.

Every scanned value is shown for checking against the photo before it is used. Values that were hard to read are marked yellow.

## Data and privacy

There is no application server. Checks, the register and settings stay on the phone. Back up with **Setup → Save backup** and **Register → Export CSV**. Photos are sent to Google only when you use the AI scan. Update checks only fetch app files from the web host; they do not upload check data.

## Project contents

The app is in `index.html`; `packages/` contains project details and logos; `lib/` contains the PDF, Excel and QR libraries. `sw.js` and `manifest.webmanifest` support offline use and home-screen installation. The screenshot-led [user guide](GUIDE.md) is in `guide/images/`. `setup.json` is the original WP12 setup fallback. The sample results in [SAMPLE-RESULTS.md](SAMPLE-RESULTS.md) are fictional training values only.

## Important

The results are a checking aid generated from information supplied by the user; they are not independent survey verification, acceptance or certification. The user is responsible for checking point identity, source data, units, coordinate and vertical datums, approved tolerances, and results against approved project documents and field observations before use. Do not rely on the app alone to approve or direct construction work. Tolerance presets are indicative; apply only the limits in the approved ITP, Method Statement or project specification. Generated reports show preparer/checker initials and do not require a signature; users may sign a printed report physically if required.

## Licence

See [LICENSE.md](LICENSE.md). © 2026 WPN.
