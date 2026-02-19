import { goBackWithFallback } from "../../src/ui/navigation/backNavigation";
import { recordRoutePath, resetRouteHistoryForTest } from "../../src/ui/navigation/routeHistory";

describe("goBackWithFallback", () => {
  beforeEach(() => {
    resetRouteHistoryForTest();
  });

  it("uses normal back when navigator can go back", () => {
    const back = jest.fn();
    const replace = jest.fn();

    goBackWithFallback({
      back,
      replace,
      canGoBack: () => true,
    });

    expect(back).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it("falls back to previous recorded route when cannot go back", () => {
    const back = jest.fn();
    const replace = jest.fn();
    recordRoutePath("/search");
    recordRoutePath("/song/m45");

    goBackWithFallback({
      back,
      replace,
      canGoBack: () => false,
    });

    expect(back).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/search");
  });

  it("falls back to /home when neither back stack nor history exists", () => {
    const back = jest.fn();
    const replace = jest.fn();

    goBackWithFallback({
      back,
      replace,
      canGoBack: () => false,
    });

    expect(back).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/home");
  });
});
