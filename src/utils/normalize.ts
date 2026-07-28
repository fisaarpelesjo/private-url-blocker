import type { NormalizedRule } from "../types/blocklist";

const STRIPPED_PREFIXES = ["www.", "m."];

export function normalizeInput(rawInput: string): NormalizedRule {
  const input = rawInput.trim();
  if (input.length === 0) {
    throw new Error("Informe um dominio ou URL.");
  }

  const keywordRule = normalizeKeywordRule(input);
  if (keywordRule !== null) {
    return keywordRule;
  }

  const withoutProtocol = input.replace(/^https?:\/\//iu, "");
  const wildcardHost = withoutProtocol.startsWith("*.");
  const parsed = parseRuleInput(withoutProtocol);
  const host = normalizeHost(parsed.host, wildcardHost);

  if (host.length === 0 || !host.includes(".")) {
    throw new Error("Informe um dominio valido.");
  }

  const path = normalizePath(parsed.path).toLowerCase();
  const hasWildcardPath = path.endsWith("/*");
  const shouldUsePath = path !== "" && path !== "/";

  if (wildcardHost && shouldUsePath) {
    throw new Error("Wildcard de subdominio nao pode ser combinado com caminho.");
  }

  if (wildcardHost) {
    return {
      value: `*.${host}`,
      kind: "wildcard-domain",
      host
    };
  }

  if (shouldUsePath) {
    const cleanPath = hasWildcardPath ? path.slice(0, -1) : path;
    return {
      value: `${host}${hasWildcardPath ? `${path}` : cleanPath}`,
      kind: hasWildcardPath ? "url-wildcard" : "url-prefix",
      host,
      pathPrefix: cleanPath
    };
  }

  return {
    value: host,
    kind: "domain",
    host
  };
}

function normalizeKeywordRule(input: string): NormalizedRule | null {
  const match = /^(?:keyword|palavra|termo):(.+)$/iu.exec(input);
  if (match === null) {
    return null;
  }

  const keyword = normalizeKeyword(match[1] ?? "");
  if (keyword.length === 0) {
    throw new Error("Informe uma palavra-chave valida.");
  }

  return {
    value: `keyword:${keyword}`,
    kind: "search-keyword",
    host: "",
    pathPrefix: keyword
  };
}

export function normalizeHost(host: string, keepWildcardPrefix = false): string {
  let normalized = host.replace(/\/+$/u, "").replace(/\.+$/u, "").toLowerCase();

  if (keepWildcardPrefix && normalized.startsWith("*.")) {
    normalized = normalized.slice(2);
  }

  for (const prefix of STRIPPED_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      return normalized.slice(prefix.length);
    }
  }

  return normalized;
}

function parseRuleInput(input: string): { readonly host: string; readonly path: string; readonly hadQueryOrHash: boolean } {
  const queryIndex = input.search(/[?#]/u);
  const hadQueryOrHash = queryIndex >= 0;
  const slashIndex = input.indexOf("/");
  const hostEndCandidates = [slashIndex, queryIndex].filter((index) => index >= 0);
  const hostEnd = hostEndCandidates.length > 0 ? Math.min(...hostEndCandidates) : input.length;
  const path = input.slice(hostEnd);

  if (path.length === 0) {
    return { host: input, path: "", hadQueryOrHash };
  }

  return {
    host: input.slice(0, hostEnd),
    path: path.startsWith("/") ? path : `/${path}`,
    hadQueryOrHash
  };
}

function normalizePath(path: string): string {
  if (path === "") {
    return "";
  }

  const queryIndex = path.search(/[?#]/u);
  const pathPart = queryIndex >= 0 ? path.slice(0, queryIndex) : path;
  const suffix = queryIndex >= 0 ? path.slice(queryIndex) : "";
  const squashed = pathPart.replace(/\/{2,}/gu, "/");
  const normalizedPath = squashed.startsWith("/") ? squashed : `/${squashed}`;
  return `${normalizedPath}${suffix}`;
}

function normalizeKeyword(keyword: string): string {
  return keyword.trim().replace(/\s+/gu, " ").toLowerCase();
}
