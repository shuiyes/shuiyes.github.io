/**
 * run in service worker
 */
const queue = [];
let swMod;

self.onfetch = function(e) {
  const req = e.request;
  const url = req.url;

  // console.log('[sw_loader] fetch {mode: %o, url: %o, hdr: %o}',
  //   req.mode, url, new Map(req.headers)
  // );

  // bypass Mixed-Content
  if (/^http:/.test(url)) {
    return;
  }

  e.respondWith(swMod ?
    swMod.onfetch(e) :
    new Promise((y, n) =>
      queue.push([e, y, n]))
  );
};

self.onactivate = function(e) {
  console.log('[sw_loader] onactivate');
  clients.claim();
};

self.oninstall = function(e) {
  console.log('[sw_loader] oninstall');
  skipWaiting();
};

self.onerror = function(e) {
  console.log('[sw_loader] sw error:', e);
};

async function run(code) {
  const mod = {};

  const fn = Function('exports', code);
  fn(mod);

  if (swMod) {
    swMod.onterm();
  }
  await mod.oninit();
  swMod = mod;

  queue.forEach(args => {
    const [e, y, n] = args;
    swMod.onfetch(e).then(y).catch(n);
  });
  queue.length = 0;
}

function extractSwMain(code) {
  const m = code.match(/\\;{3}.+?\\;{3,}/);
  return m && m[0]
	.replace(/\\\/g, '\')
    .replace(/\\\\t/g, '\\t')
    .replace(/\\\\\"/g, '\\\"')
    .replace(/\\\\\\\\/g, '\\\\')
}

async function load() {
  let oldSw;
  let cache = await caches.open('sys');
  let req = new Request('sw_main');
  let res = await cache.match(req);

  if (res) {
    oldSw = await res.text();
  } else {
    // if cache is missing, we use the default
    // module which defined in boot.js
    oldSw = SW_MAIN;
  }

  // init
  await run(oldSw);

  // fetch latest version
  let url = location.href;
  url += '?_=' + Date.now();
  res = await fetch(url);

  // if sw_main modified, cache and run
  let newJs = await res.text();
  let newSw = extractSwMain(newJs);
  console.assert(newSw);

  if (newSw !== oldSw) {
    cache.put(req, new Response(newSw));
    console.log('[sw_loader] sw_main updated. run next time.');
  }
}

load();