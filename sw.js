/* Italiano offline support (cache-first). Updates are fetched by the page; see checkForUpdate in index.html. */
var CACHE = "italiano-app", FONTS = "italiano-fonts";
var FILES = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(FILES.map(function (f) { return fetch(f, { cache: "no-store" }).then(function (r) { if (r.ok) return c.put(f, r); }); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== FONTS; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  // Google Fonts: keep a copy so the app looks the same offline
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; });
      });
    }).catch(function () { return fetch(req); }));
    return;
  }
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith("version.json") || url.search.indexOf("t=") >= 0) return;  // update checks always go to the network
  if (req.mode === "navigate") {
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match("index.html").then(function (hit) {
        return hit || fetch(req).then(function (res) { c.put("index.html", res.clone()); return res; });
      });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
});
