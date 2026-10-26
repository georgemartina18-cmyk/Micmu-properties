/* Cache only the public offline page and owned static illustration. Never cache
   property responses, APIs, authentication, dashboards or customer documents. */
const CACHE='micmu-public-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/offline','/architecture.svg'])));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('micmu-public-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 if(/^\/(api|auth|admin|dashboard|login|reset-password)(\/|$)/.test(url.pathname))return;
 if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.match('/offline')));
 else if(url.pathname==='/architecture.svg')event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
