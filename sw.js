const CACHE_NAME = "manabi-adventure-v20260717-learning-01";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css?v=20260717-learning-01",
  "./script.js?v=20260717-learning-01",
  "./manifest.webmanifest?v=20260717-learning-01",
  "./icon.svg?v=20260717-learning-01",
  "./icon-192.png",
  "./icon-512.png",
  "./assets/title-hero.png",
  "./assets/chara01_kurage.png",
  "./assets/chara02_fugu.png",
  "./assets/hyakunin_full_lines_with_poets.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const acceptsHtml = event.request.headers.get("accept")?.includes("text/html");
  if (event.request.mode === "navigate" || acceptsHtml) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("./index.html")))
  );
});
