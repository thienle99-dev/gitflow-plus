import type { Commit, Ref } from "@/api/tauri";

const COLORS = [
  "#0a84ff",
  "#30d158",
  "#ff9f0a",
  "#bf5af2",
  "#ff375f",
  "#64d2ff",
  "#ffd60a",
  "#5e5ce6",
  "#ff6482",
  "#00c7be",
];

export interface LayoutCommit {
  hash: string;
  message: string;
  refs: Ref[];
  lane: number;
  y: number;
  x: number;
  parentLanes: number[];
  color: string;
}

interface GraphLayout {
  commits: LayoutCommit[];
}

export function computeGraphLayout(commits: Commit[]): GraphLayout {
  // Commits arrive newest-first. A commit inherits the lane reserved by a child;
  // then it reserves that lane for its first parent to keep linear history vertical.
  const laneMap = new Map<string, number>(); // hash -> reserved lane
  const laneColors = new Map<number, string>();
  let nextLane = 0;

  const result: LayoutCommit[] = [];
  const totalCommits = commits.length;

  // Process in reverse chronological (commits already from git log = newest first)
  for (let i = 0; i < totalCommits; i++) {
    const commit = commits[i];
    const y = i * 32 + 16; // row center

    const lane = laneMap.get(commit.hash) ?? nextLane++;
    laneMap.set(commit.hash, lane);

    if (!laneColors.has(lane)) {
      laneColors.set(lane, COLORS[lane % COLORS.length]);
    }

    const parentLanes = commit.parents.map((parent, parentIndex) => {
      const parentLane = parentIndex === 0
        ? lane
        : laneMap.get(parent) ?? nextLane++;
      laneMap.set(parent, parentLane);
      return parentLane;
    });

    result.push({
      hash: commit.hash,
      message: commit.message,
      refs: commit.refs || [],
      lane,
      y,
      x: lane * 24 + 24,
      parentLanes,
      color: laneColors.get(lane) || COLORS[0],
    });
  }

  return { commits: result };
}
