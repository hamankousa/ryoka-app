import { useEffect, useMemo, useState } from "react";

import { audioEngine, PlaybackSnapshot } from "../../features/player/audioEngine";
import {
  cycleLoopModeGlobal,
  getGlobalPlayerState,
  nextGlobal,
  playPauseGlobal,
  prevGlobal,
  selectSourceGlobal,
  subscribeGlobalPlayer,
  toggleShuffleGlobal,
} from "../../features/player/globalPlayer";
import { useAppSettings } from "../../features/settings/SettingsContext";
import { MidiTimbre } from "../../features/player/webMidiEngine";
import { MiniPlayer } from "./MiniPlayer";

type Props = {
  liquidGlassEnabled?: boolean;
  midiGuideLookAheadSec?: number;
};

export function GlobalMiniPlayer({ liquidGlassEnabled = false, midiGuideLookAheadSec = 5 }: Props) {
  const { palette, resolvedTheme } = useAppSettings();
  const [playbackSnapshot, setPlaybackSnapshot] = useState<PlaybackSnapshot>(audioEngine.getSnapshot());
  const [playerState, setPlayerState] = useState(getGlobalPlayerState());
  const [isExpanded, setIsExpanded] = useState(false);
  const [lyricsHtml, setLyricsHtml] = useState<string>("");

  useEffect(() => {
    return audioEngine.subscribe((snapshot) => {
      setPlaybackSnapshot(snapshot);
    });
  }, []);

  useEffect(() => {
    return subscribeGlobalPlayer((snapshot) => {
      setPlayerState(snapshot);
    });
  }, []);

  const currentCreditsText = useMemo(
    () =>
      playerState.currentSong?.credits && playerState.currentSong.credits.length > 0
        ? playerState.currentSong.credits.join(" / ")
        : "-",
    [playerState.currentSong]
  );

  useEffect(() => {
    let mounted = true;
    async function run() {
      const song = playerState.currentSong;
      if (!song) {
        setLyricsHtml("");
        return;
      }
      try {
        const response = await fetch(song.lyrics.htmlUrl);
        const html = await response.text();
        if (mounted) {
          setLyricsHtml(html);
        }
      } catch {
        if (mounted) {
          setLyricsHtml("<p>歌詞の読み込みに失敗しました。</p>");
        }
      }
    }
    void run();
    return () => {
      mounted = false;
    };
  }, [playerState.currentSong]);

  return (
    <MiniPlayer
      title={playerState.currentSong?.title}
      sourceLabel={playerState.sourceLabel}
      loopMode={playerState.loopMode}
      shuffleEnabled={playerState.shuffleEnabled}
      isPlaying={playbackSnapshot.isPlaying}
      positionSec={playbackSnapshot.positionSec}
      durationSec={playbackSnapshot.durationSec}
      midiNotes={playbackSnapshot.midiNotes}
      tempoRate={playbackSnapshot.tempoRate}
      timbre={playbackSnapshot.timbre}
      octaveShift={playbackSnapshot.octaveShift}
      loopEnabled={playbackSnapshot.loopEnabled}
      canSeek={playbackSnapshot.canSeek}
      canLoop={playbackSnapshot.canLoop}
      canControlTempo={playbackSnapshot.canControlTempo}
      canControlTimbre={playbackSnapshot.canControlTimbre}
      canControlOctave={playbackSnapshot.canControlOctave}
      isExpanded={isExpanded}
      liquidGlassEnabled={liquidGlassEnabled}
      midiGuideLookAheadSec={midiGuideLookAheadSec}
      palette={palette}
      resolvedTheme={resolvedTheme}
      onExpand={() => setIsExpanded(true)}
      onCollapse={() => setIsExpanded(false)}
      onPlayPause={() => {
        void playPauseGlobal();
      }}
      onSeek={(seconds) => {
        void audioEngine.seek(seconds);
      }}
      onTempoChange={(rate) => {
        void audioEngine.setTempo(rate);
      }}
      onTimbreChange={(timbre: MidiTimbre) => {
        void audioEngine.setTimbre(timbre);
      }}
      onOctaveShiftChange={(shift) => {
        void audioEngine.setOctaveShift(shift);
      }}
      onLoopToggle={(enabled) => {
        void audioEngine.setLoopEnabled(enabled);
      }}
      onCycleLoopMode={() => {
        cycleLoopModeGlobal();
      }}
      onToggleShuffle={() => {
        toggleShuffleGlobal();
      }}
      onPrev={() => {
        void prevGlobal();
      }}
      onNext={() => {
        void nextGlobal();
      }}
      yearLabel={playerState.currentSong?.yearLabel}
      creditsText={currentCreditsText}
      lyricsHtml={lyricsHtml}
      onSelectSource={(source) => {
        void selectSourceGlobal(source);
      }}
    />
  );
}
