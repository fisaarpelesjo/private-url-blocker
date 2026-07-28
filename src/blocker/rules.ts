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
  readonly searchKeywords: ReadonlyMap<string, string>;
}

export function createBlockIndex(entries: readonly BlockEntry[]): BlockIndex {
  const exactDomains = new Set<string>();
  const wildcardDomains = new Set<string>();
  const pathRulesByHost = new Map<string, PathRule[]>();
  const searchKeywords = new Map<string, string>();

  for (const entry of entries) {
    const rule = normalizeInput(entry.value);
    addRuleToIndex(rule, exactDomains, wildcardDomains, pathRulesByHost, searchKeywords);
  }

  return {
    exactDomains,
    wildcardDomains,
    pathRulesByHost,
    searchKeywords
  };
}

export function matchUrl(url: string, index: BlockIndex): MatchResult {
  const parsed = safeParseUrl(url);
  if (parsed === null || !["http:", "https:"].includes(parsed.protocol)) {
    return { blocked: false };
  }

  const host = normalizeHost(parsed.hostname);
  const path = `${parsed.pathname || "/"}${parsed.search}${parsed.hash}`.toLowerCase();

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

  const searchKeywordRule = findSearchKeywordRule(parsed, index.searchKeywords);
  if (searchKeywordRule !== null) {
    return { blocked: true, rule: searchKeywordRule };
  }

  return { blocked: false };
}

function addRuleToIndex(
  rule: NormalizedRule,
  exactDomains: Set<string>,
  wildcardDomains: Set<string>,
  pathRulesByHost: Map<string, PathRule[]>,
  searchKeywords: Map<string, string>
): void {
  if (rule.kind === "search-keyword") {
    const keyword = rule.pathPrefix ?? "";
    searchKeywords.set(normalizeSearchText(keyword), rule.value);
    return;
  }

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

function findSearchKeywordRule(parsed: URL, searchKeywords: ReadonlyMap<string, string>): string | null {
  if (searchKeywords.size === 0) {
    return null;
  }

  for (const value of getSearchValues(parsed)) {
    const normalizedValue = normalizeSearchText(value);
    for (const [keyword, rule] of searchKeywords) {
      if (matchesSearchKeyword(normalizedValue, keyword)) {
        return rule;
      }
    }
  }

  return null;
}

function getSearchValues(parsed: URL): readonly string[] {
  const keys = ["q", "query", "search_query", "search", "keyword", "keywords", "text", "term"];
  return keys.flatMap((key) => parsed.searchParams.getAll(key));
}

function matchesSearchKeyword(value: string, keyword: string): boolean {
  if (keyword.length <= 3) {
    const tokenPattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(keyword)}(?:$|[^a-z0-9])`, "u");
    return tokenPattern.test(value);
  }

  return value.includes(keyword);
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
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
