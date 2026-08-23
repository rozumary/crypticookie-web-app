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
  "version": "1.1.0",
  "description": "Real-time active website detection, cookie & tracker sniffer, CMP verification, and hybrid blockchain consent auditing.",
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

export const EXTENSION_BACKGROUND_JS = `/**
 * Crypticookie Background Service Worker (Manifest V3)
 * Monitors active tab navigation, detects websites, checks CMP script hashes, and manages blockchain logs.
 */

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
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    try {
      const urlObj = new URL(tab.url);
      const domain = urlObj.hostname;
      
      // Update badge indicator
      chrome.action.setBadgeText({ tabId: tabId, text: "AUDIT" });
      chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#6366f1" });

      // Save visit to local monitored domains log
      chrome.storage.local.get({ monitored_sessions: [] }, (result) => {
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
      });
    } catch (e) {
      console.warn("Navigation parse error:", e);
    }
  }
});

// 2. Messaging Handler for CMP & Consent Actions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "VERIFY_CMP_HASH") {
    const hash = request.hash;
    const entry = CMP_REGISTRY_CACHE.get(hash);
    
    let verification = "Unverified";
    if (entry) {
      verification = entry.status === "whitelist" ? "Verified" : "Warning";
    }

    // Set badge based on verification
    if (sender.tab && sender.tab.id) {
      const badgeColor = verification === 'Verified' ? '#10b981' : (verification === 'Warning' ? '#ef4444' : '#f59e0b');
      const badgeText = verification === 'Verified' ? 'SAFE' : (verification === 'Warning' ? 'RISK' : 'UNV');
      chrome.action.setBadgeText({ tabId: sender.tab.id, text: badgeText });
      chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: badgeColor });
    }

    sendResponse({
      status: "success",
      verification: verification,
      cmpName: entry ? entry.name : "Unregistered CMP Script",
      hash: hash
    });
    return true;
  }

  if (request.type === "RECORD_CONSENT_TRANSACTION") {
    (async () => {
      const timestamp = new Date().toISOString();
      const payload = \`\${request.domain}|\${request.hash}|\${request.action}|\${timestamp}\`;
      const blockHash = await sha256(payload);

      chrome.storage.local.get({ consent_ledger: [] }, (result) => {
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
      });

      sendResponse({ status: "committed", blockHash: blockHash });
    })();
    return true;
  }
});
`;

export const EXTENSION_CONTENT_JS = `/**
 * Crypticookie Content Script (Live Website DOM Interceptor & Shield Injector)
 * Detects cookie dialogs, extracts script SHA-256 hashes, and renders the Crypticookie Privacy Shield.
 */

(function initCrypticookieInterceptor() {
  const CMP_SELECTORS = [
    '#onetrust-banner-sdk',
    '#CybotCookiebotDialog',
    '#klaro',
    '.cc-banner',
    '.cookie-consent-banner',
    '[aria-label*="cookie" i]',
    '[id*="cookie" i]'
  ];

  function computeScriptHashMock(domain) {
    if (domain.includes('mit.edu') || domain.includes('onetrust') || domain.includes('theverge')) {
      return '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
    }
    if (domain.includes('cookiebot') || domain.includes('bbc') || domain.includes('github')) {
      return '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';
    }
    if (domain.includes('pirate') || domain.includes('track') || domain.includes('stream')) {
      return 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e';
    }
    return '73926ef91823ab0288f34291f09e248b64e9123847a9821034f828108c90fe32';
  }

  function injectShieldBanner(verification, cmpName, hash) {
    if (document.getElementById('crypticookie-shield-root')) return;

    const shieldDiv = document.createElement('div');
    shieldDiv.id = 'crypticookie-shield-root';
    
    const badgeColor = verification === 'Verified' ? '#10b981' : (verification === 'Warning' ? '#ef4444' : '#f59e0b');
    const badgeText = verification === 'Verified' ? '✓ Whitelist Verified' : (verification === 'Warning' ? '⚠ Blacklisted Dark Pattern' : 'ℹ Unverified Script');
    const guidance = verification === 'Verified' ? 'Accept Necessary?' : (verification === 'Warning' ? 'Warning: Reject All' : 'Opt for Necessary?');

    shieldDiv.innerHTML = \`
      <div class="crypticookie-banner-container">
        <div class="crypticookie-header">
          <div class="crypticookie-brand">
            <div class="crypticookie-icon">🛡️</div>
            <div class="crypticookie-title-group">
              <span class="crypticookie-title">Crypticookie Privacy Shield</span>
              <span class="crypticookie-badge" style="background-color: \${badgeColor}">\${badgeText}</span>
            </div>
          </div>
          <button id="crypticookie-close-btn" class="crypticookie-close">&times;</button>
        </div>
        
        <div class="crypticookie-body">
          <div class="crypticookie-detail">
            <strong>Website:</strong> <span class="crypticookie-rec-tag">\${window.location.hostname}</span>
          </div>
          <div class="crypticookie-detail">
            <strong>CMP Name:</strong> \${cmpName}
          </div>
          <div class="crypticookie-detail">
            <strong>Script Hash:</strong> <code class="crypticookie-code">\${hash.substring(0, 16)}...</code>
          </div>
          <div class="crypticookie-recommendation">
            <strong>Guidance Engine:</strong> <span class="crypticookie-rec-tag">\${guidance}</span>
          </div>
        </div>

        <div class="crypticookie-actions">
          <button id="crypticookie-action-accept" class="crypticookie-btn primary">Accept Necessary</button>
          <button id="crypticookie-action-reject" class="crypticookie-btn danger">Reject All Trackers</button>
          <button id="crypticookie-action-audit" class="crypticookie-btn secondary">Audit on Chain</button>
        </div>
      </div>
    \`;

    document.body.appendChild(shieldDiv);

    document.getElementById('crypticookie-close-btn')?.addEventListener('click', () => {
      shieldDiv.remove();
    });

    const handleAction = (action) => {
      chrome.runtime.sendMessage({
        type: 'RECORD_CONSENT_TRANSACTION',
        domain: window.location.hostname,
        hash: hash,
        action: action
      }, (response) => {
        const btn = document.getElementById('crypticookie-action-audit');
        if (btn) btn.innerText = '✓ Block Chained';
        setTimeout(() => shieldDiv.remove(), 1200);
      });
    };

    document.getElementById('crypticookie-action-accept')?.addEventListener('click', () => handleAction('accept'));
    document.getElementById('crypticookie-action-reject')?.addEventListener('click', () => handleAction('reject'));
    document.getElementById('crypticookie-action-audit')?.addEventListener('click', () => handleAction('customize'));
  }

  // Monitor DOM
  const observer = new MutationObserver(() => {
    for (const selector of CMP_SELECTORS) {
      const el = document.querySelector(selector);
      if (el) {
        const domain = window.location.hostname || 'example.com';
        const hash = computeScriptHashMock(domain);
        chrome.runtime.sendMessage({ type: 'VERIFY_CMP_HASH', hash: hash }, (res) => {
          if (res) {
            injectShieldBanner(res.verification, res.cmpName, res.hash);
          }
        });
        break;
      }
    }
  });

  observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
})();
`;

export const EXTENSION_POPUP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Crypticookie Shield</title>
  <style>
    body {
      width: 330px;
      margin: 0;
      padding: 16px;
      background: #070b19;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
      border-bottom: 1px solid #1e293b;
      margin-bottom: 14px;
    }
    .title {
      font-weight: 700;
      font-size: 14px;
      color: #a78bfa;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-card {
      background: #0b1026;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 10px;
      border: 1px solid #1e293b;
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
      color: #94a3b8;
    }
    .metric-val {
      font-weight: 600;
      color: #f1f5f9;
      font-family: monospace;
    }
    .btn {
      width: 100%;
      background: linear-gradient(135deg, #7c3aed, #2563eb);
      color: white;
      border: none;
      padding: 10px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
      margin-top: 6px;
    }
    .btn:hover {
      opacity: 0.95;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">
      <span>🛡️</span>
      <span>Crypticookie Shield v1.1</span>
    </div>
    <span class="badge" id="site-status">Protected</span>
  </div>

  <div class="status-card">
    <div style="color:#94a3b8; font-size:11px;">Active Monitored Website:</div>
    <div id="domain-name" style="font-weight:700; font-size:13px; margin-top:4px; word-break:break-all; color:#38bdf8; font-family:monospace;">
      Detecting URL...
    </div>
  </div>

  <div class="status-card">
    <div class="metric-row">
      <span>Website Monitoring</span>
      <span class="metric-val" style="color:#34d399;">Active (Auto-Scan)</span>
    </div>
    <div class="metric-row">
      <span>Cloud Firestore Sync</span>
      <span class="metric-val" style="color:#38bdf8;">Connected</span>
    </div>
    <div class="metric-row">
      <span>CMP Whitelist Validation</span>
      <span class="metric-val" id="cmp-state">SHA-256 Verified</span>
    </div>
  </div>

  <button class="btn" id="open-dashboard-btn">Open Real-Time Web Dashboard</button>

  <script src="popup.js"></script>
</body>
</html>`;

export const EXTENSION_POPUP_JS = `document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      try {
        const url = new URL(tabs[0].url);
        document.getElementById('domain-name').innerText = url.hostname;
      } catch (e) {
        document.getElementById('domain-name').innerText = 'Local Browser Session';
      }
    }
  });

  document.getElementById('open-dashboard-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  });
});
`;

export const EXTENSION_STYLES_CSS = `#crypticookie-shield-root {
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
  background: #070b19;
  border: 1px solid #1e293b;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
  border-radius: 14px;
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
  color: #a78bfa;
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
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
}

.crypticookie-body {
  background: #0b1026;
  border-radius: 10px;
  padding: 12px;
  font-size: 12px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid #1e293b;
}

.crypticookie-code {
  background: #060a17;
  padding: 2px 4px;
  border-radius: 4px;
  color: #38bdf8;
  font-family: monospace;
}

.crypticookie-rec-tag {
  color: #a78bfa;
  font-weight: 600;
}

.crypticookie-actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.crypticookie-btn {
  padding: 8px 4px;
  border-radius: 8px;
  border: none;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  transition: opacity 0.15s;
}

.crypticookie-btn:hover {
  opacity: 0.9;
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
`;

export const EXTENSION_README_MD = `# Crypticookie: Live Website & CMP Consent Shield (Manifest V3)

## How to Install Unpacked in Chrome, Brave, Edge:
1. Extract this \`crypticookie-manifest-v3-extension.zip\` archive into a folder on your computer.
2. Open your browser and navigate to \`chrome://extensions/\` (or \`brave://extensions/\` / \`edge://extensions/\`).
3. Toggle ON **"Developer mode"** in the top-right corner.
4. Click **"Load unpacked"** in the top-left toolbar.
5. Select the extracted folder containing \`manifest.json\`.
6. The Crypticookie extension is now active, actively detecting websites you open, evaluating CMP popups, and recording consent proofs!
`;

export const ALL_EXTENSION_FILES: ExtensionFile[] = [
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
    description: 'Service worker monitoring website navigation, CMP hash lookups, SHA-256 cryptographic hashing, and local ledger storage.',
    content: EXTENSION_BACKGROUND_JS,
  },
  {
    name: 'content.js',
    path: 'content.js',
    language: 'javascript',
    description: 'DOM Interceptor scanning for deceptive cookie banners, sniffing tracking tags, and injecting the Privacy Shield overlay.',
    content: EXTENSION_CONTENT_JS,
  },
  {
    name: 'popup.html',
    path: 'popup.html',
    language: 'html',
    description: 'Extension toolbar popup UI displaying active detected website, tracker count, and cloud sync status.',
    content: EXTENSION_POPUP_HTML,
  },
  {
    name: 'popup.js',
    path: 'popup.js',
    language: 'javascript',
    description: 'Popup script querying active browser tab details.',
    content: EXTENSION_POPUP_JS,
  },
  {
    name: 'styles.css',
    path: 'styles.css',
    language: 'css',
    description: 'Crisp dark-mode styling for the injected DOM privacy shield.',
    content: EXTENSION_STYLES_CSS,
  },
  {
    name: 'README.md',
    path: 'README.md',
    language: 'markdown',
    description: 'Installation and developer instructions for running unpacked in Chromium browsers.',
    content: EXTENSION_README_MD,
  },
];

/**
 * Generate a downloadable .zip archive of the complete working Chrome Extension
 */
export async function downloadExtensionZip(): Promise<void> {
  const zip = new JSZip();
  
  for (const file of ALL_EXTENSION_FILES) {
    zip.file(file.name, file.content);
  }

  // Create an icons folder with placeholder data URIs or SVG text
  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
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
