const staticCacheName = 'currencyConverter-static-v4';

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(staticCacheName).then(function (cache) {
            return cache.addAll([
                'https://zelalemgta.github.io/Currency-Converter/',
                'https://zelalemgta.github.io/Currency-Converter/js/main.js',
                'https://zelalemgta.github.io/Currency-Converter/js/idb/idb.js',
                'https://zelalemgta.github.io/Currency-Converter/css/main.css',
                'https://stackpath.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css',
                'https://use.fontawesome.com/releases/v5.1.0/css/all.css',
                'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.2/Chart.min.js'
            ]);
        }).then(_ => {
            // This will enable the App to automatically update itself without user interaction
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.filter(function (cacheName) {
                    return cacheName.startsWith('currencyConverter-') &&
                        cacheName != staticCacheName
                }).map(function (cacheName) {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    var requestUrl = new URL(event.request.url);

    if (requestUrl.origin === location.origin) {
        if (requestUrl.pathname === '/') {
            event.respondWith(caches.match('/'));
            return;
        }
    }

    event.respondWith(
        caches.match(event.request).then(function(response) {
          return response || fetch(event.request);
        })
      );
});