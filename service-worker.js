const CACHE_NAME = 'edc-route-manager-v28';

// ឯកសារខ្លួនឯង (local assets)
const LOCAL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './utils.js',
  './db.js',
  './storage.js',
  './excel.js',
  './route.js',
  './ui.js',
  './export.js',
  './jobs.js',
  './digitalbill.js',
  './sorting-mode.js',
  './manifest.json',
  './icon.svg'
];

// 📚 Library ខាងក្រៅដែលត្រូវការសម្រាប់ Import/Export Excel — ត្រូវ cache ដើម្បីអោយដំណើរការក្នុងលក្ខណៈ Offline ពិតប្រាកដ
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.1.200/pdf.min.mjs',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.1.200/pdf.worker.min.mjs'
];

// ដំឡើងការចងចាំ Cache លើទូរស័ព្ទដៃ
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            // ឯកសារខ្លួនឯង ត្រូវតែ cache បានទាំងអស់ បើមួយណាបរាជ័យ ចាត់ទុកថា install បរាជ័យ
            await cache.addAll(LOCAL_ASSETS);

            // Library ខាងក្រៅ៖ ព្យាយាម cache ម្តងមួយៗ ដើម្បីកុំអោយ CDN មួយដួល រំខានអស់ទាំងអស់
            await Promise.all(CDN_ASSETS.map(async (url) => {
                try {
                    const response = await fetch(url, { mode: 'cors' });
                    if (response && response.ok) await cache.put(url, response);
                } catch (err) {
                    console.warn('⚠️ មិនអាច cache library:', url, err);
                }
            }));
        }).then(() => self.skipWaiting())
    );
});

// សម្អាត Cache ចាស់ៗចោលពេលមានការ update កូដថ្មី
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            );
        }).then(() => self.clients.claim())
    );
});

// ទាញយកទិន្នន័យពី Cache មកប្រើភ្លាមៗ ទោះបីជាដាច់អ៊ីនធឺណិត
// បើគ្មានក្នុង cache ព្យាយាមទាញពី network ហើយ cache ទុកសម្រាប់លើកក្រោយ
self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;

    e.respondWith(
        caches.match(e.request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;

            return fetch(e.request).then(networkResponse => {
                if (networkResponse && networkResponse.ok) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, responseClone));
                }
                return networkResponse;
            }).catch(() => {
                return new Response('Offline: resource not cached', { status: 503, statusText: 'Offline' });
            });
        })
    );
});
