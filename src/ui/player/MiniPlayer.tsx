import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  title?: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export function MiniPlayer({
  title,
  isPlaying,
  onPlayPause,
  onPrev,
  onNext,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title ?? "未選択"}</Text>
      <View style={styles.controls}>
        <Pressable onPress={onPrev} style={styles.button}>
          <Text>Prev</Text>
        </Pressable>
        <Pressable onPress={onPlayPause} style={styles.button}>
          <Text>{isPlaying ? "Pause" : "Play"}</Text>
        </Pressable>
        <Pressable onPress={onNext} style={styles.button}>
          <Text>Next</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  container: {
    backgroundColor: "#F1F5F9",
    borderTopColor: "#CBD5E1",
    borderTopWidth: 1,
    padding: 12,
  },
  controls: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  title: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "600",
  },
});
