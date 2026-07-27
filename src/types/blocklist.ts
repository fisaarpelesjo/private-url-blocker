export interface BlockEntry {
  readonly id: string;
  readonly value: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BlocklistPayload {
  readonly version: 1;
  readonly entries: readonly BlockEntry[];
}

export interface BlocklistBackup {
  readonly version: 1;
  readonly createdAt: string;
  readonly entries: readonly BlockEntry[];
}

export interface MatchResult {
  readonly blocked: boolean;
  readonly rule?: string;
}

export type NormalizedRuleKind = "domain" | "wildcard-domain" | "url-prefix" | "url-wildcard";

export interface NormalizedRule {
  readonly value: string;
  readonly kind: NormalizedRuleKind;
  readonly host: string;
  readonly pathPrefix?: string;
}
