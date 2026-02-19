import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

type Props = {
  label: string;
  accentColor: string;
  textColor: string;
  hintColor?: string;
  hintDelayMs?: number;
};

export function LoadingPulse({
  label,
  accentColor,
  textColor,
  hintColor,
  hintDelayMs = 5500,
}: Props) {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setShowHint(false);
    const timer = setTimeout(() => setShowHint(true), hintDelayMs);
    return () => clearTimeout(timer);
  }, [hintDelayMs, label]);

  useEffect(() => {
    const animations = dots.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 120),
          Animated.timing(value, {
            toValue: 1,
            duration: 320,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.3,
            duration: 320,
            useNativeDriver: true,
          }),
          Animated.delay(180),
        ])
      )
    );
    for (const animation of animations) {
      animation.start();
    }
    return () => {
      for (const animation of animations) {
        animation.stop();
      }
    };
  }, [dots]);

  const dotStyle = useMemo(
    () =>
      StyleSheet.create({
        dot: {
          backgroundColor: accentColor,
        },
      }),
    [accentColor]
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      <View style={styles.dots}>
        {dots.map((value, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              dotStyle.dot,
              {
                opacity: value,
                transform: [
                  {
                    scale: value.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [0.88, 1.12],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
      {showHint ? (
        <Text style={[styles.hint, { color: hintColor ?? textColor }]}>
          進捗表示がなくても処理は継続中です。
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    height: 14,
  },
  dot: {
    borderRadius: 99,
    height: 8,
    width: 8,
  },
  hint: {
    fontSize: 11,
  },
});
