import { getPreviousRoutePath } from "./routeHistory";

type BackNavigationPort = {
  back: () => void;
  replace: (href: string) => void;
  canGoBack?: () => boolean;
};

type GoBackWithFallbackOptions = {
  fallbackHref?: string;
};

export function goBackWithFallback(
  port: BackNavigationPort,
  options: GoBackWithFallbackOptions = {}
) {
  const fallbackHref = options.fallbackHref ?? "/home";
  const canGoBack = port.canGoBack?.() ?? true;

  if (canGoBack) {
    port.back();
    return;
  }

  const previousPath = getPreviousRoutePath();
  if (previousPath) {
    port.replace(previousPath);
    return;
  }

  port.replace(fallbackHref);
}
