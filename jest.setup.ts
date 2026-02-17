import "@testing-library/jest-native/extend-expect";
import "react-native-gesture-handler/jestSetup";

jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const { Easing, View, Text, Image, ScrollView } = require("react-native");

  function interpolate(value: number, inputRange: number[], outputRange: number[]) {
    if (inputRange.length === 0 || outputRange.length === 0) {
      return 0;
    }
    if (value <= inputRange[0]) {
      return outputRange[0];
    }
    if (value >= inputRange[inputRange.length - 1]) {
      return outputRange[outputRange.length - 1];
    }
    for (let index = 1; index < inputRange.length; index += 1) {
      const start = inputRange[index - 1];
      const end = inputRange[index];
      if (value <= end) {
        const ratio = (value - start) / Math.max(end - start, 1e-6);
        return outputRange[index - 1] + (outputRange[index] - outputRange[index - 1]) * ratio;
      }
    }
    return outputRange[outputRange.length - 1];
  }

  const createAnimatedComponent = (Component: React.ComponentType<any>) => Component;

  return {
    __esModule: true,
    default: {
      View,
      Text,
      Image,
      ScrollView,
      createAnimatedComponent,
    },
    Easing,
    Extrapolation: { CLAMP: "clamp", EXTEND: "extend", IDENTITY: "identity" },
    interpolate,
    runOnJS: (fn: (...args: any[]) => unknown) => fn,
    useEvent: () => () => {},
    useHandler: () => ({ context: {}, doDependenciesDiffer: false }),
    useAnimatedStyle: (updater: () => Record<string, unknown>) => updater(),
    useSharedValue: <T,>(initial: T) => ({ value: initial }),
    withTiming: <T,>(toValue: T, _config?: unknown, callback?: (finished: boolean) => void) => {
      callback?.(true);
      return toValue;
    },
    withSpring: <T,>(toValue: T, _config?: unknown, callback?: (finished: boolean) => void) => {
      callback?.(true);
      return toValue;
    },
  };
});
