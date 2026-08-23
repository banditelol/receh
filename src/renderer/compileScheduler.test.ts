import { describe, expect, it } from "vite-plus/test";
import { advanceCompileRevision, CompileScheduler } from "./compileScheduler.ts";

describe("compile scheduling", () => {
  it("advances revisions for rapid edits but not unrelated renders", () => {
    const first = advanceCompileRevision(undefined, {
      documentId: "project-a",
      passId: "main",
      source: "first",
    });
    const same = advanceCompileRevision(first, {
      documentId: "project-a",
      passId: "main",
      source: "first",
    });
    const second = advanceCompileRevision(same, {
      documentId: "project-a",
      passId: "main",
      source: "second",
    });

    expect(same).toBe(first);
    expect(second.revision).toBe(first.revision + 1);
  });

  it("invalidates delayed results across source, project, and pass switches", () => {
    const scheduler = new CompileScheduler();
    let target = advanceCompileRevision(undefined, {
      documentId: "project-a",
      passId: "main",
      source: "first",
    });
    const rapidEdit = scheduler.begin(target, 1);

    target = advanceCompileRevision(target, { ...target, source: "second" });
    scheduler.updateTarget(target);
    expect(scheduler.isCurrent(rapidEdit)).toBe(false);
    const edited = scheduler.begin(target, 2);

    target = advanceCompileRevision(target, {
      documentId: "project-b",
      passId: "main",
      source: "second",
    });
    scheduler.updateTarget(target);
    expect(scheduler.isCurrent(edited)).toBe(false);
    const switchedProject = scheduler.begin(target, 3);

    target = advanceCompileRevision(target, { ...target, passId: "blur" });
    scheduler.updateTarget(target);
    expect(scheduler.isCurrent(switchedProject)).toBe(false);
  });

  it("lets only the newest explicit request commit for one revision", () => {
    const scheduler = new CompileScheduler();
    const target = advanceCompileRevision(undefined, {
      documentId: "project-a",
      passId: "main",
      source: "source",
    });
    const first = scheduler.begin(target, 1);
    const second = scheduler.begin(target, 2);

    expect(scheduler.isCurrent(first)).toBe(false);
    expect(scheduler.isCurrent(second)).toBe(true);
    scheduler.invalidate();
    expect(scheduler.isCurrent(second)).toBe(false);
  });

  it("rejects diagnostics that settle after a newer edit", async () => {
    const scheduler = new CompileScheduler();
    const first = advanceCompileRevision(undefined, {
      documentId: "project-a",
      passId: "main",
      source: "broken",
    });
    const ticket = scheduler.begin(first, 1);
    const delayedFailure = Promise.resolve().then(() =>
      scheduler.isCurrent(ticket) ? ["stale diagnostic"] : [],
    );

    const fixed = advanceCompileRevision(first, { ...first, source: "fixed" });
    scheduler.updateTarget(fixed);

    expect(await delayedFailure).toEqual([]);
  });
});
