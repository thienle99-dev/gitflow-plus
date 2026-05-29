import type { Commit, Ref } from "@/api/tauri";

const COLORS = [
  "#0a84ff", "#30d158", "#ff9f0a", "#bf5af2", "#ff375f",
  "#64d2ff", "#ffd60a", "#5e5ce6", "#ff6482", "#00c7be",
];
const ROW_HEIGHT = 28;
const LANE_WIDTH = 12;
const GRAPH_LEFT_PADDING = 18;

export interface LayoutCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  refs: Ref[];
  lane: number;
  y: number;
  x: number;
  parents: string[];
  parentLanes: number[];
  color: string;
}

export interface LayoutState {
  commits: LayoutCommit[];
  laneMap: Map<string, number>;
  laneColors: Map<number, string>;
  nextLane: number;
}

export function computeGraphLayout(
  commits: Commit[],
  prev?: LayoutState,
): LayoutState {
  const laneMap = prev ? new Map(prev.laneMap) : new Map<string, number>();
  const laneColors = prev ? new Map(prev.laneColors) : new Map<number, string>();
  let nextLane = prev?.nextLane ?? 0;
  const yOffset = prev ? prev.commits.length * ROW_HEIGHT : 0;

  const newCommits: LayoutCommit[] = [];

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];
    const y = yOffset + i * ROW_HEIGHT + ROW_HEIGHT / 2;

    // Inherit first parent's lane if already known (incremental append case),
    // otherwise use a pre-reserved lane for this commit, or allocate a new one.
    const firstParentLane = commit.parents.length > 0 ? laneMap.get(commit.parents[0]) : undefined;
    const lane = laneMap.get(commit.hash) ?? firstParentLane ?? nextLane++;
    laneMap.set(commit.hash, lane);

    if (!laneColors.has(lane)) {
      laneColors.set(lane, COLORS[lane % COLORS.length]);
    }

    const parentLanes = commit.parents.map((parent, parentIndex) => {
      if (parentIndex === 0) {
        // Keep existing lane for first parent; only set if not yet reserved.
        const existing = laneMap.get(parent);
        if (existing !== undefined) return existing;
        laneMap.set(parent, lane);
        return lane;
      }
      const parentLane = laneMap.get(parent) ?? nextLane++;
      laneMap.set(parent, parentLane);
      return parentLane;
    });

    newCommits.push({
      hash: commit.hash,
      message: commit.message,
      author: commit.author,
      date: commit.date,
      refs: commit.refs || [],
      lane,
      y,
      x: lane * LANE_WIDTH + GRAPH_LEFT_PADDING,
      parents: commit.parents,
      parentLanes,
      color: laneColors.get(lane) || COLORS[0],
    });
  }

  return {
    commits: prev ? [...prev.commits, ...newCommits] : newCommits,
    laneMap,
    laneColors,
    nextLane,
  };
}
