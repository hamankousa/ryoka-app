import { z } from "zod";

export const PLAYLIST_SHARE_SCHEMA_V1 = "ryoka-playlist/v1" as const;

const PlaylistShareV1Schema = z.object({
  schema: z.literal(PLAYLIST_SHARE_SCHEMA_V1),
  name: z
    .string()
    .min(1)
    .max(80)
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, { message: "name must not be blank" }),
  songIds: z.array(z.string().min(1)).min(1),
  exportedAt: z.preprocess((value) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }, z.string().min(1)),
});

export type PlaylistShareV1 = z.infer<typeof PlaylistShareV1Schema>;

export function parsePlaylistShareV1(input: unknown): PlaylistShareV1 {
  return PlaylistShareV1Schema.parse(input);
}
