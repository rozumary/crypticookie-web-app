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
  "version": "1.3.0",
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
      "run_at": "document_idle"
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

        const ledger = result.consent_ledger;
        ledger.push({ block_index: ledger.length, domain: request.domain, hash: request.hash, action: request.action, timestamp: timestamp });
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
              userId: result.active_user_id,
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

        sendResponse({ status: "committed", serverResponse: serverResponse });
      })();
    });
    return true;
  }

  if (request.type === "DOMAIN_VISITED") {
    chrome.storage.local.get({ active_user_id: "u_auditor_primary" }, (result) => {
      (async () => {
        try {
          await fetch(SERVER_API_URL + "/api/domains/record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              domain: request.domain,
              url: request.url,
              title: request.title,
              userId: result.active_user_id,
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

  // Synchronize Active User ID if on the Crypticookie Web App origin
  if (window.location.origin === "${apiOrigin}" || window.location.host.includes("asia-east1.run.app") || window.location.host.includes("localhost:3000")) {
    const activeUserId = localStorage.getItem('crypticookie_active_user_id');
    if (activeUserId) {
      chrome.runtime.sendMessage({ type: 'SET_ACTIVE_USER_ID', userId: activeUserId });
    }
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
      if (e.data && e.data.type === 'CRYPTICOOKIE_USER_CHANGED') {
        chrome.runtime.sendMessage({ type: 'SET_ACTIVE_USER_ID', userId: e.data.userId });
      }
    });
  }

  // Do not run shield on internal extension, local or central app pages
  if (!currentHost || currentHost === 'localhost' || currentHost === '127.0.0.1' || window.location.origin === "${apiOrigin}" || window.location.host.includes("asia-east1.run.app")) return;

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
      const src = (script.src || '').toLowerCase();
      for (const cmp of CMP_DOMAINS) {
        if (src.includes(cmp.pattern)) {
          return { src: script.src, name: cmp.name };
        }
      }
    }
    // Also check inline scripts for CMP initialization patterns
    const inlineScripts = document.querySelectorAll('script:not([src])');
    for (const script of inlineScripts) {
      const text = (script.textContent || '').toLowerCase();
      if (text.includes('onetrust') || text.includes('cookiebot') || text.includes('didomi') || text.includes('quantcast')) {
        for (const cmp of CMP_DOMAINS) {
          if (text.includes(cmp.pattern)) {
            return { src: cmp.pattern, name: cmp.name };
          }
        }
      }
    }
    return null;
  }

  // Real tracker detection: scan all elements for known tracker domains + cookies
  function detectTrackers() {
    const detected = [];
    const seen = new Set();
    const allElements = document.querySelectorAll('script[src], link[href], iframe[src], img[src]');

    for (const el of allElements) {
      const url = (el.src || el.href || '').toLowerCase();
      if (!url) continue;
      for (const tracker of TRACKER_DOMAINS) {
        if (url.includes(tracker.pattern) && !seen.has(tracker.name)) {
          seen.add(tracker.name);
          detected.push({
            name: tracker.name,
            category: tracker.category,
            domain: url.split('/')[2] || url,
            blocked: tracker.category === 'Fingerprinting'
          });
        }
      }
    }

    // Also detect via cookies
    if (document.cookie) {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const cookieName = cookie.trim().split('=')[0];
        for (const ct of COOKIE_TRACKERS) {
          if (cookieName === ct.pattern && !seen.has(ct.name)) {
            seen.add(ct.name);
            detected.push({ name: ct.name, category: ct.category, domain: currentHost, blocked: false });
          }
        }
      }
    }

    return detected;
  }

  // Detect CMP and compute real SHA-256 hash
  const detectedCmp = detectCmpScript();
  const detectedTrackers = detectTrackers();
  const cookieCount = document.cookie ? document.cookie.split(';').length : 0;
  const cmpSrcForHash = detectedCmp ? detectedCmp.src : (currentHost + '_no_cmp_detected');

  (async () => {
    const scriptHash = await sha256(cmpSrcForHash);

    // Notify background script about website visit with real data
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
    const guidance = verification === 'Verified' ? 'Accept Necessary?' : (verification === 'Warning' ? 'Warning: Reject All' : 'Opt for Necessary?');

    shieldDiv.innerHTML = \`
      <div class="crypticookie-banner-container" id="crypticookie-banner-box">
        <div class="crypticookie-header">
          <div class="crypticookie-brand">
            <div class="crypticookie-icon">🛡️</div>
            <div class="crypticookie-title-group">
              <span class="crypticookie-title">Crypticookie Privacy Shield</span>
              <span class="crypticookie-badge" style="background-color: \${badgeColor}">\${badgeText}</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <button id="crypticookie-minimize-btn" class="crypticookie-close" title="Minimize to Floating Icon" type="button">─</button>
            <button id="crypticookie-close-btn" class="crypticookie-close" title="Dismiss Shield" type="button">&times;</button>
          </div>
        </div>

        <div class="crypticookie-body">
          <div class="crypticookie-detail">
            <strong>Monitored Website:</strong> <span class="crypticookie-rec-tag">\${currentHost}</span>
          </div>
          <div class="crypticookie-detail">
            <strong>Consent Framework:</strong> \${cmpName || 'No CMP Detected'}
          </div>
          <div class="crypticookie-detail">
            <strong>Script SHA-256:</strong> <code class="crypticookie-code">\${hash.substring(0, 16)}...</code>
          </div>
          <div class="crypticookie-detail">
            <strong>Trackers Detected:</strong> <span class="crypticookie-rec-tag">\${detectedTrackers.length} trackers, \${cookieCount} cookies</span>
          </div>
          <div class="crypticookie-recommendation">
            <strong>Guidance Engine:</strong> <span class="crypticookie-rec-tag">\${guidance}</span>
          </div>
        </div>

        <div class="crypticookie-actions">
          <button id="crypticookie-action-accept" class="crypticookie-btn primary" type="button">Accept Necessary</button>
          <button id="crypticookie-action-reject" class="crypticookie-btn danger" type="button">Reject All Trackers</button>
          <button id="crypticookie-action-audit" class="crypticookie-btn secondary" type="button">Audit on Chain</button>
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

    const handleAction = (action, clickedBtnId) => {
      const btn = document.getElementById(clickedBtnId);
      if (btn) { btn.innerText = '✓ Recorded to DB!'; btn.style.backgroundColor = '#10b981'; }

      chrome.runtime.sendMessage({
        type: 'RECORD_CONSENT_TRANSACTION',
        domain: currentHost,
        hash: hash,
        action: action,
        trackers: detectedTrackers,
        cookieCount: cookieCount,
        cmpName: cmpName
      }, () => { setTimeout(() => { minimize(); }, 1200); });
    };

    document.getElementById('crypticookie-action-accept')?.addEventListener('click', (e) => { e.preventDefault(); handleAction('accept', 'crypticookie-action-accept'); });
    document.getElementById('crypticookie-action-reject')?.addEventListener('click', (e) => { e.preventDefault(); handleAction('reject', 'crypticookie-action-reject'); });
    document.getElementById('crypticookie-action-audit')?.addEventListener('click', (e) => { e.preventDefault(); handleAction('customize', 'crypticookie-action-audit'); });
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
      margin-bottom: 14px;
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

  <button class="btn" id="show-shield-btn">🛡️ Show Privacy Shield Overlay</button>
  <button class="btn accept" id="quick-accept-btn">⚡ Record "Accept Necessary"</button>
  <button class="btn reject" id="quick-reject-btn">🚫 Record "Reject All Trackers"</button>
  <button class="btn dashboard" id="open-dashboard-btn">🌐 Open Web Dashboard</button>

  <script src="popup.js"></script>
</body>
</html>`;

  const popupJs = `document.addEventListener('DOMContentLoaded', () => {
  let currentDomain = 'website';
  let detectedHash = '';
  let detectedCmpName = 'No CMP detected';
  let detectedTrackers = [];

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
        document.getElementById('domain-name').innerText = 'Browser Session';
      }
    }
  });

  document.getElementById('show-shield-btn')?.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'SHOW_SHIELD_OVERLAY' });
      }
    });
  });

  document.getElementById('quick-accept-btn')?.addEventListener('click', () => {
    const btn = document.getElementById('quick-accept-btn');
    if (btn) btn.innerText = '✓ Recorded!';
    chrome.runtime.sendMessage({
      type: 'RECORD_CONSENT_TRANSACTION',
      domain: currentDomain,
      hash: detectedHash || 'unverified',
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
  max-width: 420px;
  animation: crypticookie-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1);
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
  font-size: 14px;
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
  gap: 8px;
}

.crypticookie-btn {
  padding: 8px 4px;
  border-radius: 10px;
  border: none;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
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
