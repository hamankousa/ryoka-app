import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

type Options = {
  durationMs?: number;
  fromY?: number;
};

export function useScreenEntranceMotion({ durationMs = 240, fromY = 12 }: Options = {}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [durationMs, progress]);

  return {
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [fromY, 0],
        }),
      },
    ],
  } as const;
}
