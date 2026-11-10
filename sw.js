// ==== Firebase Cloud Messaging（バックグラウンド通知） ====
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAAAwAdsciNyukTSzLvwTZ9P27_vs63k_g",
    authDomain: "oshi-cal-d3091.firebaseapp.com",
    projectId: "oshi-cal-d3091",
    storageBucket: "oshi-cal-d3091.firebasestorage.app",
    messagingSenderId: "896634384335",
    appId: "1:896634384335:web:8ebb3207a612fe0676acba"
});

const messaging = firebase.messaging();

// アプリが閉じている・バックグラウンドの時に届いた通知を表示する
// フェーズ5: 送信側が付けた data（eventId / type / url）を受け取り、
// 通知タップでそのイベントを開けるようにする。tagもイベント単位にする
// （同じイベントの変更通知が何枚も重ならないように）。
messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = (payload.notification && payload.notification.title) || data.title || '新しいライブ予定が追加されました🎫';
    const body = (payload.notification && payload.notification.body) || data.body || '';
    self.registration.showNotification(title, {
        body: body,
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: data.eventId ? 'oshi-cal-' + (data.type || 'event') + '-' + data.eventId : 'oshi-cal-new-event',
        data: { url: data.url || './index.html', eventId: data.eventId || '' }
    });
});

const CACHE_NAME = 'oshi-cal-v2';
const CORE_ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// オフライン時は簡易キャッシュから、通常はネットワークを優先
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        fetch(event.request)
            .then((res) => {
                const resClone = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone)).catch(() => {});
                return res;
            })
            .catch(() => caches.match(event.request))
    );
});

// アプリから postMessage で通知表示を依頼された時に処理
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body } = event.data;
        self.registration.showNotification(title, {
            body: body,
            icon: './icon-192.png',
            badge: './icon-192.png',
            tag: 'oshi-cal-new-event',
            data: { url: event.data.url || './index.html' }
        });
    }
});

// 通知タップでアプリを前面に（data.url があればそのイベントへ直接開く）
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || './index.html';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    if ('navigate' in client) {
                        return client.navigate(targetUrl).then((c) => (c || client).focus()).catch(() => client.focus());
                    }
                    return client.focus();
                }
            }
            if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
        })
    );
});
