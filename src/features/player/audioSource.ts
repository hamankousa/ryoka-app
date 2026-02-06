export function isMidiUrl(uri: string) {
  const clean = uri.split("?")[0].split("#")[0].toLowerCase();
  return clean.endsWith(".mid") || clean.endsWith(".midi");
}

