import { describe, it, expect } from "vitest";
import { computeGraphLayout } from "./graph-layout";
import type { Commit } from "@/api/tauri";

function makeCommit(hash: string, parents: string[]): Commit {
  return { hash, parents, author: "a", email: "a@a.com", date: "2024-01-01", message: hash, refs: [] };
}

describe("computeGraphLayout", () => {
  it("assigns lane 0 to first commit", () => {
    const commits = [makeCommit("aaa", [])];
    const result = computeGraphLayout(commits);
    expect(result.commits[0].lane).toBe(0);
  });

  it("linear history stays on lane 0", () => {
    const commits = [makeCommit("bbb", ["aaa"]), makeCommit("aaa", [])];
    const result = computeGraphLayout(commits);
    expect(result.commits[0].lane).toBe(0);
    expect(result.commits[1].lane).toBe(0);
  });

  it("merge commit gets new lane for second parent", () => {
    const commits = [
      makeCommit("merge", ["main", "feat"]),
      makeCommit("main", []),
      makeCommit("feat", []),
    ];
    const result = computeGraphLayout(commits);
    expect(result.commits[1].lane).not.toBe(result.commits[2].lane);
  });

  it("incremental: appending new commits reuses laneMap", () => {
    const first = [makeCommit("bbb", ["aaa"]), makeCommit("aaa", [])];
    const prev = computeGraphLayout(first);

    const next = [makeCommit("ccc", ["bbb"])];
    const result = computeGraphLayout(next, prev);

    expect(result.commits.length).toBe(3);
    expect(result.commits[2].lane).toBe(0); // ccc continues lane 0
  });

  it("incremental: y offset continues from prev", () => {
    const first = [makeCommit("aaa", [])];
    const prev = computeGraphLayout(first);

    const next = [makeCommit("bbb", ["aaa"])];
    const result = computeGraphLayout(next, prev);

    expect(result.commits[1].y).toBe(16 + 32); // ROW_HEIGHT=32, center offset=16
  });
});
