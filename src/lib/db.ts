import Dexie, { type Table } from 'dexie';
import {
  type User,
  type CMPRegistryItem,
  type CookieEvent,
  type PrivateLedgerBlock,
  type PublicLedgerBlock,
  type ChainVerificationResult,
  type ConsentAction,
  type CookieType,
  type VerificationResult,
  type GuidanceRecommendation,
  type AuditOutput,
  type MonitoredDomain,
} from '../types/database';
import {
  sha256,
  computePublicBlockHash,
  computePrivateBlockHash,
} from './crypto';
import { firestoreDb, firebaseConfigData } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';

export class CrypticookieDatabase extends Dexie {
  users!: Table<User, string>;
  cmp_registry!: Table<CMPRegistryItem, string>;
  cookie_events!: Table<CookieEvent, string>;
  private_ledger!: Table<PrivateLedgerBlock, string>;
  public_ledger!: Table<PublicLedgerBlock, string>;
  monitored_domains!: Table<MonitoredDomain, string>;

  constructor() {
    super('CrypticookieDB');
    this.version(2).stores({
      users: 'id, email, username',
      cmp_registry: 'id, &script_hash, cmp_name, status',
      cookie_events: 'id, user_id, site_domain, cookie_hash, cookie_type, verification_result, created_at',
      private_ledger: 'id, block_index, hash, user_id, cookie_event_id, timestamp',
      public_ledger: 'id, block_index, hash, site_domain, cookie_hash, timestamp',
      monitored_domains: 'id, domain, url, privacy_risk_level, timestamp',
    });
  }
}

export const db = new CrypticookieDatabase();

const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

// Canonical CMP Registry seed items
const INITIAL_CMP_REGISTRY: Omit<CMPRegistryItem, 'id'>[] = [
  {
    script_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    cmp_name: 'OneTrust Privacy Banner v6.32',
    status: 'whitelist',
    submitted_by: 'System Admin',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    script_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    cmp_name: 'Cookiebot CMP (Usercentrics) v4.1',
    status: 'whitelist',
    submitted_by: 'Security Auditor',
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
  {
    script_hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    cmp_name: 'Klaro! Open Source Consent v0.7',
    status: 'whitelist',
    submitted_by: 'OpenPrivacy Guild',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    script_hash: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    cmp_name: 'Axeptio Consent SDK v2.0',
    status: 'whitelist',
    submitted_by: 'System Admin',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    script_hash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
    cmp_name: 'Malicious Deceptive Tracker Injector (Dark Pattern)',
    status: 'blacklist',
    submitted_by: 'Threat Intel Feed',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    script_hash: 'c2e26095908990cf250785f7a0c102a90038b36fa2d2a452ef2e63db7a6a4f7e',
    cmp_name: 'Stealth Fingerprint Harvester v1.2',
    status: 'blacklist',
    submitted_by: 'Security Research Lab',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

/**
 * Helper to sync a single document to Firebase Firestore safely
 */
export async function syncToFirestore(collectionName: string, docId: string, data: any): Promise<void> {
  try {
    if (!firestoreDb) return;
    const docRef = doc(firestoreDb, collectionName, docId);
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    console.warn(`Firestore sync note (${collectionName}/${docId}):`, error);
  }
}

/**
 * Helper to delete a single document from Firebase Firestore
 */
export async function deleteFromFirestore(collectionName: string, docId: string): Promise<void> {
  try {
    if (!firestoreDb) return;
    const docRef = doc(firestoreDb, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`Firestore delete note (${collectionName}/${docId}):`, error);
  }
}

/**
 * Initialize Database and Seed Canonical CMP entries and Genesis Block
 */
export async function initializeDatabase(): Promise<void> {
  const cmpCount = await db.cmp_registry.count();
  if (cmpCount === 0) {
    const items: CMPRegistryItem[] = INITIAL_CMP_REGISTRY.map(item => ({
      ...item,
      id: 'cmp_' + Math.random().toString(36).substring(2, 10),
    }));
    await db.cmp_registry.bulkAdd(items);

    // Sync seed CMPs to Firestore
    for (const item of items) {
      await syncToFirestore('cmp_registry', item.id, item);
    }
  }

  // Check if public and private ledgers have genesis blocks
  const publicCount = await db.public_ledger.count();
  if (publicCount === 0) {
    const genesisTime = new Date().toISOString();
    const genesisPublicHash = await computePublicBlockHash(
      GENESIS_PREV_HASH,
      0,
      'crypticookie.genesis.network',
      '0000000000000000000000000000000000000000000000000000000000000000',
      'Verified',
      'accept',
      genesisTime
    );

    const genesisPublicBlock: PublicLedgerBlock = {
      id: 'pb_genesis_0',
      block_index: 0,
      prev_hash: GENESIS_PREV_HASH,
      hash: genesisPublicHash,
      site_domain: 'crypticookie.genesis.network',
      cookie_hash: '0000000000000000000000000000000000000000000000000000000000000000',
      verification_result: 'Verified',
      consent_action: 'accept',
      timestamp: genesisTime,
    };
    await db.public_ledger.add(genesisPublicBlock);
    await syncToFirestore('public_ledger', genesisPublicBlock.id, genesisPublicBlock);

    const genesisPrivateHash = await computePrivateBlockHash(
      GENESIS_PREV_HASH,
      0,
      'u_genesis_root',
      'event_genesis_0',
      'accept',
      'Consent Recorded',
      genesisTime
    );

    const genesisPrivateBlock: PrivateLedgerBlock = {
      id: 'pv_genesis_0',
      block_index: 0,
      prev_hash: GENESIS_PREV_HASH,
      hash: genesisPrivateHash,
      user_id: 'u_genesis_root',
      cookie_event_id: 'event_genesis_0',
      consent_action: 'accept',
      audit_output: 'Consent Recorded',
      timestamp: genesisTime,
    };
    await db.private_ledger.add(genesisPrivateBlock);
    await syncToFirestore('private_ledger', genesisPrivateBlock.id, genesisPrivateBlock);
  }
}

/**
 * Determine Verification Result based on CMP Registry placement
 */
export async function determineVerificationResult(scriptHash: string): Promise<{
  result: VerificationResult;
  cmpItem: CMPRegistryItem | null;
}> {
  const item = await db.cmp_registry.where('script_hash').equals(scriptHash.trim()).first();
  if (!item) {
    return { result: 'Unverified', cmpItem: null };
  }
  if (item.status === 'whitelist') {
    return { result: 'Verified', cmpItem: item };
  }
  if (item.status === 'blacklist') {
    return { result: 'Warning', cmpItem: item };
  }
  return { result: 'Unverified', cmpItem: item };
}

/**
 * Determine Guidance Recommendation based on Cookie Type & Verification
 */
export function determineGuidance(cookieType: CookieType, verificationResult: VerificationResult): GuidanceRecommendation {
  if (verificationResult === 'Warning' || cookieType === 'suspicious') {
    return 'Warning';
  }
  switch (cookieType) {
    case 'necessary':
      return 'Accept?';
    case 'optional':
      return 'Customize?';
    case 'all':
      return 'Opt for Necessary?';
    default:
      return 'Customize?';
  }
}

/**
 * Determine Audit Output based on User Consent Action
 */
export function determineAuditOutput(consentAction: ConsentAction): AuditOutput {
  switch (consentAction) {
    case 'accept':
      return 'Consent Recorded';
    case 'reject':
      return 'Rejection Recorded';
    case 'customize':
      return 'Preference Change Recorded';
  }
}

/**
 * Record a full consent transaction across cookie_events, private_ledger, public_ledger & Firestore
 */
export async function recordConsentTransaction(params: {
  userId: string;
  siteDomain: string;
  cookieHash: string;
  cookieType: CookieType;
  consentAction: ConsentAction;
  timestampOffsetMs?: number;
}): Promise<{
  cookieEvent: CookieEvent;
  privateBlock: PrivateLedgerBlock;
  publicBlock: PublicLedgerBlock;
}> {
  const timestamp = new Date(Date.now() + (params.timestampOffsetMs || 0)).toISOString();
  
  // 1. Verify script hash against registry
  const { result: verificationResult } = await determineVerificationResult(params.cookieHash);
  const guidanceShown = determineGuidance(params.cookieType, verificationResult);
  const auditOutput = determineAuditOutput(params.consentAction);

  // 2. Insert into cookie_events
  const eventId = 'ev_' + Math.random().toString(36).substring(2, 11);
  const cookieEvent: CookieEvent = {
    id: eventId,
    user_id: params.userId,
    site_domain: params.siteDomain.toLowerCase().trim(),
    cookie_hash: params.cookieHash.trim(),
    cookie_type: params.cookieType,
    verification_result: verificationResult,
    guidance_shown: guidanceShown,
    created_at: timestamp,
  };
  await db.cookie_events.add(cookieEvent);
  await syncToFirestore('cookie_events', cookieEvent.id, cookieEvent);

  // 3. Chained Block in private_ledger
  const lastPrivateBlock = await db.private_ledger.orderBy('block_index').last();
  const nextPrivateIndex = lastPrivateBlock ? lastPrivateBlock.block_index + 1 : 0;
  const prevPrivateHash = lastPrivateBlock ? lastPrivateBlock.hash : GENESIS_PREV_HASH;
  
  const privateBlockHash = await computePrivateBlockHash(
    prevPrivateHash,
    nextPrivateIndex,
    params.userId,
    eventId,
    params.consentAction,
    auditOutput,
    timestamp
  );

  const privateBlock: PrivateLedgerBlock = {
    id: 'pv_' + Math.random().toString(36).substring(2, 11),
    block_index: nextPrivateIndex,
    prev_hash: prevPrivateHash,
    hash: privateBlockHash,
    user_id: params.userId,
    cookie_event_id: eventId,
    consent_action: params.consentAction,
    audit_output: auditOutput,
    timestamp,
  };
  await db.private_ledger.add(privateBlock);
  await syncToFirestore('private_ledger', privateBlock.id, privateBlock);

  // 4. Chained Block in public_ledger (de-identified)
  const lastPublicBlock = await db.public_ledger.orderBy('block_index').last();
  const nextPublicIndex = lastPublicBlock ? lastPublicBlock.block_index + 1 : 0;
  const prevPublicHash = lastPublicBlock ? lastPublicBlock.hash : GENESIS_PREV_HASH;

  const publicBlockHash = await computePublicBlockHash(
    prevPublicHash,
    nextPublicIndex,
    params.siteDomain.toLowerCase().trim(),
    params.cookieHash.trim(),
    verificationResult,
    params.consentAction,
    timestamp
  );

  const publicBlock: PublicLedgerBlock = {
    id: 'pb_' + Math.random().toString(36).substring(2, 11),
    block_index: nextPublicIndex,
    prev_hash: prevPublicHash,
    hash: publicBlockHash,
    site_domain: params.siteDomain.toLowerCase().trim(),
    cookie_hash: params.cookieHash.trim(),
    verification_result: verificationResult,
    consent_action: params.consentAction,
    timestamp,
  };
  await db.public_ledger.add(publicBlock);
  await syncToFirestore('public_ledger', publicBlock.id, publicBlock);

  return { cookieEvent, privateBlock, publicBlock };
}

/**
 * Record a Live Monitored Website domain inspection event
 */
export async function recordMonitoredDomain(domainData: Omit<MonitoredDomain, 'id' | 'timestamp'>): Promise<MonitoredDomain> {
  const item: MonitoredDomain = {
    ...domainData,
    id: 'mon_' + Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString(),
  };

  await db.monitored_domains.add(item);
  await syncToFirestore('monitored_domains', item.id, item);
  return item;
}

/**
 * Fetch all monitored domains (most recent first)
 */
export async function getMonitoredDomains(limitCount: number = 50): Promise<MonitoredDomain[]> {
  const list = await db.monitored_domains.toArray();
  return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limitCount);
}

/**
 * Clear Monitored Domains log
 */
export async function clearMonitoredDomains(): Promise<void> {
  await db.monitored_domains.clear();
}

/**
 * Verify cryptographic integrity of the Public Ledger Chain
 */
export async function verifyPublicChainIntegrity(): Promise<ChainVerificationResult> {
  const blocks = await db.public_ledger.orderBy('block_index').toArray();
  if (blocks.length === 0) {
    return { isValid: true, brokenBlockIndex: null, expectedHash: null, actualHash: null, totalBlocks: 0 };
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const prevBlock = i > 0 ? blocks[i - 1] : null;
    const expectedPrevHash = prevBlock ? prevBlock.hash : GENESIS_PREV_HASH;

    // Check prev_hash linkage
    if (block.prev_hash !== expectedPrevHash) {
      return {
        isValid: false,
        brokenBlockIndex: block.block_index,
        expectedHash: expectedPrevHash,
        actualHash: block.prev_hash,
        totalBlocks: blocks.length,
      };
    }

    // Recompute block hash
    const recomputedHash = await computePublicBlockHash(
      block.prev_hash,
      block.block_index,
      block.site_domain,
      block.cookie_hash,
      block.verification_result,
      block.consent_action,
      block.timestamp
    );

    if (block.hash !== recomputedHash) {
      return {
        isValid: false,
        brokenBlockIndex: block.block_index,
        expectedHash: recomputedHash,
        actualHash: block.hash,
        totalBlocks: blocks.length,
      };
    }
  }

  return {
    isValid: true,
    brokenBlockIndex: null,
    expectedHash: null,
    actualHash: null,
    totalBlocks: blocks.length,
  };
}

/**
 * Tamper with a Public Ledger Block to simulate unauthorized alterations
 */
export async function tamperPublicBlock(blockIndex: number, alteredDomain: string, alteredAction?: ConsentAction): Promise<void> {
  const block = await db.public_ledger.where('block_index').equals(blockIndex).first();
  if (!block) throw new Error(`Block #${blockIndex} not found in public ledger.`);

  await db.public_ledger.update(block.id, {
    site_domain: alteredDomain,
    ...(alteredAction ? { consent_action: alteredAction } : {}),
  });
}

/**
 * Repair and Recalculate Public Ledger Chain from a given block forward
 */
export async function repairPublicChain(fromIndex: number = 0): Promise<void> {
  const blocks = await db.public_ledger.orderBy('block_index').toArray();
  for (let i = fromIndex; i < blocks.length; i++) {
    const block = blocks[i];
    const prevBlock = i > 0 ? blocks[i - 1] : null;
    const validPrevHash = prevBlock ? prevBlock.hash : GENESIS_PREV_HASH;

    const recalculatedHash = await computePublicBlockHash(
      validPrevHash,
      block.block_index,
      block.site_domain,
      block.cookie_hash,
      block.verification_result,
      block.consent_action,
      block.timestamp
    );

    await db.public_ledger.update(block.id, {
      prev_hash: validPrevHash,
      hash: recalculatedHash,
    });
    
    // Update memory representation for subsequent loop iteration
    block.prev_hash = validPrevHash;
    block.hash = recalculatedHash;
  }
}

/**
 * Query real database statistics directly using Dexie/SQL queries
 */
export async function getDatabaseMetrics() {
  const events = await db.cookie_events.toArray();
  const publicBlocks = await db.public_ledger.toArray();
  const privateBlocks = await db.private_ledger.toArray();
  const cmpItems = await db.cmp_registry.toArray();
  const monitored = await db.monitored_domains.toArray();

  const uniqueDomains = new Set(events.map(e => e.site_domain));
  const threatsBlocked = events.filter(e => e.verification_result === 'Warning' || e.cookie_type === 'suspicious').length +
    monitored.filter(m => m.auto_blocked || m.privacy_risk_level === 'High' || m.privacy_risk_level === 'Critical').length;
  
  const verifiedCount = events.filter(e => e.verification_result === 'Verified').length;
  const unverifiedCount = events.filter(e => e.verification_result === 'Unverified').length;

  const whitelistedCMPs = cmpItems.filter(c => c.status === 'whitelist').length;
  const blacklistedCMPs = cmpItems.filter(c => c.status === 'blacklist').length;
  const unlistedCMPs = cmpItems.filter(c => c.status === 'unlisted').length;

  return {
    protectedPlatformsCount: uniqueDomains.size,
    publicLedgerCount: publicBlocks.length,
    privateLedgerCount: privateBlocks.length,
    totalLedgerBlocks: publicBlocks.length + privateBlocks.length,
    threatsBlockedCount: threatsBlocked,
    totalEventsCount: events.length,
    monitoredDomainsCount: monitored.length,
    verifiedCount,
    unverifiedCount,
    whitelistedCMPs,
    blacklistedCMPs,
    unlistedCMPs,
    totalCMPs: cmpItems.length,
    firestoreProjectId: firebaseConfigData.projectId,
    firestoreDatabaseId: firebaseConfigData.firestoreDatabaseId || '(default)',
  };
}

/**
 * Reset database to fresh seed state
 */
export async function resetDatabaseToDefault(): Promise<void> {
  await db.users.clear();
  await db.cmp_registry.clear();
  await db.cookie_events.clear();
  await db.private_ledger.clear();
  await db.public_ledger.clear();
  await db.monitored_domains.clear();
  await initializeDatabase();
}

/**
 * Setup Real-time Firestore Listeners to mirror Cloud Database writes to local Dexie & UI
 */
export function setupFirestoreRealtimeListeners(onUpdate: () => void): () => void {
  if (!firestoreDb) return () => {};

  const unsub1 = onSnapshot(collection(firestoreDb, 'cookie_events'), async (snapshot) => {
    let hasChanges = false;
    for (const change of snapshot.docChanges()) {
      if (change.type === 'added' || change.type === 'modified') {
        const data = { id: change.doc.id, ...change.doc.data() } as CookieEvent;
        await db.cookie_events.put(data);
        hasChanges = true;
      } else if (change.type === 'removed') {
        await db.cookie_events.delete(change.doc.id);
        hasChanges = true;
      }
    }
    if (hasChanges) onUpdate();
  });

  const unsub2 = onSnapshot(collection(firestoreDb, 'public_ledger'), async (snapshot) => {
    let hasChanges = false;
    for (const change of snapshot.docChanges()) {
      if (change.type === 'added' || change.type === 'modified') {
        const data = { id: change.doc.id, ...change.doc.data() } as PublicLedgerBlock;
        await db.public_ledger.put(data);
        hasChanges = true;
      } else if (change.type === 'removed') {
        await db.public_ledger.delete(change.doc.id);
        hasChanges = true;
      }
    }
    if (hasChanges) onUpdate();
  });

  const unsub3 = onSnapshot(collection(firestoreDb, 'monitored_domains'), async (snapshot) => {
    let hasChanges = false;
    for (const change of snapshot.docChanges()) {
      if (change.type === 'added' || change.type === 'modified') {
        const data = { id: change.doc.id, ...change.doc.data() } as MonitoredDomain;
        await db.monitored_domains.put(data);
        hasChanges = true;
      } else if (change.type === 'removed') {
        await db.monitored_domains.delete(change.doc.id);
        hasChanges = true;
      }
    }
    if (hasChanges) onUpdate();
  });

  return () => {
    unsub1();
    unsub2();
    unsub3();
  };
}
