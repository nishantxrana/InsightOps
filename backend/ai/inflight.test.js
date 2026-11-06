import { clearInFlight, inflightSize, runInFlight } from "./inflight.js";

describe("runInFlight", () => {
  beforeEach(() => {
    clearInFlight();
  });

  it("dedupes concurrent identical keys", async () => {
    let calls = 0;
    const fn = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 30));
      return "ok";
    };

    const [a, b] = await Promise.all([runInFlight("k1", fn), runInFlight("k1", fn)]);
    expect(a).toBe("ok");
    expect(b).toBe("ok");
    expect(calls).toBe(1);
    expect(inflightSize()).toBe(0);
  });

  it("runs separately for different keys", async () => {
    let calls = 0;
    const fn = async () => {
      calls += 1;
      return calls;
    };
    await Promise.all([runInFlight("a", fn), runInFlight("b", fn)]);
    expect(calls).toBe(2);
  });
});
