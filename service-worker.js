const CACHE_NAME = "happy-birds-appstore-stable-v5-no-start-lives-reset";
const FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./game.js",
  "./manifest.webmanifest",
  "./service-worker.js",
  "./audio/background_music.wav",
  "./assets/bird-classic.svg",
  "./assets/bird-bluejay.svg",
  "./assets/bird-ruby.svg",
  "./assets/bird-mint.svg",
  "./assets/pipe.svg",
  "./assets/enemy-bird.svg",
  "./assets/heart.svg",
  "./assets/coin.svg",
  "./assets/icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : undefined)))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match("./index.html")))
  );
});
