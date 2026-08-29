export type CMPStatus = 'whitelist' | 'blacklist' | 'unlisted';

export type CookieType = 'necessary' | 'optional' | 'suspicious' | 'all';

export type VerificationResult = 'Verified' | 'Unverified' | 'Warning';

export type GuidanceRecommendation = 'Accept?' | 'Customize?' | 'Warning' | 'Opt for Necessary?';

export type ConsentAction = 'accept' | 'reject' | 'customize';

export type AuditOutput = 'Consent Recorded' | 'Rejection Recorded' | 'Preference Change Recorded';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  username: string;
  created_at: string;
}

export interface ChromeProfile {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export interface CMPRegistryItem {
  id: string;
  script_hash: string;
  cmp_name: string;
  status: CMPStatus;
  submitted_by: string;
  created_at: string;
}

export interface CookieEvent {
  id: string;
  user_id: string;
  profile_id?: string;
  site_domain: string;
  cookie_hash: string;
  cookie_type: CookieType;
  verification_result: VerificationResult;
  guidance_shown: GuidanceRecommendation;
  created_at: string;
}

export interface PrivateLedgerBlock {
  id: string;
  block_index: number;
  prev_hash: string;
  hash: string;
  user_id: string;
  profile_id?: string;
  cookie_event_id: string;
  consent_action: ConsentAction;
  audit_output: AuditOutput;
  timestamp: string;
}

export interface PublicLedgerBlock {
  id: string;
  block_index: number;
  prev_hash: string;
  hash: string;
  site_domain: string;
  user_id?: string;
  profile_id?: string;
  cookie_hash: string;
  verification_result: VerificationResult;
  consent_action: ConsentAction;
  timestamp: string;
}

export type PrivacyRiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface DetectedTracker {
  name: string;
  category: 'Analytics' | 'Advertising' | 'Fingerprinting' | 'Essential';
  domain: string;
  blocked: boolean;
}

export interface MonitoredDomain {
  id: string;
  user_id?: string;
  domain: string;
  url: string;
  title: string;
  cmp_detected: boolean;
  cmp_name: string;
  script_hash: string;
  verification_result: VerificationResult;
  cookie_count: number;
  trackers_count: number;
  trackers_list: DetectedTracker[];
  privacy_risk_level: PrivacyRiskLevel;
  timestamp: string;
  auto_blocked: boolean;
  guidance: GuidanceRecommendation;
}

export interface ChainVerificationResult {
  isValid: boolean;
  brokenBlockIndex: number | null;
  expectedHash: string | null;
  actualHash: string | null;
  totalBlocks: number;
}
