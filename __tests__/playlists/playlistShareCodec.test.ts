import { Playlist } from "../../src/domain/playlist";
import {
  decodePlaylistFromYaml,
  encodePlaylistToYaml,
  resolveImportedPlaylistName,
} from "../../src/features/playlists/playlistShareCodec";

function buildPlaylist(): Playlist {
  return {
    id: "pl-1",
    name: "通学",
    items: [
      { songId: "m45", addedAt: "2026-02-20T00:00:00Z" },
      { songId: "m46", addedAt: "2026-02-20T00:00:01Z" },
    ],
    createdAt: "2026-02-20T00:00:00Z",
    updatedAt: "2026-02-20T00:00:01Z",
  };
}

describe("playlistShareCodec", () => {
  it("encodes and decodes yaml", () => {
    const yamlText = encodePlaylistToYaml(buildPlaylist(), "2026-02-20T10:00:00Z");
    const parsed = decodePlaylistFromYaml(yamlText);

    expect(parsed.schema).toBe("ryoka-playlist/v1");
    expect(parsed.name).toBe("通学");
    expect(parsed.songIds).toEqual(["m45", "m46"]);
    expect(parsed.exportedAt).toBe("2026-02-20T10:00:00Z");
  });

  it("throws when schema is not supported", () => {
    const input = `schema: other\nname: test\nsongIds:\n  - m45\nexportedAt: 2026-02-20T00:00:00Z`;
    expect(() => decodePlaylistFromYaml(input)).toThrow("schema");
  });

  it("throws when required field is missing", () => {
    const input = `schema: ryoka-playlist/v1\nname: test\nexportedAt: 2026-02-20T00:00:00Z`;
    expect(() => decodePlaylistFromYaml(input)).toThrow();
  });

  it("resolves duplicate imported names with suffix numbering", () => {
    const existingNames = ["通学", "通学 (2)", "練習"];
    expect(resolveImportedPlaylistName("通学", existingNames)).toBe("通学 (3)");
    expect(resolveImportedPlaylistName("新規", existingNames)).toBe("新規");
  });
});
