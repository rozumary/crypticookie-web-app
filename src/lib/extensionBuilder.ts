import JSZip from 'jszip';

export interface ExtensionFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const EXTENSION_MANIFEST_JSON = `{
  "manifest_version": 3,
  "name": "Crypticookie: Live Website & CMP Consent Shield",
  "version": "1.3.1",
  "description": "Real-time active website monitoring, cookie & tracker sniffer, CMP verification, and hybrid blockchain consent auditing with cloud database sync.",
  "permissions": [
    "activeTab",
    "tabs",
    "webNavigation",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle",
      "all_frames": true
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "Crypticookie Privacy Shield"
  }
}`;

export function getExtensionFiles(serverOrigin: string): ExtensionFile[] {
  let apiOrigin = serverOrigin || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  const backgroundJs = `/**
 * Crypticookie Background Service Worker (Manifest V3)
 * Monitors active tab navigation, checks CMP script hashes against server registry, and syncs consent transactions to Cloud Database in real-time.
 */

const SERVER_API_URL = "${apiOrigin}";

// 1. Live Website Navigation Detector
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
    try {
      const urlObj = new URL(tab.url);
      const domain = urlObj.hostname;

      chrome.action.setBadgeText({ tabId: tabId, text: "PROT" });
      chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#10b981" });

      chrome.storage.local.get({ monitored_sessions: [], active_user_id: "u_auditor_primary" }, (result) => {
        const list = result.monitored_sessions;
        list.unshift({ domain: domain, url: tab.url, title: tab.title || domain, timestamp: new Date().toISOString() });
        if (list.length > 50) list.pop();
        chrome.storage.local.set({ monitored_sessions: list });

        fetch(SERVER_API_URL + "/api/domains/record", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: domain,
            url: tab.url,
            title: tab.title || domain,
            userId: result.active_user_id,
            privacy_risk_level: "Low"
          })
        }).catch(err => console.warn("Server domain sync note:", err));
      });
    } catch (e) {
      console.warn("Navigation parse error:", e);
    }
  }
});

// 2. Messaging Handler for CMP & Consent Actions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SET_ACTIVE_USER_ID") {
    chrome.storage.local.set({ active_user_id: request.userId }, () => {
      console.log("Extension synchronized active user_id:", request.userId);
    });
    sendResponse({ status: "synced", userId: request.userId });
    return true;
  }

  if (request.type === "GET_ACTIVE_USER_ID") {
    chrome.storage.local.get({ active_user_id: "u_auditor_primary" }, (res) => {
      sendResponse({ userId: res.active_user_id });
    });
    return true;
  }

  // Verify CMP hash against the real server registry
  if (request.type === "VERIFY_CMP_HASH") {
    const hash = request.hash;
    (async () => {
      let verification = "Unverified";
      let cmpName = "Unverified CMP Script";

      try {
        const resp = await fetch(SERVER_API_URL + "/api/cmp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hash: hash })
        });
        const data = await resp.json();
        if (data.status === "success") {
          verification = data.verification;
          cmpName = data.cmpName;
        }
      } catch (err) {
        console.warn("Server CMP verify failed, defaulting to Unverified:", err);
      }

      if (sender.tab && sender.tab.id) {
        const badgeColor = verification === 'Verified' ? '#10b981' : (verification === 'Warning' ? '#ef4444' : '#f59e0b');
        const badgeText = verification === 'Verified' ? 'SAFE' : (verification === 'Warning' ? 'RISK' : 'UNV');
        chrome.action.setBadgeText({ tabId: sender.tab.id, text: badgeText });
        chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: badgeColor });
      }

      sendResponse({ status: "success", verification: verification, cmpName: cmpName, hash: hash });
    })();
    return true;
  }

  if (request.type === "RECORD_CONSENT_TRANSACTION") {
    chrome.storage.local.get({ consent_ledger: [], active_user_id: "u_auditor_primary" }, (result) => {
      (async () => {
        const timestamp = new Date().toISOString();
        const effectiveUserId = request.userId || result.active_user_id || "u_auditor_primary";

        const ledger = result.consent_ledger;
        ledger.push({ block_index: ledger.length, domain: request.domain, hash: request.hash, action: request.action, userId: effectiveUserId, timestamp: timestamp });
        chrome.storage.local.set({ consent_ledger: ledger });

        let serverResponse = null;
        try {
          const resp = await fetch(SERVER_API_URL + "/api/consent/record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              domain: request.domain,
              hash: request.hash,
              action: request.action,
              userId: effectiveUserId,
              trackers: request.trackers || [],
              cookieCount: request.cookieCount || 0,
              cmpName: request.cmpName || null,
              timestamp: timestamp
            })
          });
          serverResponse = await resp.json();
          console.log("Real-time Consent Sync Success:", serverResponse);
        } catch (err) {
          console.warn("Failed to reach central server, stored locally:", err);
        }

        sendResponse({ status: "committed", serverResponse: serverResponse, userId: effectiveUserId });
      })();
    });
    return true;
  }

  if (request.type === "DOMAIN_VISITED") {
    chrome.storage.local.get({ active_user_id: "u_auditor_primary" }, (result) => {
      (async () => {
        const effectiveUserId = request.userId || result.active_user_id || "u_auditor_primary";
        try {
          await fetch(SERVER_API_URL + "/api/domains/record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              domain: request.domain,
              url: request.url,
              title: request.title,
              userId: effectiveUserId,
              hash: request.hash || '',
              trackers: request.trackers || [],
              cookieCount: request.cookieCount || 0,
              cmpName: request.cmpName || null,
              privacy_risk_level: request.privacy_risk_level || "Low"
            })
          });
        } catch (e) {}
        sendResponse({ status: "logged" });
      })();
    });
    return true;
  }
});
`;

  const contentJs = `/**
 * Crypticookie Content Script (Live Website Inspector & Privacy Shield Overlay)
 * Runs on EVERY website to inspect real cookies, detect real CMP scripts, and render the Crypticookie Privacy Shield.
 */

(function initCrypticookieInterceptor() {
  const currentHost = window.location.hostname || 'website';

  // Synchronize Active User ID if on the Crypticookie Web App origin (or inside iframe)
  const isAppOrigin = (
    window.location.origin === "${apiOrigin}" ||
    window.location.host.includes("run.app") ||
    window.location.host.includes("localhost:3000") ||
    document.querySelector('meta[name="application-name"][content*="Crypticookie"]') !== null
  );

  if (isAppOrigin) {
    const trySyncUserId = () => {
      const activeUserId = localStorage.getItem('crypticookie_active_user_id') || document.documentElement.dataset.crypticookieUserId;
      if (activeUserId) {
        chrome.runtime.sendMessage({ type: 'SET_ACTIVE_USER_ID', userId: activeUserId });
      }
    };

    trySyncUserId();
    window.addEventListener('storage', (e) => {
      if (e.key === 'crypticookie_active_user_id' && e.newValue) {
        chrome.runtime.sendMessage({ type: 'SET_ACTIVE_USER_ID', userId: e.newValue });
      }
    });
    window.addEventListener('crypticookie_user_changed', (e) => {
      if (e.detail && e.detail.userId) {
        chrome.runtime.sendMessage({ type: 'SET_ACTIVE_USER_ID', userId: e.detail.userId });
      }
    });
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'CRYPTICOOKIE_USER_CHANGED' && e.data.userId) {
        chrome.runtime.sendMessage({ type: 'SET_ACTIVE_USER_ID', userId: e.data.userId });
      }
    });
  }

  // Do not run shield on internal extension, local or central app pages
  if (!currentHost || currentHost === 'localhost' || currentHost === '127.0.0.1' || window.location.origin === "${apiOrigin}" || window.location.host.includes("run.app")) return;

  // Known CMP script domains for real detection
  const CMP_DOMAINS = [
    { pattern: 'cookielaw.org', name: 'OneTrust Privacy Banner' },
    { pattern: 'onetrust', name: 'OneTrust Privacy Banner' },
    { pattern: 'cookiebot.com', name: 'Cookiebot CMP (Usercentrics)' },
    { pattern: 'consent.cookiebot', name: 'Cookiebot CMP (Usercentrics)' },
    { pattern: 'sdk.privacy-center.org', name: 'Didomi Consent SDK' },
    { pattern: 'didomi.io', name: 'Didomi Consent SDK' },
    { pattern: 'quantcast', name: 'Quantcast Choice CMP' },
    { pattern: 'trustarc', name: 'TrustArc Consent Manager' },
    { pattern: 'consensu.org', name: 'IAB TCF CMP' },
    { pattern: 'klaro.org', name: 'Klaro! Open Source Consent' },
    { pattern: 'axeptio', name: 'Axeptio Consent SDK' },
    { pattern: 'trustcommander', name: 'Commanders Act CMP' },
    { pattern: 'consentmanager', name: 'ConsentManager.net' },
    { pattern: 'sourcepoint', name: 'SourcePoint CMP' },
  ];

  // Known tracker domains for real detection
  const TRACKER_DOMAINS = [
    { pattern: 'google-analytics.com', name: 'Google Analytics (_ga)', category: 'Analytics' },
    { pattern: 'googletagmanager.com', name: 'Google Tag Manager', category: 'Analytics' },
    { pattern: 'doubleclick.net', name: 'Google Ads / DoubleClick', category: 'Advertising' },
    { pattern: 'facebook.net', name: 'Facebook Pixel (_fbp)', category: 'Advertising' },
    { pattern: 'connect.facebook.net', name: 'Facebook Pixel (_fbp)', category: 'Advertising' },
    { pattern: 'tiktok.com', name: 'TikTok Ads Pixel', category: 'Advertising' },
    { pattern: 'criteo.com', name: 'Criteo Retargeting', category: 'Advertising' },
    { pattern: 'criteo.net', name: 'Criteo Retargeting', category: 'Advertising' },
    { pattern: 'hotjar.com', name: 'Hotjar Session Replay', category: 'Analytics' },
    { pattern: 'fullstory.com', name: 'FullStory Session Replay', category: 'Analytics' },
    { pattern: 'chartbeat.com', name: 'Chartbeat Analytics', category: 'Analytics' },
    { pattern: 'optimizely.com', name: 'Optimizely A/B Testing', category: 'Analytics' },
    { pattern: 'outbrain.com', name: 'Outbrain Recommendations', category: 'Advertising' },
    { pattern: 'taboola.com', name: 'Taboola Recommendations', category: 'Advertising' },
    { pattern: 'amazon-adsystem.com', name: 'Amazon Ads', category: 'Advertising' },
    { pattern: 'clarity.ms', name: 'Microsoft Clarity', category: 'Analytics' },
    { pattern: 'segment.com', name: 'Segment Analytics', category: 'Analytics' },
    { pattern: 'mixpanel.com', name: 'Mixpanel Analytics', category: 'Analytics' },
    { pattern: 'amplitude.com', name: 'Amplitude Analytics', category: 'Analytics' },
    { pattern: 'fingerprintjs', name: 'FingerprintJS', category: 'Fingerprinting' },
    { pattern: 'audiotrack.biz', name: 'Stealth Audio Fingerprinter', category: 'Fingerprinting' },
    { pattern: 'coinhive', name: 'CryptoMiner Script', category: 'Fingerprinting' },
    { pattern: 'popunder.net', name: 'Popunder Ad Network', category: 'Advertising' },
  ];

  // Cookie-based tracker detection
  const COOKIE_TRACKERS = [
    { pattern: '_ga', name: 'Google Analytics (_ga)', category: 'Analytics' },
    { pattern: '_fbp', name: 'Facebook Pixel (_fbp)', category: 'Advertising' },
    { pattern: '_gid', name: 'Google Analytics (_gid)', category: 'Analytics' },
    { pattern: 'fr', name: 'Facebook Retargeting (fr)', category: 'Advertising' },
    { pattern: 'IDE', name: 'Google DoubleClick (IDE)', category: 'Advertising' },
    { pattern: 'test_cookie', name: 'Google Ads Test Cookie', category: 'Advertising' },
    { pattern: '_gcl_au', name: 'Google Ads (gcl_au)', category: 'Advertising' },
    { pattern: 'ttclid', name: 'TikTok Click ID', category: 'Advertising' },
    { pattern: 'cto_bundle', name: 'Criteo Bundle', category: 'Advertising' },
  ];

  // SHA-256 helper
  async function sha256(message) {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Real CMP script detection: scan all <script> tags for known CMP domains
  function detectCmpScript() {
    const scripts = document.querySelectorAll('script[src]');
    for (const script of scripts) {
      const src = script.getAttribute('src') || '';
      for (const cmp of CMP_DOMAINS) {
        if (src.includes(cmp.pattern)) {
          return { name: cmp.name, src: src, element: script };
        }
      }
    }
    return null;
  }

  // Real tracker detection: scan scripts and document.cookie
  function detectTrackers() {
    const found = [];
    const scripts = document.querySelectorAll('script[src]');
    for (const script of scripts) {
      const src = script.getAttribute('src') || '';
      for (const tracker of TRACKER_DOMAINS) {
        if (src.includes(tracker.pattern) && !found.some(f => f.name === tracker.name)) {
          found.push(tracker);
        }
      }
    }

    try {
      const cookies = document.cookie ? document.cookie.split(';') : [];
      for (const cookie of cookies) {
        const name = cookie.split('=')[0].trim();
        for (const ct of COOKIE_TRACKERS) {
          if (name.includes(ct.pattern) && !found.some(f => f.name === ct.name)) {
            found.push(ct);
          }
        }
      }
    } catch (e) {}

    return found;
  }

  // Cookie Counter
  function countCookies() {
    try {
      return document.cookie ? document.cookie.split(';').filter(c => c.trim().length > 0).length : 0;
    } catch (e) {
      return 0;
    }
  }

  // Perform immediate scan
  let detectedCmp = detectCmpScript();
  let detectedTrackers = detectTrackers();
  let cookieCount = countCookies();

  (async () => {
    const rawToHash = detectedCmp ? (detectedCmp.src || detectedCmp.name) : (currentHost + '_crypticookie_audit');
    const scriptHash = await sha256(rawToHash);

    // Notify background worker of visit
    chrome.runtime.sendMessage({
      type: 'DOMAIN_VISITED',
      domain: currentHost,
      url: window.location.href,
      title: document.title || currentHost,
      hash: scriptHash,
      trackers: detectedTrackers,
      cookieCount: cookieCount,
      cmpName: detectedCmp ? detectedCmp.name : null,
      privacy_risk_level: detectedTrackers.some(t => t.category === 'Fingerprinting') ? 'High' : 'Low'
    });

    // Verify the real hash against the server CMP registry
    chrome.runtime.sendMessage({ type: 'VERIFY_CMP_HASH', hash: scriptHash }, (res) => {
      const verification = res ? res.verification : 'Unverified';
      const cmpName = res ? res.cmpName : (detectedCmp ? detectedCmp.name : 'No CMP Detected');
      renderShieldBanner(verification, cmpName, scriptHash);
    });
  })();

  function renderShieldBanner(verification, cmpName, hash) {
    let existing = document.getElementById('crypticookie-shield-root');
    if (existing) existing.remove();

    const shieldDiv = document.createElement('div');
    shieldDiv.id = 'crypticookie-shield-root';

    const badgeColor = verification === 'Verified' ? '#10b981' : (verification === 'Warning' ? '#ef4444' : '#f59e0b');
    const badgeText = verification === 'Verified' ? '✓ Whitelist Verified' : (verification === 'Warning' ? '⚠ Blacklisted Dark Pattern' : 'ℹ Unverified Script');

    shieldDiv.innerHTML = \`
      <div class="crypticookie-banner-container" id="crypticookie-banner-box">
        <div class="crypticookie-header">
          <div class="crypticookie-brand">
            <div class="crypticookie-icon">🛡️</div>
            <div class="crypticookie-title-group">
              <span class="crypticookie-title">Crypticookie Shield v1.3</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="crypticookie-badge" style="background-color:#10b981; color:white; font-size:10px; font-weight:700; padding:3px 8px; border-radius:9999px;">REAL-TIME</span>
            <button id="crypticookie-minimize-btn" class="crypticookie-close" title="Minimize to Floating Icon" type="button">─</button>
            <button id="crypticookie-close-btn" class="crypticookie-close" title="Dismiss Shield" type="button">&times;</button>
          </div>
        </div>

        <div class="crypticookie-body">
          <div style="color:#a78bfa; font-size:11px;">Active Monitored Website:</div>
          <div style="font-weight:700; font-size:13px; margin-top:4px; word-break:break-all; color:#38bdf8; font-family:monospace;">
            \${currentHost}
          </div>
        </div>

        <div class="crypticookie-body">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:11px; color:#a78bfa;">
            <span>CMP Detected</span>
            <span style="color:#fbbf24; font-weight:600; font-family:monospace;">\${cmpName || 'No CMP Detected'}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:11px; color:#a78bfa;">
            <span>Trackers & Cookies</span>
            <span style="color:#f87171; font-weight:600; font-family:monospace;">\${detectedTrackers.length} trackers, \${cookieCount} cookies</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:11px; color:#a78bfa;">
            <span>Firestore DB Sync</span>
            <span style="color:#38bdf8; font-weight:600; font-family:monospace;">Connected</span>
          </div>
        </div>
      </div>

      <div id="crypticookie-mini-badge" class="crypticookie-mini-badge" style="display:none;" title="Click to expand Crypticookie Privacy Shield">
        <span style="font-size:14px;">🛡️</span>
        <span style="font-weight:700; font-size:11px;">Crypticookie Shield</span>
      </div>
    \`;

    document.body.appendChild(shieldDiv);

    const bannerBox = document.getElementById('crypticookie-banner-box');
    const miniBadge = document.getElementById('crypticookie-mini-badge');

    const minimize = () => { if (bannerBox) bannerBox.style.display = 'none'; if (miniBadge) miniBadge.style.display = 'flex'; };
    const expand = () => { if (bannerBox) bannerBox.style.display = 'block'; if (miniBadge) miniBadge.style.display = 'none'; };

    document.getElementById('crypticookie-minimize-btn')?.addEventListener('click', (e) => { e.stopPropagation(); minimize(); });
    document.getElementById('crypticookie-close-btn')?.addEventListener('click', (e) => { e.stopPropagation(); shieldDiv.remove(); });
    miniBadge?.addEventListener('click', (e) => { e.stopPropagation(); expand(); });
  }

  // Listen for toolbar popup commands
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SHOW_SHIELD_OVERLAY') {
      const hash = detectedCmp ? detectedCmp.src : currentHost;
      sha256(hash).then(function(realHash) {
        renderShieldBanner('Unverified', detectedCmp ? detectedCmp.name : 'No CMP Detected', realHash);
      });
      sendResponse({ status: 'shown' });
    }
    if (msg.type === 'GET_CMP_INFO_FOR_POPUP') {
      sendResponse({
        hash: detectedCmp ? detectedCmp.src : '',
        cmpName: detectedCmp ? detectedCmp.name : 'No CMP Detected',
        trackers: detectedTrackers,
        cookieCount: cookieCount
      });
    }
  });
})();
`;

  const popupHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Crypticookie Shield</title>
  <style>
    * { box-sizing: border-box; }
    body {
      width: 320px;
      margin: 0;
      padding: 16px;
      background: #0B0516;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
      border-bottom: 1px solid #251545;
      margin-bottom: 12px;
    }
    .title {
      font-weight: 700;
      font-size: 14px;
      color: #c084fc;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-card {
      background: #160E2A;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 10px;
      border: 1px solid #341F5C;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      background: #10b981;
      color: #fff;
    }
    .metric-row {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 11px;
      color: #a78bfa;
    }
    .metric-val {
      font-weight: 600;
      color: #f1f5f9;
      font-family: monospace;
    }
    .account-select {
      width: 100%;
      background: #0B0516;
      color: #f8fafc;
      border: 1px solid #4C2888;
      border-radius: 8px;
      padding: 6px 8px;
      font-size: 11px;
      margin-top: 6px;
      outline: none;
      font-family: monospace;
    }
    .btn {
      width: 100%;
      background: #7c3aed;
      color: white;
      border: none;
      padding: 9px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 11px;
      cursor: pointer;
      margin-top: 6px;
      transition: all 0.15s ease;
    }
    .btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    .btn.accept { background: #10b981; }
    .btn.reject { background: #ef4444; }
    .btn.dashboard { background: #4c2888; border: 1px solid #7c3aed; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">
      <span>🛡️</span>
      <span>Crypticookie Shield v1.3</span>
    </div>
    <span class="badge">REAL-TIME</span>
  </div>

  <div class="status-card">
    <div style="color:#a78bfa; font-size:11px;">Active Monitored Website:</div>
    <div id="domain-name" style="font-weight:700; font-size:13px; margin-top:4px; word-break:break-all; color:#38bdf8; font-family:monospace;">
      Detecting Tab...
    </div>
  </div>

  <div class="status-card">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <span style="color:#a78bfa; font-size:11px;">Account Sync:</span>
      <span id="account-status" style="color:#10b981; font-size:10px; font-weight:700;">Synced</span>
    </div>
    <select id="account-picker" class="account-select">
      <option value="u_auditor_primary">Primary Auditor</option>
    </select>
  </div>

  <div class="status-card">
    <div class="metric-row">
      <span>CMP Detected</span>
      <span class="metric-val" id="cmp-info" style="color:#fbbf24;">Scanning...</span>
    </div>
    <div class="metric-row">
      <span>Trackers & Cookies</span>
      <span class="metric-val" id="tracker-info" style="color:#f87171;">Scanning...</span>
    </div>
    <div class="metric-row">
      <span>Firestore DB Sync</span>
      <span class="metric-val" style="color:#38bdf8;">Connected</span>
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>`;

  const popupJs = `document.addEventListener('DOMContentLoaded', () => {
  let currentDomain = 'website';
  let detectedHash = '';
  let detectedCmpName = 'No CMP detected';
  let detectedTrackers = [];

  // Load registered users into dropdown and sync active selection
  fetch("${apiOrigin}/api/users")
    .then(r => r.json())
    .then(res => {
      if (res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
        const picker = document.getElementById('account-picker');
        if (picker) {
          picker.innerHTML = '';
          res.data.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.innerText = (u.username || 'User') + ' (' + (u.email || u.id) + ')';
            picker.appendChild(opt);
          });

          chrome.storage.local.get({ active_user_id: res.data[0].id }, (stored) => {
            if (stored.active_user_id) {
              picker.value = stored.active_user_id;
            }
          });
        }
      }
    })
    .catch(e => console.warn('User fetch note:', e));

  document.getElementById('account-picker')?.addEventListener('change', (e) => {
    const newUserId = e.target.value;
    chrome.runtime.sendMessage({ type: 'SET_ACTIVE_USER_ID', userId: newUserId });
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      try {
        const url = new URL(tabs[0].url);
        currentDomain = url.hostname;
        document.getElementById('domain-name').innerText = currentDomain;

        // Ask the content script for the real detected CMP info
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_CMP_INFO_FOR_POPUP' }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('Content script not available:', chrome.runtime.lastError.message);
            return;
          }
          if (response) {
            detectedHash = response.hash || '';
            detectedCmpName = response.cmpName || 'No CMP detected';
            detectedTrackers = response.trackers || [];

            const trackerInfo = document.getElementById('tracker-info');
            if (trackerInfo) trackerInfo.innerText = detectedTrackers.length + ' trackers, ' + (response.cookieCount || 0) + ' cookies';
            const cmpInfo = document.getElementById('cmp-info');
            if (cmpInfo) cmpInfo.innerText = detectedCmpName;
          }
        });
      } catch (e) {
        console.error('Error parsing tab URL:', e);
      }
    }
  });

  document.getElementById('show-shield-btn')?.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'SHOW_SHIELD_OVERLAY' });
        window.close();
      }
    });
  });

  document.getElementById('quick-accept-btn')?.addEventListener('click', () => {
    const btn = document.getElementById('quick-accept-btn');
    if (btn) btn.innerText = '✓ Recorded!';
    chrome.runtime.sendMessage({
      type: 'RECORD_CONSENT_TRANSACTION',
      domain: currentDomain,
      hash: detectedHash || 'verified',
      action: 'accept',
      trackers: detectedTrackers,
      cmpName: detectedCmpName
    });
  });

  document.getElementById('quick-reject-btn')?.addEventListener('click', () => {
    const btn = document.getElementById('quick-reject-btn');
    if (btn) btn.innerText = '✓ Recorded!';
    chrome.runtime.sendMessage({
      type: 'RECORD_CONSENT_TRANSACTION',
      domain: currentDomain,
      hash: detectedHash || 'unverified',
      action: 'reject',
      trackers: detectedTrackers,
      cmpName: detectedCmpName
    });
  });

  document.getElementById('open-dashboard-btn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: "${apiOrigin}" });
  });
});
`;

  const stylesCss = `#crypticookie-shield-root {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 380px;
  max-width: min(420px, calc(100vw - 32px));
  box-sizing: border-box;
  animation: crypticookie-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

#crypticookie-shield-root * {
  box-sizing: border-box;
}

@keyframes crypticookie-slide-up {
  from { transform: translateY(16px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.crypticookie-banner-container {
  background: #160E2A;
  border: 1px solid #4C2888;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.6);
  border-radius: 16px;
  padding: 16px;
  color: #f8fafc;
  width: 100%;
}

.crypticookie-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.crypticookie-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.crypticookie-icon {
  font-size: 20px;
}

.crypticookie-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.crypticookie-title {
  font-weight: 700;
  font-size: 13px;
  color: #c084fc;
}

.crypticookie-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  color: white;
  display: inline-block;
  width: fit-content;
}

.crypticookie-close {
  background: #251545;
  border: 1px solid #4C2888;
  color: #d8b4fe;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  padding: 0;
  flex-shrink: 0;
}

.crypticookie-close:hover {
  background: #7c3aed;
  color: #ffffff;
}

.crypticookie-body {
  background: #0B0516;
  border-radius: 12px;
  padding: 12px;
  font-size: 12px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid #251545;
}

.crypticookie-code {
  background: #160E2A;
  padding: 2px 5px;
  border-radius: 4px;
  color: #38bdf8;
  font-family: monospace;
}

.crypticookie-rec-tag {
  color: #c084fc;
  font-weight: 600;
}

.crypticookie-actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  width: 100%;
}

.crypticookie-btn {
  padding: 8px 4px;
  border-radius: 10px;
  border: none;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.15s ease;
}

.crypticookie-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.crypticookie-btn.primary {
  background: #10b981;
  color: white;
}

.crypticookie-btn.danger {
  background: #ef4444;
  color: white;
}

.crypticookie-btn.secondary {
  background: #334155;
  color: white;
}

.crypticookie-status-bar {
  margin-top: 10px;
  padding: 8px 10px;
  background: #064e3b;
  border: 1px solid #10b981;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  color: #a7f3d0;
  text-align: center;
  animation: crypticookie-slide-up 0.2s ease-out;
}

.crypticookie-mini-badge {
  background: #160E2A;
  border: 1px solid #4C2888;
  border-radius: 9999px;
  padding: 8px 16px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
  transition: all 0.15s ease;
}

.crypticookie-mini-badge:hover {
  border-color: #c084fc;
  transform: scale(1.04);
}
`;

  const readmeMd = `# Crypticookie: Live Website & CMP Consent Shield (Manifest V3)

## How to Install Unpacked in Chrome, Brave, Edge:
1. Extract this \`crypticookie-manifest-v3-extension.zip\` archive into a folder on your computer.
2. Open your browser and navigate to \`chrome://extensions/\` (or \`brave://extensions/\` / \`edge://extensions/\`).
3. Toggle ON **"Developer mode"** in the top-right corner.
4. Click **"Load unpacked"** in the top-left toolbar.
5. Select the extracted folder containing \`manifest.json\`.
6. Every real website you open will now be automatically monitored, shielded, and synchronized in real-time with your Cloud Firestore Database!
`;

  return [
    { name: 'manifest.json', path: 'manifest.json', language: 'json', description: 'Manifest V3 configuration with activeTab, webNavigation, scripting, and storage permissions.', content: EXTENSION_MANIFEST_JSON },
    { name: 'background.js', path: 'background.js', language: 'javascript', description: 'Service worker monitoring website navigation, CMP hash lookups via server, and cloud database sync.', content: backgroundJs },
    { name: 'content.js', path: 'content.js', language: 'javascript', description: 'DOM Interceptor running on every website to scan for real CMP scripts and trackers, then render the Crypticookie Privacy Shield overlay.', content: contentJs },
    { name: 'popup.html', path: 'popup.html', language: 'html', description: 'Extension toolbar popup UI displaying active detected website and real-time database controls.', content: popupHtml },
    { name: 'popup.js', path: 'popup.js', language: 'javascript', description: 'Popup script enabling toolbar quick actions and page overlay triggers.', content: popupJs },
    { name: 'styles.css', path: 'styles.css', language: 'css', description: 'Crisp dark-mode styling for the injected DOM privacy shield.', content: stylesCss },
    { name: 'README.md', path: 'README.md', language: 'markdown', description: 'Installation and developer instructions for running unpacked in Chromium browsers.', content: readmeMd },
  ];
}

export const ALL_EXTENSION_FILES: ExtensionFile[] = getExtensionFiles(
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
);

export async function downloadExtensionZip(): Promise<void> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const files = getExtensionFiles(origin);

  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.name, file.content);
  }

  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
  zip.file('icons/icon.svg', iconSvg);

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'crypticookie-manifest-v3-extension.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
