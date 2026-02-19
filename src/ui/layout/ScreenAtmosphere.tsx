import { StyleSheet, View } from "react-native";

import { ThemePalette } from "../../domain/themePalette";

type Props = {
  palette: ThemePalette;
};

function toRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized
        .split("")
        .map((char) => `${char}${char}`)
        .join("")
    : normalized;
  const parsed = Number.parseInt(value, 16);
  if (Number.isNaN(parsed)) {
    return `rgba(37, 99, 235, ${alpha})`;
  }
  const red = (parsed >> 16) & 255;
  const green = (parsed >> 8) & 255;
  const blue = parsed & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function ScreenAtmosphere({ palette }: Props) {
  return (
    <View pointerEvents="none" style={styles.layer}>
      <View style={[styles.orbTop, { backgroundColor: toRgba(palette.accent, 0.1) }]} />
      <View style={[styles.orbSide, { backgroundColor: toRgba(palette.tabActive, 0.08) }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  orbTop: {
    borderRadius: 999,
    height: 220,
    position: "absolute",
    right: -80,
    top: -90,
    width: 220,
  },
  orbSide: {
    borderRadius: 999,
    height: 190,
    left: -90,
    position: "absolute",
    top: 130,
    width: 190,
  },
});
