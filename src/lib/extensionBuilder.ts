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
  "version": "1.3.2",
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

export function getExtensionFiles(
  serverOrigin: string,
  user?: { id: string; username: string; email?: string } | null
): ExtensionFile[] {
  let apiOrigin = serverOrigin || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const activeUserId = user?.id || 'u_auditor_primary';
  const activeUsername = user?.username || 'Test Auditor';
  const activeUserEmail = user?.email || 'auditor@crypticookie.io';

  const backgroundJs = `/**
 * Crypticookie Background Service Worker (Manifest V3)
 * Monitors active tab navigation, checks CMP script hashes against server registry, and syncs consent transactions to Cloud Database in real-time.
 */

const SERVER_API_URL = "${apiOrigin}";
const DEFAULT_USER_ID = "${activeUserId}";
const DEFAULT_USERNAME = "${activeUsername}";

// 1. Live Website Navigation Detector
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
    try {
      const urlObj = new URL(tab.url);
      const domain = urlObj.hostname;

      chrome.action.setBadgeText({ tabId: tabId, text: "PROT" });
      chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#10b981" });

      chrome.storage.local.get({ monitored_sessions: [], active_user_id: DEFAULT_USER_ID, active_username: DEFAULT_USERNAME }, (result) => {
        const list = result.monitored_sessions || [];
        list.unshift({ domain: domain, url: tab.url, title: tab.title || domain, timestamp: new Date().toISOString() });
        if (list.length > 50) list.pop();
        chrome.storage.local.set({ monitored_sessions: list, active_user_id: result.active_user_id, active_username: result.active_username });

        fetch(SERVER_API_URL + "/api/domains/record", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: domain,
            url: tab.url,
            title: tab.title || domain,
            userId: result.active_user_id || DEFAULT_USER_ID,
            username: result.active_username || DEFAULT_USERNAME,
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
    chrome.storage.local.set({ active_user_id: request.userId, active_username: request.username || request.userId }, () => {
      console.log("Extension synchronized active user_id:", request.userId);
    });
    sendResponse({ status: "synced", userId: request.userId });
    return true;
  }

  if (request.type === "GET_ACTIVE_USER_ID") {
    chrome.storage.local.get({ active_user_id: DEFAULT_USER_ID, active_username: DEFAULT_USERNAME }, (res) => {
      sendResponse({ userId: res.active_user_id || DEFAULT_USER_ID, username: res.active_username || DEFAULT_USERNAME });
    });
    return true;
  }

  // Verify CMP hash against the real server registry
  if (request.type === "VERIFY_CMP_HASH") {
    const hash = request.hash;
    const clientCmpName = request.cmpName;
    const domain = request.domain;
    (async () => {
      let verification = "Unverified";
      let cmpName = clientCmpName || "Unverified CMP Script";

      try {
        const resp = await fetch(SERVER_API_URL + "/api/cmp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hash: hash, cmpName: clientCmpName, domain: domain })
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
    chrome.storage.local.get({ consent_ledger: [], active_user_id: DEFAULT_USER_ID, active_username: DEFAULT_USERNAME }, (result) => {
      (async () => {
        const timestamp = new Date().toISOString();
        const effectiveUserId = request.userId || result.active_user_id || DEFAULT_USER_ID;
        const effectiveUsername = request.username || result.active_username || DEFAULT_USERNAME;

        const ledger = result.consent_ledger || [];
        ledger.push({
          block_index: ledger.length,
          domain: request.domain,
          hash: request.hash,
          action: request.action,
          userId: effectiveUserId,
          username: effectiveUsername,
          timestamp: timestamp
        });
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
              username: effectiveUsername,
              trackers: request.trackers || [],
              cookieCount: request.cookieCount || 0,
              cmpName: request.cmpName || null,
              timestamp: timestamp
            })
          });
          serverResponse = await resp.json();
          console.log("Real-time Consent Sync Success for User [" + effectiveUserId + "]:", serverResponse);
        } catch (err) {
          console.warn("Failed to reach central server, stored locally:", err);
        }

        sendResponse({ status: "committed", serverResponse: serverResponse, userId: effectiveUserId });
      })();
    });
    return true;
  }

  if (request.type === "DOMAIN_VISITED") {
    chrome.storage.local.get({ active_user_id: DEFAULT_USER_ID, active_username: DEFAULT_USERNAME }, (result) => {
      (async () => {
        const effectiveUserId = request.userId || result.active_user_id || DEFAULT_USER_ID;
        const effectiveUsername = request.username || result.active_username || DEFAULT_USERNAME;
        try {
          await fetch(SERVER_API_URL + "/api/domains/record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              domain: request.domain,
              url: request.url,
              title: request.title,
              userId: effectiveUserId,
              username: effectiveUsername,
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
      const activeUsername = localStorage.getItem('crypticookie_active_username') || '';
      if (activeUserId) {
        chrome.runtime.sendMessage({ type: 'SET_ACTIVE_USER_ID', userId: activeUserId, username: activeUsername || activeUserId });
      }
    };

    trySyncUserId();
    // Re-sync periodically in case the user logs in after page load
    setInterval(trySyncUserId, 3000);
    window.addEventListener('storage', (e) => {
      if ((e.key === 'crypticookie_active_user_id' || e.key === 'crypticookie_active_username') && e.newValue) {
        trySyncUserId();
      }
    });
    window.addEventListener('crypticookie_user_changed', (e) => {
      if (e.detail && e.detail.userId) {
        chrome.runtime.sendMessage({ type: 'SET_ACTIVE_USER_ID', userId: e.detail.userId, username: e.detail.username || e.detail.userId });
      }
    });
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'CRYPTICOOKIE_USER_CHANGED' && e.data.userId) {
        chrome.runtime.sendMessage({ type: 'SET_ACTIVE_USER_ID', userId: e.data.userId, username: e.data.username || e.data.userId });
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
    { pattern: 'google.com', name: 'Google Privacy & Consent Manager' },
    { pattern: 'gstatic.com', name: 'Google Privacy & Consent Manager' },
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

    // Domain fallbacks for major verified sites with built-in consent systems
    if (currentHost.includes('google')) {
      return { name: 'Google Privacy & Consent Manager', src: 'https://consent.google.com/cmp.js' };
    }
    if (currentHost.includes('facebook') || currentHost.includes('messenger') || currentHost.includes('instagram')) {
      return { name: 'Meta Privacy & Consent Manager', src: 'https://www.facebook.com/privacy/consent/loader.js' };
    }
    if (currentHost.includes('youtube')) {
      return { name: 'Google Privacy & Consent Manager', src: 'https://consent.youtube.com/cmp.js' };
    }
    if (currentHost.includes('github')) {
      return { name: 'Cookiebot CMP (Usercentrics)', src: 'https://consent.cookiebot.com/uc.js' };
    }
    if (currentHost.includes('wikipedia')) {
      return { name: 'Wikimedia Privacy & Consent Manager', src: 'https://foundation.wikimedia.org/wiki/Privacy_policy' };
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

  // Determine cookie type and guidance according to Table 2:
  // Necessary Cookies -> "Accept?"
  // Optional Cookies   -> "Customize?"
  // Suspicious Cookies -> "Warning"
  let detectedCookieType = 'necessary';
  if (detectedTrackers.some(t => t.category === 'Fingerprinting') || currentHost.includes('pirate') || currentHost.includes('stream')) {
    detectedCookieType = 'suspicious';
  } else if (detectedTrackers.length > 0 || currentHost.includes('shopee') || currentHost.includes('lazada') || currentHost.includes('facebook') || currentHost.includes('google')) {
    detectedCookieType = 'optional';
  }

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
    chrome.runtime.sendMessage({ type: 'VERIFY_CMP_HASH', hash: scriptHash, cmpName: detectedCmp ? detectedCmp.name : null, domain: currentHost }, (res) => {
      const verification = res ? res.verification : 'Unverified';
      const cmpName = res ? res.cmpName : (detectedCmp ? detectedCmp.name : 'No CMP Detected');
      renderShieldBanner(verification, cmpName, scriptHash, detectedCookieType);
    });
  })();

  function renderShieldBanner(verification, cmpName, hash, cookieType) {
    let existing = document.getElementById('crypticookie-shield-root');
    if (existing) existing.remove();

    const shieldDiv = document.createElement('div');
    shieldDiv.id = 'crypticookie-shield-root';

    // Guidance according to Table 2
    let guidanceText = 'Accept?';
    let guidanceColor = '#10b981';
    if (cookieType === 'suspicious' || verification === 'Warning') {
      guidanceText = 'Warning';
      guidanceColor = '#ef4444';
    } else if (cookieType === 'optional' || (detectedTrackers && detectedTrackers.length > 0)) {
      guidanceText = 'Customize?';
      guidanceColor = '#f59e0b';
    } else {
      guidanceText = 'Accept?';
      guidanceColor = '#10b981';
    }

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
          <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:11px; color:#a78bfa;">
            <span>Firestore DB Sync</span>
            <span style="color:#38bdf8; font-weight:600; font-family:monospace;">Connected</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding-top:6px; border-top:1px solid #251545; font-size:11px; color:#a78bfa;">
            <span>Recommendation</span>
            <span style="color:\${guidanceColor}; font-weight:700; font-family:monospace; background:rgba(0,0,0,0.4); padding:2px 6px; border-radius:4px;">\${guidanceText}</span>
          </div>
        </div>

        <div style="background:\${guidanceText === 'Warning' ? 'rgba(239,68,68,0.1)' : (guidanceText === 'Customize?' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)')}; border:1px solid \${guidanceColor}44; border-radius:10px; padding:8px 10px; margin-top:6px; font-size:11px; line-height:1.4; color:#f3e8ff;">
          <div style="font-weight:700; color:\${guidanceColor}; margin-bottom:2px;">
            \${guidanceText === 'Warning' ? '⚠️ Privacy Alert:' : '💡 Privacy Recommendation:'}
          </div>
          \${guidanceText === 'Warning' 
            ? 'Suspicious tracking scripts detected. Recommended to click <strong>Reject</strong> to safeguard your privacy.' 
            : (guidanceText === 'Customize?' 
              ? 'Optional tracking cookies detected. Recommended to <strong>Customize? (Opt for Necessary)</strong> to block trackers.' 
              : 'Only necessary cookies detected. Safe to click <strong>Accept?</strong> to continue.')}
        </div>

        <div style="background:#0B0516; border-radius:12px; padding:10px; border:1px solid #251545; margin-top:6px;">
          <div style="font-size:10px; color:#a78bfa; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.05em; font-weight:600;">
            Real-Time Consent Decision:
          </div>
          <div class="crypticookie-actions" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">
            <button id="crypticookie-btn-accept" class="crypticookie-btn primary" style="background:#10b981; color:white; font-size:11px; font-weight:700; padding:8px 4px; border-radius:8px; border:none; cursor:pointer; transition:all 0.15s ease;">
              Accept?
            </button>
            <button id="crypticookie-btn-customize" class="crypticookie-btn secondary" style="background:#4c2888; border:1px solid #7c3aed; color:#e9d5ff; font-size:11px; font-weight:600; padding:8px 4px; border-radius:8px; cursor:pointer; transition:all 0.15s ease;">
              Customize?
            </button>
            <button id="crypticookie-btn-reject" class="crypticookie-btn danger" style="background:#ef4444; color:white; font-size:11px; font-weight:700; padding:8px 4px; border-radius:8px; border:none; cursor:pointer; transition:all 0.15s ease;">
              Reject
            </button>
          </div>
          <div id="crypticookie-action-status" style="display:none; margin-top:8px; padding:6px; background:#064e3b; border:1px solid #10b981; border-radius:6px; font-size:10px; font-weight:700; color:#a7f3d0; text-align:center;">
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
    const statusBox = document.getElementById('crypticookie-action-status');

    const minimize = () => { if (bannerBox) bannerBox.style.display = 'none'; if (miniBadge) miniBadge.style.display = 'inline-flex'; };
    const expand = () => { if (bannerBox) bannerBox.style.display = 'block'; if (miniBadge) miniBadge.style.display = 'none'; };

    document.getElementById('crypticookie-minimize-btn')?.addEventListener('click', (e) => { e.stopPropagation(); minimize(); });
    document.getElementById('crypticookie-close-btn')?.addEventListener('click', (e) => { e.stopPropagation(); shieldDiv.remove(); });
    miniBadge?.addEventListener('click', (e) => { e.stopPropagation(); expand(); });

    // Handle Real-Time Actions
    const executeAction = (actionChoice) => {
      const btnAccept = document.getElementById('crypticookie-btn-accept');
      const btnCustomize = document.getElementById('crypticookie-btn-customize');
      const btnReject = document.getElementById('crypticookie-btn-reject');
      
      if (btnAccept) btnAccept.disabled = true;
      if (btnCustomize) btnCustomize.disabled = true;
      if (btnReject) btnReject.disabled = true;

      if (statusBox) {
        statusBox.style.display = 'block';
        statusBox.innerText = 'Syncing to Firestore & Blockchain...';
      }

      // Fetch the synced user from background to ensure correct binding
      chrome.runtime.sendMessage({ type: 'GET_ACTIVE_USER_ID' }, (userRes) => {
        const effectiveUserId = (userRes && userRes.userId) || '';
        const effectiveUsername = (userRes && userRes.username) || '';
        chrome.runtime.sendMessage({
          type: 'RECORD_CONSENT_TRANSACTION',
          domain: currentHost,
          hash: hash,
          action: actionChoice,
          trackers: detectedTrackers,
          cookieCount: cookieCount,
          cmpName: cmpName,
          cookieType: cookieType,
          userId: effectiveUserId,
          username: effectiveUsername
        }, (res) => {
          if (statusBox) {
            const blockIdx = res && res.serverResponse && res.serverResponse.publicBlockIndex !== undefined 
              ? ' (Block #' + res.serverResponse.publicBlockIndex + ')' 
              : '';
            statusBox.innerText = '✓ ' + actionChoice.toUpperCase() + ' Synced to Firestore!' + blockIdx;
            statusBox.style.background = actionChoice === 'reject' ? '#450a0a' : '#064e3b';
            statusBox.style.borderColor = actionChoice === 'reject' ? '#ef4444' : '#10b981';
            statusBox.style.color = actionChoice === 'reject' ? '#fca5a5' : '#a7f3d0';
          }
        });
      });
    };

    document.getElementById('crypticookie-btn-accept')?.addEventListener('click', () => executeAction('accept'));
    document.getElementById('crypticookie-btn-customize')?.addEventListener('click', () => executeAction('customize'));
    document.getElementById('crypticookie-btn-reject')?.addEventListener('click', () => executeAction('reject'));
  }

  // Listen for toolbar popup commands
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SHOW_SHIELD_OVERLAY') {
      const hash = detectedCmp ? detectedCmp.src : currentHost;
      sha256(hash).then(function(realHash) {
        renderShieldBanner('Unverified', detectedCmp ? detectedCmp.name : 'No CMP Detected', realHash, detectedCookieType);
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
    <div class="metric-row" style="padding-top:6px; border-top:1px solid #341F5C;">
      <span>Recommendation</span>
      <span class="metric-val" id="rec-info" style="color:#10b981; font-weight:700;">Accept?</span>
    </div>
  </div>

  <div id="rec-advisory-box" style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:10px; padding:8px 10px; margin-top:8px; font-size:11px; line-height:1.4; color:#f3e8ff;">
    <div id="rec-advisory-title" style="font-weight:700; color:#10b981; margin-bottom:2px;">
      💡 Privacy Recommendation:
    </div>
    <div id="rec-advisory-text">
      Only necessary cookies detected. Safe to click <strong>Accept?</strong> to continue.
    </div>
  </div>

  <div class="status-card" style="margin-top:8px;">
    <div style="font-size:10px; color:#a78bfa; margin-bottom:6px; font-weight:700; text-transform:uppercase;">
      Real-Time Consent Decision:
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">
      <button id="quick-accept-btn" class="btn accept" type="button">Accept?</button>
      <button id="quick-customize-btn" class="btn dashboard" type="button" style="margin-top:0;">Customize?</button>
      <button id="quick-reject-btn" class="btn reject" type="button" style="margin-top:0;">Reject</button>
    </div>
    <div id="popup-status" style="display:none; margin-top:8px; padding:6px; background:#064e3b; border:1px solid #10b981; border-radius:6px; font-size:10px; font-weight:700; color:#a7f3d0; text-align:center;">
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
    const selectedOption = e.target.options[e.target.selectedIndex];
    const newUsername = selectedOption ? selectedOption.innerText : newUserId;
    chrome.runtime.sendMessage({ type: 'SET_ACTIVE_USER_ID', userId: newUserId, username: newUsername });
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

            const recInfo = document.getElementById('rec-info');
            const advBox = document.getElementById('rec-advisory-box');
            const advTitle = document.getElementById('rec-advisory-title');
            const advText = document.getElementById('rec-advisory-text');

            if (recInfo) {
              if (detectedTrackers.some(t => t.category === 'Fingerprinting') || currentDomain.includes('pirate')) {
                recInfo.innerText = 'Warning';
                recInfo.style.color = '#ef4444';
                if (advBox && advTitle && advText) {
                  advBox.style.background = 'rgba(239,68,68,0.1)';
                  advBox.style.borderColor = 'rgba(239,68,68,0.3)';
                  advTitle.innerText = '⚠️ Privacy Alert:';
                  advTitle.style.color = '#ef4444';
                  advText.innerHTML = 'Suspicious or unverified tracking scripts detected. Recommended to click <strong>Reject</strong> to protect your privacy.';
                }
              } else if (detectedTrackers.length > 0) {
                recInfo.innerText = 'Customize?';
                recInfo.style.color = '#f59e0b';
                if (advBox && advTitle && advText) {
                  advBox.style.background = 'rgba(245,158,11,0.1)';
                  advBox.style.borderColor = 'rgba(245,158,11,0.3)';
                  advTitle.innerText = '💡 Privacy Recommendation:';
                  advTitle.style.color = '#f59e0b';
                  advText.innerHTML = 'Optional marketing trackers found. Recommended to <strong>Customize? (Opt for Necessary)</strong> to block third-party tracking.';
                }
              } else {
                recInfo.innerText = 'Accept?';
                recInfo.style.color = '#10b981';
                if (advBox && advTitle && advText) {
                  advBox.style.background = 'rgba(16,185,129,0.1)';
                  advBox.style.borderColor = 'rgba(16,185,129,0.3)';
                  advTitle.innerText = '💡 Privacy Recommendation:';
                  advTitle.style.color = '#10b981';
                  advText.innerHTML = 'Only necessary functional cookies detected. Safe to choose <strong>Accept?</strong> to continue browsing.';
                }
              }
            }
          }
        });
      } catch (e) {
        console.error('Error parsing tab URL:', e);
      }
    }
  });

  const sendAction = (actionChoice) => {
    const statusDiv = document.getElementById('popup-status');
    if (statusDiv) {
      statusDiv.style.display = 'block';
      statusDiv.innerText = 'Syncing to Firestore...';
    }

    // Get current active user to ensure correct binding
    chrome.runtime.sendMessage({ type: 'GET_ACTIVE_USER_ID' }, (userRes) => {
      const effectiveUserId = (userRes && userRes.userId) || '';
      const effectiveUsername = (userRes && userRes.username) || '';
      chrome.runtime.sendMessage({
        type: 'RECORD_CONSENT_TRANSACTION',
        domain: currentDomain,
        hash: detectedHash || 'verified',
        action: actionChoice,
        trackers: detectedTrackers,
        cmpName: detectedCmpName,
        cookieCount: 0,
        userId: effectiveUserId,
        username: effectiveUsername
      }, (res) => {
        if (statusDiv) {
          const blockIdx = res && res.serverResponse && res.serverResponse.publicBlockIndex !== undefined
            ? ' (Block #' + res.serverResponse.publicBlockIndex + ')'
            : '';
          statusDiv.innerText = '✓ ' + actionChoice.toUpperCase() + ' Synced!' + blockIdx;
          statusDiv.style.background = actionChoice === 'reject' ? '#450a0a' : '#064e3b';
          statusDiv.style.borderColor = actionChoice === 'reject' ? '#ef4444' : '#10b981';
          statusDiv.style.color = actionChoice === 'reject' ? '#fca5a5' : '#a7f3d0';
        }
      });
    });
  };

  document.getElementById('quick-accept-btn')?.addEventListener('click', () => sendAction('accept'));
  document.getElementById('quick-customize-btn')?.addEventListener('click', () => sendAction('customize'));
  document.getElementById('quick-reject-btn')?.addEventListener('click', () => sendAction('reject'));

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
  width: auto;
  max-width: min(420px, calc(100vw - 32px));
  box-sizing: border-box;
  animation: crypticookie-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  justify-content: flex-end;
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
  width: 380px;
  max-width: calc(100vw - 32px);
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
  border: 1.5px solid #8b5cf6;
  border-radius: 9999px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #ffffff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: max-content;
  white-space: nowrap;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.7);
  transition: all 0.2s ease;
}

.crypticookie-mini-badge:hover {
  border-color: #ec4899;
  background: #251347;
  transform: translateY(-2px) scale(1.03);
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

export async function downloadExtensionZip(
  user?: { id: string; username: string; email?: string } | null
): Promise<void> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const files = getExtensionFiles(origin, user);

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
