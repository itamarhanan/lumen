(function () {
  "use strict";

  // Config
  var cfg = window.__LUMEN__;
  var SITE_ID = cfg && cfg.siteId;
  var INGEST_URL = cfg && cfg.ingestUrl;

  if (!SITE_ID || !INGEST_URL) {
    var script = document.currentScript;
    SITE_ID = script && script.dataset.siteId;
    INGEST_URL = script && script.dataset.ingestUrl;
  }

  if (!SITE_ID || !INGEST_URL) return; // misconfigured, bail silently

  // Session
  var SESSION_KEY = "lumen_sid";
  var TRAITS_KEY = "lumen_traits";

  function getSessionId() {
    var sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  }

  function getTraits() {
    try {
      return JSON.parse(sessionStorage.getItem(TRAITS_KEY) || "{}");
    } catch (_) {
      return {};
    }
  }

  function setTraits(incoming) {
    var merged = Object.assign(getTraits(), incoming);
    // coerce all values to string — ClickHouse Map(String,String)
    var coerced = {};
    for (var k in merged) coerced[k] = String(merged[k]);
    sessionStorage.setItem(TRAITS_KEY, JSON.stringify(coerced));
  }

  // Send
  function send(payload) {
    var body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      var blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(INGEST_URL, blob);
    } else {
      fetch(INGEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
        keepalive: true,
      }).catch(function () {}); // analytics must never throw
    }
  }

  // Track
  var lastUrl = null;

  function track(type, name, eventMeta) {
    var url = location.href;

    // dedupe pageviews
    if (type === "pageview") {
      if (url === lastUrl) return;
      lastUrl = url;
    }

    var meta = Object.assign(getTraits(), eventMeta || {});

    send({
      siteId: SITE_ID,
      sessionId: getSessionId(),
      type: type,
      url: url,
      referrer: document.referrer || "",
      name: name || undefined,
      meta: Object.keys(meta).length ? meta : undefined,
      timestamp: Date.now(),
    });
  }

  // SPA
  var _push = history.pushState.bind(history);
  history.pushState = function () {
    _push.apply(history, arguments);
    track("pageview");
  };
  window.addEventListener("popstate", function () {
    track("pageview");
  });

  // Public API
  var api = {
    pageview: function () { track("pageview"); },
    event: function (name, meta) { track("custom", name, meta); },
    set: function (traits) { setTraits(traits); },
  };

  // Drain pre-load queue (supports both [method, ...args] and function calls)
  var queue = Array.isArray(window.lumen) ? window.lumen.slice() : [];
  for (var i = 0; i < queue.length; i++) {
    var item = queue[i];
    if (typeof item === "function") item();
    else if (Array.isArray(item)) api[item[0]].apply(null, item.slice(1));
  }

  // Replace window.lumen with the API object, keeping it callable
  var fn = function (cmd, arg1, arg2) {
    if (cmd === "pageview") return api.pageview();
    if (cmd === "event") return api.event(arg1, arg2);
    if (cmd === "set") return api.set(arg1);
  };
  for (var k in api) fn[k] = api[k];
  window.lumen = fn;

  // Auto pageview
  api.pageview();
})();
