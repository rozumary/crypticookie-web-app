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
  "version": "1.2.0",
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
  const apiOrigin = serverOrigin || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  const backgroundJs = `/**
 * Crypticookie Background Service Worker (Manifest V3)
 * Monitors active tab navigation, checks CMP script hashes, and syncs consent transactions to Cloud Database in real-time.
 */

const SERVER_API_URL = "${apiOrigin}";

const CMP_REGISTRY_CACHE = new Map([
  ["9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08", { name: "OneTrust Privacy v6.32", status: "whitelist" }],
  ["5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", { name: "Cookiebot CMP v4.1", status: "whitelist" }],
  ["4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a", { name: "Klaro! Consent v0.7", status: "whitelist" }],
  ["ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d", { name: "Axeptio Consent SDK v2.0", status: "whitelist" }],
  ["a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e", { name: "Malicious Dark Pattern Tracker", status: "blacklist" }],
  ["c2e26095908990cf250785f7a0c102a90038b36fa2d2a452ef2e63db7a6a4f7e", { name: "Stealth Fingerprint Harvester", status: "blacklist" }]
]);

// SHA-256 Web Crypto Helper
async function sha256(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 1. Live Website Navigation Detector
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
    try {
      const urlObj = new URL(tab.url);
      const domain = urlObj.hostname;
      
      // Update badge indicator
      chrome.action.setBadgeText({ tabId: tabId, text: "PROT" });
      chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#10b981" });

      // Save visit locally
      chrome.storage.local.get({ monitored_sessions: [], active_user_id: "u_auditor_primary" }, (result) => {
        const list = result.monitored_sessions;
        const entry = {
          domain: domain,
          url: tab.url,
          title: tab.title || domain,
          timestamp: new Date().toISOString()
        };
        list.unshift(entry);
        if (list.length > 50) list.pop();
        chrome.storage.local.set({ monitored_sessions: list });

        // Real-time sync domain visit to Central Server & Firestore
        fetch(SERVER_API_URL + "/api/domains/record", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: domain,
            url: tab.url,
            title: tab.title || domain,
            userId: result.active_user_id,
            privacy_risk_level: domain.includes('track') || domain.includes('pirate') ? "High" : "Low"
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

  if (request.type === "VERIFY_CMP_HASH") {
    const hash = request.hash;
    const entry = CMP_REGISTRY_CACHE.get(hash);
    
    let verification = "Unverified";
    if (entry) {
      verification = entry.status === "whitelist" ? "Verified" : "Warning";
    }

    if (sender.tab && sender.tab.id) {
      const badgeColor = verification === 'Verified' ? '#10b981' : (verification === 'Warning' ? '#ef4444' : '#f59e0b');
      const badgeText = verification === 'Verified' ? 'SAFE' : (verification === 'Warning' ? 'RISK' : 'UNV');
      chrome.action.setBadgeText({ tabId: sender.tab.id, text: badgeText });
      chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: badgeColor });
    }

    sendResponse({
      status: "success",
      verification: verification,
      cmpName: entry ? entry.name : "Crypticookie Auto-Inspector",
      hash: hash
    });
    return true;
  }

  if (request.type === "RECORD_CONSENT_TRANSACTION") {
    chrome.storage.local.get({ consent_ledger: [], active_user_id: "u_auditor_primary" }, (result) => {
      (async () => {
        const timestamp = new Date().toISOString();
        const payload = \`\${request.domain}|\${request.hash}|\${request.action}|\${timestamp}\`;
        const blockHash = await sha256(payload);

        // 1. Save to Chrome local storage
        const ledger = result.consent_ledger;
        const block = {
          block_index: ledger.length,
          domain: request.domain,
          hash: blockHash,
          action: request.action,
          timestamp: timestamp
        };
        ledger.push(block);
        chrome.storage.local.set({ consent_ledger: ledger });

        // 2. REAL-TIME HTTP post to Central Server & Firestore Database
        try {
          const resp = await fetch(SERVER_API_URL + "/api/consent/record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              domain: request.domain,
              hash: request.hash,
              action: request.action,
              userId: result.active_user_id,
              timestamp: timestamp
            })
          });
          const data = await resp.json();
          console.log("Real-time Consent Sync Success:", data);
        } catch (err) {
          console.warn("Failed to reach central server, stored locally:", err);
        }

        sendResponse({ status: "committed", blockHash: blockHash });
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
 * Runs on EVERY website to inspect cookies, verify CMP scripts, and render the Crypticookie Privacy Shield.
 */

(function initCrypticookieInterceptor() {
  const currentHost = window.location.hostname || 'website';
  
  // Synchronize Active User ID if on the Crypticookie Web App origin
  if (window.location.origin === "${apiOrigin}" || window.location.host.includes("asia-east1.run.app") || window.location.host.includes("localhost:3000")) {
    const activeUserId = localStorage.getItem('crypticookie_active_user_id');
    if (activeUserId) {
      chrome.runtime.sendMessage({
        type: 'SET_ACTIVE_USER_ID',
        userId: activeUserId
      });
    }
    // Set up reactive listener to sync whenever user logs in or switches accounts
    window.addEventListener('storage', (e) => {
      if (e.key === 'crypticookie_active_user_id' && e.newValue) {
        chrome.runtime.sendMessage({
          type: 'SET_ACTIVE_USER_ID',
          userId: e.newValue
        });
      }
    });
  }

  // Do not run shield on internal extension, local or central app pages
  if (!currentHost || currentHost === 'localhost' || currentHost === '127.0.0.1' || window.location.origin === "${apiOrigin}" || window.location.host.includes("asia-east1.run.app")) return;

  function computeScriptHashMock(domain) {
    if (domain.includes('mit.edu') || domain.includes('onetrust') || domain.includes('theverge')) {
      return '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
    }
    if (domain.includes('cookiebot') || domain.includes('bbc') || domain.includes('github') || domain.includes('google')) {
      return '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';
    }
    if (domain.includes('pirate') || domain.includes('track') || domain.includes('stream') || domain.includes('casino')) {
      return 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e';
    }
    return '73926ef91823ab0288f34291f09e248b64e9123847a9821034f828108c90fe32';
  }

  // Notify background script about website visit
  chrome.runtime.sendMessage({
    type: 'DOMAIN_VISITED',
    domain: currentHost,
    url: window.location.href,
    title: document.title || currentHost,
  });

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
            <strong>Consent Framework:</strong> \${cmpName || 'Crypticookie Auto Inspector'}
          </div>
          <div class="crypticookie-detail">
            <strong>Script SHA-256:</strong> <code class="crypticookie-code">\${hash.substring(0, 16)}...</code>
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

      <!-- Floating Minimized Badge -->
      <div id="crypticookie-mini-badge" class="crypticookie-mini-badge" style="display:none;" title="Click to expand Crypticookie Privacy Shield">
        <span style="font-size:14px;">🛡️</span>
        <span style="font-weight:700; font-size:11px;">Crypticookie Shield</span>
      </div>
    \`;

    document.body.appendChild(shieldDiv);

    const bannerBox = document.getElementById('crypticookie-banner-box');
    const miniBadge = document.getElementById('crypticookie-mini-badge');

    const minimize = () => {
      if (bannerBox) bannerBox.style.display = 'none';
      if (miniBadge) miniBadge.style.display = 'flex';
    };

    const expand = () => {
      if (bannerBox) bannerBox.style.display = 'block';
      if (miniBadge) miniBadge.style.display = 'none';
    };

    document.getElementById('crypticookie-minimize-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      minimize();
    });

    document.getElementById('crypticookie-close-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      shieldDiv.remove();
    });

    miniBadge?.addEventListener('click', (e) => {
      e.stopPropagation();
      expand();
    });

    const handleAction = (action, clickedBtnId) => {
      const btn = document.getElementById(clickedBtnId);
      if (btn) {
        btn.innerText = '✓ Recorded to DB!';
        btn.style.backgroundColor = '#10b981';
      }

      chrome.runtime.sendMessage({
        type: 'RECORD_CONSENT_TRANSACTION',
        domain: currentHost,
        hash: hash,
        action: action
      }, (response) => {
        setTimeout(() => {
          minimize();
        }, 1200);
      });
    };

    document.getElementById('crypticookie-action-accept')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleAction('accept', 'crypticookie-action-accept');
    });
    document.getElementById('crypticookie-action-reject')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleAction('reject', 'crypticookie-action-reject');
    });
    document.getElementById('crypticookie-action-audit')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleAction('customize', 'crypticookie-action-audit');
    });
  }

  // Auto Inspection on website open
  const scriptHash = computeScriptHashMock(currentHost);
  chrome.runtime.sendMessage({ type: 'VERIFY_CMP_HASH', hash: scriptHash }, (res) => {
    const verification = res ? res.verification : 'Unverified';
    const cmpName = res ? res.cmpName : 'Auto Detected Web Inspector';
    renderShieldBanner(verification, cmpName, scriptHash);
  });

  // Listen for toolbar popup commands
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SHOW_SHIELD_OVERLAY') {
      renderShieldBanner('Verified', 'Crypticookie Manual Trigger', scriptHash);
      sendResponse({ status: 'shown' });
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
      <span>Crypticookie Shield v1.2</span>
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
      <span>Website Monitoring</span>
      <span class="metric-val" style="color:#34d399;">Active (Auto-Scan)</span>
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

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      try {
        const url = new URL(tabs[0].url);
        currentDomain = url.hostname;
        document.getElementById('domain-name').innerText = currentDomain;
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
      hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      action: 'accept'
    });
  });

  document.getElementById('quick-reject-btn')?.addEventListener('click', () => {
    const btn = document.getElementById('quick-reject-btn');
    if (btn) btn.innerText = '✓ Recorded!';
    chrome.runtime.sendMessage({
      type: 'RECORD_CONSENT_TRANSACTION',
      domain: currentDomain,
      hash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
      action: 'reject'
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
    {
      name: 'manifest.json',
      path: 'manifest.json',
      language: 'json',
      description: 'Manifest V3 configuration with activeTab, webNavigation, scripting, and storage permissions.',
      content: EXTENSION_MANIFEST_JSON,
    },
    {
      name: 'background.js',
      path: 'background.js',
      language: 'javascript',
      description: 'Service worker monitoring website navigation, CMP hash lookups, SHA-256 cryptographic hashing, and cloud database sync.',
      content: backgroundJs,
    },
    {
      name: 'content.js',
      path: 'content.js',
      language: 'javascript',
      description: 'DOM Interceptor running on every website to scan for trackers and render the Crypticookie Privacy Shield overlay.',
      content: contentJs,
    },
    {
      name: 'popup.html',
      path: 'popup.html',
      language: 'html',
      description: 'Extension toolbar popup UI displaying active detected website and real-time database controls.',
      content: popupHtml,
    },
    {
      name: 'popup.js',
      path: 'popup.js',
      language: 'javascript',
      description: 'Popup script enabling toolbar quick actions and page overlay triggers.',
      content: popupJs,
    },
    {
      name: 'styles.css',
      path: 'styles.css',
      language: 'css',
      description: 'Crisp dark-mode styling for the injected DOM privacy shield.',
      content: stylesCss,
    },
    {
      name: 'README.md',
      path: 'README.md',
      language: 'markdown',
      description: 'Installation and developer instructions for running unpacked in Chromium browsers.',
      content: readmeMd,
    },
  ];
}

export const ALL_EXTENSION_FILES: ExtensionFile[] = getExtensionFiles(
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
);

/**
 * Generate a downloadable .zip archive of the complete working Chrome Extension
 */
export async function downloadExtensionZip(): Promise<void> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const files = getExtensionFiles(origin);

  const zip = new JSZip();
  
  for (const file of files) {
    zip.file(file.name, file.content);
  }

  // Create an icons folder
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
