const MAX_ROUTE_HISTORY = 64;

const routeHistory: string[] = [];

function normalizePath(path: string) {
  const trimmed = path.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
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

export function resetRouteHistoryForTest() {
  routeHistory.length = 0;
}
