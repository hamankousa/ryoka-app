import {
  buildRoutePath,
  consumePreviousRoutePath,
  getPreviousRoutePath,
  recordRoutePath,
  resetRouteHistoryForTest,
} from "../../src/ui/navigation/routeHistory";

describe("routeHistory", () => {
  beforeEach(() => {
    resetRouteHistoryForTest();
  });

  it("builds route path with dynamic segment values", () => {
    expect(buildRoutePath("/song/[songId]", { songId: "m45" })).toBe("/song/m45");
  });

  it("builds route path with query string for extra params", () => {
    expect(buildRoutePath("/lyrics/[songId]", { songId: "m45", from: "search" })).toBe(
      "/lyrics/m45?from=search"
    );
  });

  it("records and returns previous route path", () => {
    recordRoutePath("/search");
    recordRoutePath("/song/m45");
    expect(getPreviousRoutePath()).toBe("/search");
  });

  it("consumes current route and returns previous route", () => {
    recordRoutePath("/search");
    recordRoutePath("/song/m45");
    recordRoutePath("/lyrics/m45");

    expect(consumePreviousRoutePath()).toBe("/song/m45");
    expect(getPreviousRoutePath()).toBe("/search");
  });
});
