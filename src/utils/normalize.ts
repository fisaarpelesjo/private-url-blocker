import type { NormalizedRule } from "../types/blocklist";

const STRIPPED_PREFIXES = ["www.", "m."];

export function normalizeInput(rawInput: string): NormalizedRule {
  const input = rawInput.trim().toLowerCase();
  if (input.length === 0) {
    throw new Error("Informe um dominio ou URL.");
  }

  const withoutProtocol = input.replace(/^https?:\/\//u, "");
  const wildcardHost = withoutProtocol.startsWith("*.");
  const parsed = parseRuleInput(withoutProtocol);
  const host = normalizeHost(parsed.host, wildcardHost);

  if (host.length === 0 || !host.includes(".")) {
    throw new Error("Informe um dominio valido.");
  }

  const path = normalizePath(parsed.path);
  const hasWildcardPath = path.endsWith("/*");
  const shouldUsePath = path !== "" && path !== "/" && !parsed.hadQueryOrHash;

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

export function normalizeHost(host: string, keepWildcardPrefix = false): string {
  let normalized = host.replace(/\/+$/u, "").replace(/\.+$/u, "");

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
  const beforeQuery = hadQueryOrHash ? input.slice(0, queryIndex) : input;
  const slashIndex = beforeQuery.indexOf("/");

  if (slashIndex < 0) {
    return { host: beforeQuery, path: "", hadQueryOrHash };
  }

  return {
    host: beforeQuery.slice(0, slashIndex),
    path: beforeQuery.slice(slashIndex),
    hadQueryOrHash
  };
}

function normalizePath(path: string): string {
  if (path === "") {
    return "";
  }

  const squashed = path.replace(/\/{2,}/gu, "/");
  return squashed.startsWith("/") ? squashed : `/${squashed}`;
}
