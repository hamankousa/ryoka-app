import { z } from "zod";

const UrlField = z.string().min(1);

const AudioLegacySchema = z.object({
  mp3Url: UrlField,
  sizeBytes: z.number().int().positive().optional(),
  sha256: z.string().optional(),
});

const AudioSplitSchema = z.object({
  vocalMp3Url: UrlField,
  pianoMp3Url: UrlField,
  vocalAlternates: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        mp3Url: UrlField,
      })
    )
    .optional(),
  defaultSource: z.enum(["vocal", "piano"]).optional(),
  sizeBytes: z.number().int().positive().optional(),
  sha256: z.string().optional(),
});

const ManifestSongSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  yearLabel: z.string().optional(),
  credits: z.array(z.string()).optional(),
  updatedAt: z.string().min(1),
  audio: z.union([AudioLegacySchema, AudioSplitSchema]),
  lyrics: z.object({
    htmlUrl: UrlField,
    sizeBytes: z.number().int().positive().optional(),
    sha256: z.string().optional(),
  }),
  score: z.object({
    pdfUrl: UrlField,
    sizeBytes: z.number().int().positive().optional(),
    sha256: z.string().optional(),
  }),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  order: z.number().int().optional(),
});

const ManifestSchema = z.object({
  version: z.string().min(1),
  songs: z.array(ManifestSongSchema),
});

export type AudioAsset = {
  vocalMp3Url: string;
  pianoMp3Url: string;
  vocalAlternates?: Array<{
    id: string;
    label: string;
    mp3Url: string;
  }>;
  defaultSource: "vocal" | "piano";
  sizeBytes?: number;
  sha256?: string;
};

export type SongManifestItem = {
  id: string;
  title: string;
  yearLabel?: string;
  credits?: string[];
  updatedAt: string;
  audio: AudioAsset;
  lyrics: {
    htmlUrl: string;
    sizeBytes?: number;
    sha256?: string;
  };
  score: {
    pdfUrl: string;
    sizeBytes?: number;
    sha256?: string;
  };
  tags?: string[];
  description?: string;
  order?: number;
};

export type Manifest = {
  version: string;
  songs: SongManifestItem[];
};

function resolveUrl(baseUrl: string, pathOrUrl: string) {
  return new URL(pathOrUrl, baseUrl).toString();
}

function normalizeAudio(
  audio: z.infer<typeof AudioLegacySchema> | z.infer<typeof AudioSplitSchema>,
  baseUrl: string
): AudioAsset {
  if ("mp3Url" in audio) {
    const resolved = resolveUrl(baseUrl, audio.mp3Url);
    return {
      vocalMp3Url: resolved,
      pianoMp3Url: resolved,
      defaultSource: "vocal",
      sizeBytes: audio.sizeBytes,
      sha256: audio.sha256,
    };
  }

  return {
    vocalMp3Url: resolveUrl(baseUrl, audio.vocalMp3Url),
    pianoMp3Url: resolveUrl(baseUrl, audio.pianoMp3Url),
    vocalAlternates: audio.vocalAlternates?.map((item) => ({
      ...item,
      mp3Url: resolveUrl(baseUrl, item.mp3Url),
    })),
    defaultSource: audio.defaultSource ?? "vocal",
    sizeBytes: audio.sizeBytes,
    sha256: audio.sha256,
  };
}

export function parseManifest(input: unknown, baseUrl: string): Manifest {
  const parsed = ManifestSchema.parse(input);
  return {
    version: parsed.version,
    songs: parsed.songs.map((song) => ({
      ...song,
      audio: normalizeAudio(song.audio, baseUrl),
      lyrics: {
        ...song.lyrics,
        htmlUrl: resolveUrl(baseUrl, song.lyrics.htmlUrl),
      },
      score: {
        ...song.score,
        pdfUrl: resolveUrl(baseUrl, song.score.pdfUrl),
      },
    })),
  };
}
