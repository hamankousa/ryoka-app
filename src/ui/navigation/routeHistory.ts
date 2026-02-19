const MAX_ROUTE_HISTORY = 64;

const routeHistory: string[] = [];

type RouteParamValue = string | number | boolean | Array<string | number | boolean> | null | undefined;

const DYNAMIC_SEGMENT_PATTERN = /\[(?:\.\.\.)?([^\]]+)\]/g;

function normalizePath(path: string) {
  const trimmed = path.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function normalizeParamValue(value: RouteParamValue) {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
    return normalized.length > 0 ? normalized : null;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export function buildRoutePath(pathname: string, params: Record<string, RouteParamValue> = {}) {
  const normalizedPath = normalizePath(pathname) ?? "/home";
  const usedParamKeys = new Set<string>();

  const resolvedPath = normalizedPath.replace(DYNAMIC_SEGMENT_PATTERN, (match, key: string) => {
    usedParamKeys.add(key);
    const value = normalizeParamValue(params[key]);
    if (value === null) {
      return match;
    }
    if (Array.isArray(value)) {
      return value.map((part) => encodeURIComponent(part)).join("/");
    }
    return encodeURIComponent(value);
  });

  const queryPairs: string[] = [];
  for (const key of Object.keys(params).sort()) {
    if (usedParamKeys.has(key)) {
      continue;
    }
    const value = normalizeParamValue(params[key]);
    if (value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const part of value) {
        queryPairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(part)}`);
      }
      continue;
    }
    queryPairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }

  if (queryPairs.length === 0) {
    return resolvedPath;
  }
  return `${resolvedPath}?${queryPairs.join("&")}`;
}

export function recordRoutePath(path: string) {
  const normalized = normalizePath(path);
  if (!normalized) {
    return;
  }

  const last = routeHistory[routeHistory.length - 1];
  if (last === normalized) {
    return;
  }

  routeHistory.push(normalized);
  if (routeHistory.length > MAX_ROUTE_HISTORY) {
    routeHistory.splice(0, routeHistory.length - MAX_ROUTE_HISTORY);
  }
}

export function getPreviousRoutePath() {
  if (routeHistory.length < 2) {
    return null;
  }
  return routeHistory[routeHistory.length - 2] ?? null;
}

export function consumePreviousRoutePath() {
  if (routeHistory.length < 2) {
    return null;
  }
  routeHistory.pop();
  return routeHistory[routeHistory.length - 1] ?? null;
}

export function resetRouteHistoryForTest() {
  routeHistory.length = 0;
}
