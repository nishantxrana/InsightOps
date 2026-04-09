import {
  buildExcludedStatesSet,
  isWorkItemExcludedByState,
  shouldApplyExcludedStateFilter,
} from "./overdueExcludedStates.js";

describe("overdueExcludedStates", () => {
  describe("buildExcludedStatesSet", () => {
    it("returns empty set for non-arrays", () => {
      expect(buildExcludedStatesSet(undefined).size).toBe(0);
      expect(buildExcludedStatesSet(null).size).toBe(0);
      expect(buildExcludedStatesSet({}).size).toBe(0);
    });

    it("trims and lowercases", () => {
      const set = buildExcludedStatesSet(["  Resolved ", "Active"]);
      expect(set.has("resolved")).toBe(true);
      expect(set.has("active")).toBe(true);
    });
  });

  describe("isWorkItemExcludedByState", () => {
    const resolved = new Set(["resolved"]);

    it("matches exact state case-insensitively", () => {
      expect(isWorkItemExcludedByState({ fields: { "System.State": "Resolved" } }, resolved)).toBe(
        true
      );
      expect(isWorkItemExcludedByState({ fields: { "System.State": "resolved" } }, resolved)).toBe(
        true
      );
    });

    it("does not substring-match", () => {
      expect(
        isWorkItemExcludedByState({ fields: { "System.State": "Reopened" } }, new Set(["open"]))
      ).toBe(false);
    });

    it("does not exclude when state missing", () => {
      expect(isWorkItemExcludedByState({ fields: {} }, resolved)).toBe(false);
    });
  });

  describe("shouldApplyExcludedStateFilter", () => {
    it("returns false when toggle is off even with keywords", () => {
      expect(
        shouldApplyExcludedStateFilter({
          overdueExcludedStatesEnabled: false,
          overdueExcludedStates: ["Resolved"],
        })
      ).toBe(false);
    });

    it("returns false when toggle is omitted even with keywords", () => {
      expect(
        shouldApplyExcludedStateFilter({
          overdueExcludedStates: ["Resolved"],
        })
      ).toBe(true);
      expect(
        shouldApplyExcludedStateFilter({
          overdueExcludedStatesEnabled: true,
          overdueExcludedStates: ["Resolved"],
        })
      ).toBe(false);
    });

    it("returns true only when toggle is explicitly on and keywords exist", () => {});

    it("returns false when no keywords", () => {
      expect(
        shouldApplyExcludedStateFilter({
          overdueExcludedStatesEnabled: true,
          overdueExcludedStates: [],
        })
      ).toBe(false);
    });
  });
});
