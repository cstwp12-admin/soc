# Set-Out Check: user guide

Developed by WPN.

> **Checking aid only — the user is responsible for verification.** Check point identity, source data, units, coordinate/vertical datums, approved tolerances and results against the approved project documents and field observations. The app does not independently verify, accept or certify survey work. Do not rely on it alone to approve or direct construction.
>
> Screenshots below use fictional training data. Do not use those values or the indicative presets as project tolerances.
>
> For a complete worked example, see [Sample Set-Out Check Results](SAMPLE-RESULTS.md).

## 1. Open the app and pick the project

1. Open the app link on your phone. On iPhone: **Share → Add to Home Screen**. On Android (Chrome): **⋮ → Add to Home screen / Install app**.
2. The project code is at the top left, e.g. **WP12 ▾**. Tap it to choose another project (WP13, WP14, Other project). Each project keeps its own check, so switching does not lose your work.

![App home screen and checking-aid notice, shown with fictional training data](guide/images/01-start.png)

## 2. Fill in the check details (section 1)

- **Date, team, surveyed by, designation**: your name, team and instrument are remembered for the next check.
- **RFI no.**: type only the number part, e.g. `SUR-123`. The project's prefix is added in front.
- **Structure, chainage / location, element**: say what was set out, e.g. *Pier 2 pile cap - pile positions*.
- **Check type**: *Horizontal (E, N)*, *Level (RL)* or *Horizontal + Level*.
- **Element type**: picks the tolerance. Horizontal tolerance is radial; level has separate upper (+) and lower (−) limits. Change them to match the approved ITP / Method Statement, and write where the tolerance comes from in **Tolerance source**.
- **Instrument, control points & checker** (tap to open): instrument model, serial no., calibration date, station, backsight, BM/TBM, and who checked it — name, team and designation. Generated reports show preparer and checker initials only; no signature is required on the generated document.

![Check details with the independent upper and lower level tolerances](guide/images/02-tolerances.png)

## 3. Enter the points (section 2)

Pick whichever is easiest:

| Button | Use it when |
|---|---|
| **📄 Import Excel / CSV** | You have the design coordinates (or both design and measured) in a spreadsheet, e.g. the *Survey Checking Template*. |
| **📋 Paste** | You copied rows from Excel, a text file or a message. |
| **📷 Scan photo** | You have a printed schedule, a field book page or an instrument screen. Choose what is in the photo and whether the values are design or measured. |
| **+ Add point** | Typing by hand. |
| **⬇ Blank template** | Download the Excel template to fill in on a laptop. |

After an import, paste or scan, a **review table** opens:

- Check the drop-down above each column says what the column is (Point name, Design E, Measured N …).
- Check the values against the source. Yellow = hard to read; red = not a number. Tap a cell to correct it.
- Untick rows you don't want.
- **Add to the check as**: *Replace all points*, *Add as new points*, or *Merge by point name*. Use **Merge** to import the design values first and the measured values later.

**Quick entry:** in a coordinate box you can type only the last digits, e.g. `88.630`. When you leave the box it becomes `739988.630`, taking the leading digits from the design value. Turn this off in **Setup** if you prefer.

Each point card shows its result straight away:

| Result | Meaning |
|---|---|
| **PASS** | Within tolerance |
| **PASS (marginal)** / **PASS\*** | Within tolerance, but over 80 % of it |
| **FAIL** | Outside tolerance. The remark says by how much and which way to move, e.g. *move 9 mm W, 6 mm S* or *lower 12 mm* |
| **CHECK** | Very large difference (over 500 mm) or E and N look swapped: check the point name and the reading |
| **PENDING** | Design or measured value missing |

Tap **Point tolerance / own remark** on a card to give one point its own tolerance or remark.

![Point cards showing the computed result and movement remarks](guide/images/03-points.png)

## 4. Read the summary (section 3)

- The count of PASS / FAIL, max and RMS radial offset, max ΔZ.
- **Mean ΔE / ΔN (shift)**: if every point is off in the same direction, the instrument set-up (station or backsight) may be wrong rather than the pegs.
- The **target plot** shows each point's offset from design in plan, with the tolerance circle. Its scale expands to include the furthest measured offset; point labels are reduced on dense plots to avoid collisions. The **level chart** shows ΔZ per point.

![Summary cards showing checked-point counts and tolerance results](guide/images/04-results.png)

## 5. Photos and notes (section 4, optional)

Add site photos with captions and any notes, e.g. *prism height 1.500 m*. Photos are resized and stored on this device; tap a thumbnail to preview it. In the Report dialog, choose whether photos and notes appear in the PDF and select **2 photos per page** or **4 photos per page**. The PDF picks the grid that renders each photo largest — two side by side on a landscape page, or stacked when that is better — and sizes every card to hug its own photo and caption, so mixed photo sizes do not waste space.

![Optional site photos and notes with fictional attachments](guide/images/05-photos-notes.png)

## 6. Generate the report

Tap **Generate report**. The app lists anything missing (name, tolerance, incomplete points). Choose a PDF title and which optional sections to include, then:

- A user-verification disclaimer is always included in the PDF and cannot be switched off.
- The prepared/checked details use initials only. No signature is required on a generated document; a physical signature can be added after printing if required.
- The report header repeats the project/client line, the project-specific line below it, logos and report title on every page.
- Photo attachments use the selected two- or four-photo grid and the full project/report header repeats on every page.
- A compact QR at the bottom right of the first PDF page opens the hosted web app. It carries only the app link, not the check data.
- The sign-off is a simple prepared/checked initials line with a generated-document note; no signature is required.
- **Export check data**: downloads a JSON file containing check details, point measurements and photos. Send the file to the other user; they can import it through **Setup → Restore backup**. QR codes are not used to transfer check data because larger checks are impractical to scan.
- **Plan view target plot** can be included or omitted independently from the level chart/statistics.
- **📤 Share PDF**: send to WhatsApp, email, etc.
- **👁 Preview PDF**, **⬇ Save PDF**
- **📊 Save Excel**: the template layout with live formulas, plus a *Details* sheet
- **🧾 Save CSV**
- **🖼 Preview WhatsApp board**: review a shareable technical summary image with toggles to show or hide project/location, result/counts, technical summary, points needing attention, point results, instrument/control details and app branding; edit its caption before opening the phone’s share sheet. If image sharing is unavailable, the PNG downloads and the caption can be copied.
- **💬 Copy WhatsApp text**: a short summary listing any failed points
- **💬 Send feedback**: opens WhatsApp with a short pre-filled message ready to send. No number is stored in the app — choose the chat yourself in WhatsApp.

![Report title and optional report sections](guide/images/06-report-options.png)

![WhatsApp summary-board preview with its editable caption](guide/images/08-whatsapp-board.png)

Choose a color theme and **English** or **Bahasa Malaysia** for the core interface labels and report/share outputs in **Setup**. The checking notice at the top of the page can be dismissed; its full text remains in **Help → About** and in generated reports. When hosted, the app detects its web address for Share and report QR codes; set an **App sharing link** override only if needed. App QR codes share the app link only. To import a check-transfer JSON file, open **Setup → Restore backup** and select the file; the app will ask before replacing that project's current draft.

Every shared or saved report is kept in the **Register** (top right). Open an old check from there to correct it and share it again (same ref. no.).

**↺ New check** clears the points, photos and notes but keeps your team, names, instrument, control and tolerance.

## 7. Setup

- **AI scan (Gemini)**: paste your own free Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and tap **Test key**. The key stays on your phone.
- **Tolerance presets**: edit, add or reset.
- **Checking rules**: gross error limit (default 500 mm) and the marginal level (default 80 %).
- **Project details & logos**: see below.
- **Appearance**: choose Auto (follow system), Slate & ember, Ocean teal, Forest green, Plum or Graphite dark. *Auto* switches to the dark theme when your phone is in dark mode.
- **Language**: choose English or Bahasa Malaysia for core interface labels and report/share outputs.
- **App sharing link**: the hosted address is detected automatically. Set an optional HTTP(S) override only if needed.
- **Data**: backup and restore, sample data, clear all. Restore backup also accepts a shared check-transfer JSON file.

When hosted, the app checks for service-worker updates while online and shows an in-app reload prompt after new files take control. Updates are not push notifications and are not checked while the app is closed/offline.

![Appearance and sharing-link settings](guide/images/07-appearance.png)

### Setting up a project (WP13, WP14, other jobs)

1. Switch to the project (tap the code at the top left).
2. **Setup → Project details & logos**, or **WP13 ▾ → Edit project details & logos**.
3. Enter the project code, title (as it should appear on the report), contract no., RFI prefix and teams.
4. Upload the logos: left (client), right (default, e.g. the contractor), and a right logo for each team if wanted (e.g. the consultant's logo when the team is CST).
5. **Save** keeps it on this phone. **Export project file** saves a `.json` file: send it to the app administrator to upload to `packages/`, or share it so others can use **+ Add project from file**.

## Tips

- Check your control first: a mean shift in the same direction on every point usually points to the set-up.
- Use point names that match the drawing or the setting-out schedule, so that *Merge by point name* works.
- Export the register CSV every week (**Register → Export CSV**) and keep it with the project files.
