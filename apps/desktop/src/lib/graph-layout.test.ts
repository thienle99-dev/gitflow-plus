import { describe, it, expect } from "vitest";
import { computeGraphLayout } from "./graph-layout";
import type { Commit, Ref } from "@/api/tauri";

function makeCommit(hash: string, parents: string[], opts?: { refs?: Ref[]; message?: string }): Commit {
  return {
    hash,
    parents,
    author: "Test Author",
    email: "test@example.com",
    date: "2024-01-01T00:00:00Z",
    message: opts?.message ?? hash,
    refs: opts?.refs ?? [],
  };
}

const ROW_HEIGHT = 38;
const LANE_WIDTH = 12;
const GRAPH_LEFT_PADDING = 18;

describe("computeGraphLayout", () => {
  // ── Basic cases ────────────────────────────────────────────────

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

  it("empty commits returns empty layout", () => {
    const result = computeGraphLayout([]);
    expect(result.commits).toEqual([]);
    expect(result.laneMap.size).toBe(0);
    expect(result.laneColors.size).toBe(0);
    expect(result.nextLane).toBe(0);
  });

  // ── Merge / branch detection ───────────────────────────────────

  it("merge commit gets new lane for second parent", () => {
    const commits = [
      makeCommit("merge", ["main", "feat"]),
      makeCommit("main", []),
      makeCommit("feat", []),
    ];
    const result = computeGraphLayout(commits);
    expect(result.commits[1].lane).not.toBe(result.commits[2].lane);
  });

  it("octopus merge (3 parents) allocates lanes for each parent", () => {
    const commits = [
      makeCommit("octo", ["a", "b", "c"]),
      makeCommit("a", []),
      makeCommit("b", []),
      makeCommit("c", []),
    ];
    const result = computeGraphLayout(commits);
    const lanes = new Set([result.commits[1].lane, result.commits[2].lane, result.commits[3].lane]);
    // All three parents should be on distinct lanes
    expect(lanes.size).toBe(3);
  });

  // ── Coordinate calculations ────────────────────────────────────

  it("x = lane * LANE_WIDTH + GRAPH_LEFT_PADDING", () => {
    const commits = [makeCommit("a", [])];
    const result = computeGraphLayout(commits);
    expect(result.commits[0].x).toBe(0 * LANE_WIDTH + GRAPH_LEFT_PADDING);
  });

  it("y = index * ROW_HEIGHT + ROW_HEIGHT / 2", () => {
    const commits = [
      makeCommit("c", ["b"]),
      makeCommit("b", ["a"]),
      makeCommit("a", []),
    ];
    const result = computeGraphLayout(commits);
    expect(result.commits[0].y).toBe(ROW_HEIGHT / 2);             // index 0
    expect(result.commits[1].y).toBe(ROW_HEIGHT + ROW_HEIGHT / 2); // index 1
    expect(result.commits[2].y).toBe(2 * ROW_HEIGHT + ROW_HEIGHT / 2); // index 2
  });

  // ── Colors ─────────────────────────────────────────────────────

  it("same lane gets same color across commits", () => {
    const commits = [
      makeCommit("c", ["b"]),
      makeCommit("b", ["a"]),
      makeCommit("a", []),
    ];
    const result = computeGraphLayout(commits);
    const colors = result.commits.map((c) => c.color);
    // All on lane 0 → same color
    expect(new Set(colors).size).toBe(1);
  });

  it("different lanes get different colors", () => {
    const commits = [
      makeCommit("merge", ["main", "feat"]),
      makeCommit("main", []),
      makeCommit("feat", []),
    ];
    const result = computeGraphLayout(commits);
    const laneColors = new Set(result.commits.map((c) => c.color));
    expect(laneColors.size).toBeGreaterThanOrEqual(2);
  });

  it("laneColors map is consistent with commit colors", () => {
    const commits = [
      makeCommit("merge", ["main", "feat"]),
      makeCommit("main", []),
      makeCommit("feat", []),
    ];
    const result = computeGraphLayout(commits);
    for (const commit of result.commits) {
      expect(result.laneColors.get(commit.lane)).toBe(commit.color);
    }
  });

  // ── parentLanes ────────────────────────────────────────────────

  it("parentLanes[0] equals commit's own lane (first parent inherits)", () => {
    const commits = [
      makeCommit("c", ["b"]),
      makeCommit("b", ["a"]),
      makeCommit("a", []),
    ];
    const result = computeGraphLayout(commits);
    for (const commit of result.commits) {
      if (commit.parents.length > 0) {
        expect(commit.parentLanes[0]).toBe(commit.lane);
      }
    }
  });

  it("merge commit: parentLanes has distinct values for each parent", () => {
    const commits = [
      makeCommit("merge", ["main", "feat"]),
      makeCommit("main", []),
      makeCommit("feat", []),
    ];
    const result = computeGraphLayout(commits);
    const merge = result.commits[0];
    expect(merge.parentLanes.length).toBe(2);
    expect(merge.parentLanes[0]).not.toBe(merge.parentLanes[1]);
  });

  // ── Diamond pattern (branch + merge back) ──────────────────────

  it("diamond: branch and merge back to same lane", () => {
    // Topology:
    //   merge (lane 0) ── parent: main (lane 0)
    //                ╲── parent: feat (lane 1)
    //   main (lane 0) ── parent: base (lane 0)
    //   feat (lane 1) ── parent: base (lane 0)
    //   base (lane 0)
    const commits = [
      makeCommit("merge", ["main", "feat"]),
      makeCommit("main", ["base"]),
      makeCommit("feat", ["base"]),
      makeCommit("base", []),
    ];
    const result = computeGraphLayout(commits);

    // merge commit's first parent → main → lane 0
    expect(result.commits[0].lane).toBe(result.commits[1].lane);
    // feat should be on a different lane
    expect(result.commits[2].lane).not.toBe(result.commits[1].lane);
    // base on lane 0
    expect(result.commits[3].lane).toBe(0);
  });

  // ── Multiple sequential merges ─────────────────────────────────

  it("multiple merges allocate lanes correctly", () => {
    // merge2 → merge, feat2
    // merge → main, feat
    // main → base
    // feat → base
    // feat2 → base
    // base
    const commits = [
      makeCommit("merge2", ["merge", "feat2"]),
      makeCommit("merge", ["main", "feat"]),
      makeCommit("main", ["base"]),
      makeCommit("feat", ["base"]),
      makeCommit("feat2", ["base"]),
      makeCommit("base", []),
    ];
    const result = computeGraphLayout(commits);

    // All commits should have valid lanes
    for (const c of result.commits) {
      expect(c.lane).toBeGreaterThanOrEqual(0);
      expect(c.color).toBeTruthy();
    }

    // feat and feat2 should be on different lanes from main
    const mainLane = result.commits[2].lane;
    const featLane = result.commits[3].lane;
    const feat2Lane = result.commits[4].lane;
    expect(featLane).not.toBe(mainLane);
    expect(feat2Lane).not.toBe(mainLane);
  });

  // ── Incremental append ─────────────────────────────────────────

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

    expect(result.commits[1].y).toBe(ROW_HEIGHT / 2 + ROW_HEIGHT); // ROW_HEIGHT/2 + ROW_HEIGHT
  });

  it("incremental: preserves previous commits unchanged", () => {
    const first = [makeCommit("b", ["a"]), makeCommit("a", [])];
    const prev = computeGraphLayout(first);

    const next = [makeCommit("c", ["b"])];
    const result = computeGraphLayout(next, prev);

    // First two commits should be identical objects
    expect(result.commits[0]).toBe(prev.commits[0]);
    expect(result.commits[1]).toBe(prev.commits[1]);
  });

  it("incremental: merge commit appended in second batch", () => {
    const first = [
      makeCommit("main", ["base"]),
      makeCommit("base", []),
    ];
    const prev = computeGraphLayout(first);

    // Later we learn about a feature branch that merged into main
    const next = [
      makeCommit("merge", ["main", "feat"]),
      makeCommit("feat", ["base"]),
    ];
    const result = computeGraphLayout(next, prev);

    expect(result.commits.length).toBe(4);
    // merge should be on lane 0 (inherits from main which is lane 0)
    expect(result.commits[2].lane).toBe(0);
    // feat should be on a different lane
    expect(result.commits[3].lane).not.toBe(0);
  });

  it("incremental: nextLane continues from prev", () => {
    const first = [
      makeCommit("merge", ["main", "feat"]),
      makeCommit("main", []),
      makeCommit("feat", []),
    ];
    const prev = computeGraphLayout(first);

    // Add another merge that creates yet another lane
    const next = [
      makeCommit("merge2", ["merge", "other"]),
      makeCommit("other", []),
    ];
    const result = computeGraphLayout(next, prev);

    // The new lane for "other" should not collide with existing lanes
    const allLanes = new Set(result.commits.map((c) => c.lane));
    expect(allLanes.size).toBe(result.nextLane);
  });

  // ── laneMap integrity ──────────────────────────────────────────

  it("laneMap contains all processed commit hashes", () => {
    const commits = [
      makeCommit("merge", ["main", "feat"]),
      makeCommit("main", ["base"]),
      makeCommit("feat", ["base"]),
      makeCommit("base", []),
    ];
    const result = computeGraphLayout(commits);
    for (const commit of commits) {
      expect(result.laneMap.has(commit.hash)).toBe(true);
    }
  });

  it("laneMap also contains parent hashes", () => {
    const commits = [
      makeCommit("b", ["a"]),
      makeCommit("a", []),
    ];
    const result = computeGraphLayout(commits);
    // "a" is both a commit and a parent of "b"
    expect(result.laneMap.has("a")).toBe(true);
    expect(result.laneMap.has("b")).toBe(true);
  });

  // ── Refs preservation ──────────────────────────────────────────

  it("refs are preserved in layout commits", () => {
    const refs: Ref[] = [
      { name: "main", ref_type: "branch" },
      { name: "v1.0", ref_type: "tag" },
    ];
    const commits = [makeCommit("aaa", [], { refs })];
    const result = computeGraphLayout(commits);
    expect(result.commits[0].refs).toEqual(refs);
  });

  it("empty refs default to empty array", () => {
    const commits = [makeCommit("aaa", [])];
    const result = computeGraphLayout(commits);
    expect(result.commits[0].refs).toEqual([]);
  });

  // ── Stress / scale ─────────────────────────────────────────────

  it("handles 500 linear commits without error", () => {
    const commits: Commit[] = [];
    for (let i = 499; i >= 0; i--) {
      const parent = i < 499 ? [`h${i + 1}`] : [];
      commits.push(makeCommit(`h${i}`, parent));
    }
    const result = computeGraphLayout(commits);
    expect(result.commits.length).toBe(500);
    // All on lane 0 (linear history)
    for (const c of result.commits) {
      expect(c.lane).toBe(0);
    }
  });

  it("handles 10 feature branches with merges", () => {
    const commits: Commit[] = [];
    // Create 10 feature branches all merging into main
    const parentHashes: string[] = ["base"];
    for (let i = 0; i < 10; i++) {
      const featHash = `feat${i}`;
      const mergeHash = `merge${i}`;
      const parent = parentHashes[parentHashes.length - 1];
      commits.push(makeCommit(mergeHash, [parent, featHash]));
      commits.push(makeCommit(featHash, ["base"]));
      parentHashes.push(mergeHash);
    }
    commits.push(makeCommit("base", []));

    const result = computeGraphLayout(commits);
    expect(result.commits.length).toBe(21); // 10 merges + 10 features + 1 base

    // All commits should have valid colors
    for (const c of result.commits) {
      expect(c.color).toBeTruthy();
      expect(c.lane).toBeGreaterThanOrEqual(0);
    }
  });

  // ── Edge: commit whose parent is already in laneMap ────────────

  it("first parent already reserved gets correct lane", () => {
    // Scenario: "merge" has parent "main" which was already assigned a lane
    // when processing an earlier commit
    const commits = [
      makeCommit("merge", ["main", "feat"]),
      makeCommit("main", ["base"]),
      makeCommit("feat", ["base"]),
      makeCommit("base", []),
    ];
    const result = computeGraphLayout(commits);

    // When processing "merge", "main" is not yet in laneMap → reserved to merge's lane
    // When processing "main", it inherits the reserved lane
    expect(result.laneMap.get("main")).toBeDefined();
    expect(result.commits[1].lane).toBe(result.laneMap.get("main"));
  });

  // ── message preservation ───────────────────────────────────────

  it("commit message is preserved in layout", () => {
    const commits = [makeCommit("aaa", [], { message: "feat: add new feature" })];
    const result = computeGraphLayout(commits);
    expect(result.commits[0].message).toBe("feat: add new feature");
  });

  it("author and date are preserved", () => {
    const commits: Commit[] = [{
      hash: "abc",
      parents: [],
      author: "Jane Doe",
      email: "jane@example.com",
      date: "2024-06-15T10:30:00Z",
      message: "test commit",
      refs: [],
    }];
    const result = computeGraphLayout(commits);
    expect(result.commits[0].author).toBe("Jane Doe");
    expect(result.commits[0].date).toBe("2024-06-15T10:30:00Z");
  });
});
