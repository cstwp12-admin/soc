/* Set-Out Check - offline cache. Bump C when files change. */
const C = "soc-v2.0.0-rc.3";
const PRE = ["./", "index.html", "style.css", "app.js", "scanner.js", "report.js", "events.js", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png",
  "lib/jspdf.umd.min.js", "lib/jspdf.plugin.autotable.min.js", "lib/qrcode.min.js", "lib/xlsx.full.min.js",
  "packages/index.json", "packages/WP12.json", "packages/WP13.json", "packages/WP14.json", "packages/OTHER.json",
  "packages/logos/jkr-sabah.png", "packages/logos/azam-jaya.png", "packages/logos/py-konsep.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => Promise.all(PRE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url); if (u.origin !== location.origin) return;
  // network first so updates arrive; cache when offline (ignore ?p= on the page)
  e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match("index.html"))));
});
