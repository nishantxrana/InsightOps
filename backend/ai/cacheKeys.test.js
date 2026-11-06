import {
  buildAnalyzeCacheKey,
  pullRequestExplainCacheKey,
  releaseAnalyzeCacheKey,
  sprintSummaryCacheKey,
  workItemExplainCacheKey,
} from "./cacheKeys.js";

describe("cache key builders", () => {
  it("builds stable keys", () => {
    expect(sprintSummaryCacheKey("o1", "1,2,3", 3)).toBe("sprint_summary_o1_1,2,3_3");
    expect(workItemExplainCacheKey("o1", "42", 7)).toBe("workitem_explain_o1_42_7");
    expect(pullRequestExplainCacheKey("o1", "9", "abc")).toBe("pr_explain_o1_9_abc");
    expect(buildAnalyzeCacheKey("o1", "b1", "failed", "t1")).toBe("build_analyze_o1_b1_failed_t1");
    expect(releaseAnalyzeCacheKey("o1", "r1", "mod")).toBe("release_analyze_o1_r1_mod");
  });
});
