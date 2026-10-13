const CACHE_NAME='pixedit-shell-v3';
const SHELL=['/','/index.html','/manifest.json','/icons/icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))));self.clients.claim();});
self.addEventListener('fetch',event=>{const request=event.request;const url=new URL(request.url);if(url.origin!==self.location.origin||request.method!=='GET')return;
event.respondWith(fetch(request).then(response=>{if(response.ok&&request.mode==='navigate'){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put('/index.html',copy));}return response;}).catch(()=>caches.match(request).then(cached=>cached||caches.match('/index.html'))));});
