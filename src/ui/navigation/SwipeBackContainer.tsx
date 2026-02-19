import { useRouter } from "expo-router";
import { PropsWithChildren, useMemo } from "react";
import { PanResponder, Platform, StyleSheet, View } from "react-native";
import { goBackWithFallback } from "./backNavigation";

type Props = PropsWithChildren<{
  enabled?: boolean;
  edgeWidth?: number;
  backgroundColor?: string;
}>;

const SWIPE_BACK_DISTANCE = 72;
const SWIPE_BACK_VELOCITY = 0.55;

export function SwipeBackContainer({
  children,
  enabled = Platform.OS === "ios",
  edgeWidth = 28,
  backgroundColor,
}: Props) {
  const router = useRouter();

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) => {
          if (!enabled) {
            return false;
          }
          const horizontalDistance = Math.abs(gestureState.dx);
          const verticalDistance = Math.abs(gestureState.dy);
          return gestureState.dx > 6 && horizontalDistance > verticalDistance;
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (!enabled) {
            return;
          }
          const shouldGoBack =
            gestureState.dx >= SWIPE_BACK_DISTANCE || gestureState.vx >= SWIPE_BACK_VELOCITY;
          if (!shouldGoBack) {
            return;
          }
          goBackWithFallback({
            back: () => router.back(),
            canGoBack: () => (typeof router.canGoBack === "function" ? router.canGoBack() : true),
            replace: (href) => router.replace(href),
          });
        },
      }),
    [enabled, router]
  );

  return (
    <View style={[styles.container, backgroundColor ? { backgroundColor } : null]}>
      {children}
      {enabled ? (
        <View style={[styles.edgeGestureArea, { width: edgeWidth }]} {...responder.panHandlers} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  edgeGestureArea: {
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    zIndex: 20,
  },
});
