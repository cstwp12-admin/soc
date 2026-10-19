# Third-party notices

Set-Out Check includes the following open-source components, unchanged, so that it works offline. Each keeps its own licence. None is "copyleft": they allow use in an app under any licence, provided these notices are kept.

| Component | File(s) | Licence | Copyright |
|---|---|---|---|
| jsPDF 2.5.2 | `lib/jspdf.umd.min.js` | MIT | © 2010–2021 James Hall, yWorks GmbH and contributors |
| jsPDF-AutoTable 3.8.4 | `lib/jspdf.plugin.autotable.min.js` | MIT | © 2024 Simon Bengtsson |
| QR Code Generator for JavaScript 1.4.4 | `lib/qrcode.min.js` | MIT | © 2009 Kazuhiko Arase |
| jsQR | `lib/jsQR.min.js` | Apache License 2.0 | © Cozmo Cesar |
| SheetJS Community Edition 0.20-series build (reads `version 1.15.0` codepage table) | `lib/xlsx.full.min.js` | Apache License 2.0 | © 2012–present SheetJS LLC |
| PDF.js | `lib/pdfjs.min.js`, `lib/pdfjs.worker.min.js` (loaded only when a PDF schedule is imported) | Apache License 2.0 | © Mozilla Foundation |
| Tesseract.js, tesseract.js-core | `lib/tesseract/*.js` | Apache License 2.0 (see `lib/tesseract/LICENSE-tesseract.js.md`) | © Jerome Wu and contributors; Tesseract OCR © Google and contributors |
| Tesseract English language data | `lib/tesseract/lang/eng.traineddata.gz` | Apache License 2.0 | © Google and contributors |
| Barlow, Barlow Condensed, IBM Plex Mono (loaded from Google Fonts at run time, not bundled) | n/a | SIL Open Font License 1.1 | © The Barlow Project Authors; © IBM Corp. |

The rest of the app is original work by WPN (see [LICENSE.md](LICENSE.md)).

## MIT licence (jsPDF, jsPDF-AutoTable, QR Code Generator)

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Apache License 2.0 (PDF.js, jsQR, SheetJS, Tesseract.js and its language data)

The full text is in `lib/tesseract/LICENSE-tesseract.js.md` and at https://www.apache.org/licenses/LICENSE-2.0. The files are used unmodified.

**To check before publishing:** confirm the exact SheetJS build and licence against https://git.sheetjs.com/sheetjs/sheetjs, and the jsQR licence against its repository.
