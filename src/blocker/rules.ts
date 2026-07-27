import type { BlockEntry, MatchResult, NormalizedRule } from "../types/blocklist";
import { normalizeHost, normalizeInput } from "../utils/normalize";

interface PathRule {
  readonly prefix: string;
  readonly value: string;
}

export interface BlockIndex {
  readonly exactDomains: ReadonlySet<string>;
  readonly wildcardDomains: ReadonlySet<string>;
  readonly pathRulesByHost: ReadonlyMap<string, readonly PathRule[]>;
}

export function createBlockIndex(entries: readonly BlockEntry[]): BlockIndex {
  const exactDomains = new Set<string>();
  const wildcardDomains = new Set<string>();
  const pathRulesByHost = new Map<string, PathRule[]>();

  for (const entry of entries) {
    const rule = normalizeInput(entry.value);
    addRuleToIndex(rule, exactDomains, wildcardDomains, pathRulesByHost);
  }

  return {
    exactDomains,
    wildcardDomains,
    pathRulesByHost
  };
}

export function matchUrl(url: string, index: BlockIndex): MatchResult {
  const parsed = safeParseUrl(url);
  if (parsed === null || !["http:", "https:"].includes(parsed.protocol)) {
    return { blocked: false };
  }

  const host = normalizeHost(parsed.hostname);
  const path = parsed.pathname || "/";

  if (index.exactDomains.has(host)) {
    return { blocked: true, rule: host };
  }

  const wildcardRule = findWildcardDomainRule(host, index.wildcardDomains);
  if (wildcardRule !== null) {
    return { blocked: true, rule: `*.${wildcardRule}` };
  }

  const pathRules = index.pathRulesByHost.get(host);
  if (pathRules !== undefined) {
    for (const rule of pathRules) {
      if (path.startsWith(rule.prefix)) {
        return { blocked: true, rule: rule.value };
      }
    }
  }

  return { blocked: false };
}

function addRuleToIndex(
  rule: NormalizedRule,
  exactDomains: Set<string>,
  wildcardDomains: Set<string>,
  pathRulesByHost: Map<string, PathRule[]>
): void {
  if (rule.kind === "domain") {
    exactDomains.add(rule.host);
    return;
  }

  if (rule.kind === "wildcard-domain") {
    wildcardDomains.add(rule.host);
    return;
  }

  const prefix = rule.pathPrefix ?? "/";
  const rules = pathRulesByHost.get(rule.host) ?? [];
  rules.push({ prefix, value: rule.value });
  pathRulesByHost.set(rule.host, rules);
}

function findWildcardDomainRule(host: string, wildcardDomains: ReadonlySet<string>): string | null {
  const labels = host.split(".");

  for (let index = 1; index < labels.length - 1; index += 1) {
    const suffix = labels.slice(index).join(".");
    if (wildcardDomains.has(suffix)) {
      return suffix;
    }
  }

  return null;
}

function safeParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
