import type { Commit } from "@/api/tauri";

const COLORS = [
  "#0a84ff", // blue
  "#30d158", // green
  "#ff9f0a", // orange
  "#bf5af2", // purple
  "#ff375f", // red
  "#64d2ff", // cyan
  "#ffd60a", // yellow
  "#5e5ce6", // indigo
  "#ff6482", // pink
  "#00c7be", // teal
];

interface LayoutCommit {
  hash: string;
  message: string;
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
  // Build DAG: find which lane each commit sits in
  const laneMap = new Map<string, number>(); // hash -> lane
  const laneColors = new Map<number, string>();
  let nextLane = 0;

  const result: LayoutCommit[] = [];
  const totalCommits = commits.length;

  // Process in reverse chronological (commits already from git log = newest first)
  for (let i = 0; i < totalCommits; i++) {
    const commit = commits[i];
    const y = i * 32; // row height

    // Try to keep commit on same lane as its first parent
    let lane: number;
    if (commit.parents.length > 0 && laneMap.has(commit.parents[0])) {
      lane = laneMap.get(commit.parents[0])!;
    } else {
      lane = nextLane++;
    }

    // Record this commit's lane
    laneMap.set(commit.hash, lane);

    if (!laneColors.has(lane)) {
      laneColors.set(lane, COLORS[lane % COLORS.length]);
    }

    // Get parent lanes for drawing edges
    const parentLanes = commit.parents
      .map((p) => laneMap.get(p))
      .filter((l): l is number => l !== undefined);

    result.push({
      hash: commit.hash,
      message: commit.message,
      lane,
      y,
      x: lane * 24 + 24,
      parentLanes,
      color: laneColors.get(lane) || COLORS[0],
    });
  }

  return { commits: result };
}
