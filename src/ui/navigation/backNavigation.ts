import { consumePreviousRoutePath } from "./routeHistory";

type BackNavigationPort = {
  back: () => void;
  replace: (href: string) => void;
  dismissTo?: (href: string) => void;
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

  const previousPath = consumePreviousRoutePath();
  if (previousPath) {
    if (typeof port.dismissTo === "function") {
      port.dismissTo(previousPath);
      return;
    }
    port.replace(previousPath);
    return;
  }

  const canGoBack = port.canGoBack?.() ?? true;
  if (canGoBack) {
    port.back();
    return;
  }

  port.replace(fallbackHref);
}
