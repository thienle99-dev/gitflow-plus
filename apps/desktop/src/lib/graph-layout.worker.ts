/**
 * Web Worker for computing graph layout off the main thread.
 *
 * Receives commit pages, computes layout incrementally (when possible),
 * builds the render index, and posts back serialized results.
 */
import { computeGraphLayout, type LayoutState } from "./graph-layout";
import type { Commit } from "@/api/tauri";

/* ------------------------------------------------------------------ */
/*  Wire types (serializable over postMessage)                        */
/* ------------------------------------------------------------------ */

interface GraphEdgeSegment {
  id: number;
  fromRow: number;
  toRow: number;
  fromLane: number;
  toLane: number;
  color: string;
}

interface SerializedLayoutCommit {
  hash: string;
  message: string;
  author: string;
  email: string;
  date: string;
  refs: { name: string; ref_type: string }[];
  signature: string;
  lane: number;
  y: number;
  x: number;
  parents: string[];
  parentLanes: number[];
  color: string;
  additions: number;
  deletions: number;
}

interface SerializedLayout {
  commits: SerializedLayoutCommit[];
  laneMap: [string, number][];
  laneColors: [number, string][];
  nextLane: number;
}

interface SerializedRenderIndex {
  commitByHash: [string, SerializedLayoutCommit][];
  edgeBlocks: GraphEdgeSegment[][];
  blockSize: number;
}

interface WorkerRequest {
  id: number;
  pages: Commit[][];
}

export interface WorkerResponse {
  id: number;
  layout: SerializedLayout;
  renderIndex: SerializedRenderIndex;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const EDGE_BLOCK_SIZE = 128;

/* ------------------------------------------------------------------ */
/*  Internal cache for incremental computation                        */
/* ------------------------------------------------------------------ */

let cachedPageCount = 0;
let cachedFirstHash = "";
let cachedLayout: LayoutState | null = null;

/* ------------------------------------------------------------------ */
/*  Serialization helpers                                             */
/* ------------------------------------------------------------------ */

function serializeLayout(layout: LayoutState): SerializedLayout {
  return {
    commits: layout.commits as unknown as SerializedLayoutCommit[],
    laneMap: Array.from(layout.laneMap.entries()),
    laneColors: Array.from(layout.laneColors.entries()),
    nextLane: layout.nextLane,
  };
}

function buildAndSerializeRenderIndex(
  layout: LayoutState,
): SerializedRenderIndex {
  const rowByHash = new Map<string, number>(
    layout.commits.map((c, row) => [c.hash, row]),
  );
  const blockCount = Math.max(
    1,
    Math.ceil(Math.max(1, layout.commits.length) / EDGE_BLOCK_SIZE),
  );
  const edgeBlocks: GraphEdgeSegment[][] = Array.from(
    { length: blockCount },
    () => [],
  );
  let edgeId = 0;

  for (let row = 0; row < layout.commits.length; row++) {
    const commit = layout.commits[row];
    for (let pi = 0; pi < commit.parents.length; pi++) {
      const parentRow = rowByHash.get(commit.parents[pi]) ?? layout.commits.length;
      if (parentRow <= row) continue;

      const edge: GraphEdgeSegment = {
        id: edgeId++,
        fromRow: row,
        toRow: parentRow,
        fromLane: commit.lane,
        toLane: commit.parentLanes[pi] ?? commit.lane,
        color: commit.color,
      };
      const startBlock = Math.max(0, Math.floor(edge.fromRow / EDGE_BLOCK_SIZE));
      const endBlock = Math.min(
        edgeBlocks.length - 1,
        Math.floor(edge.toRow / EDGE_BLOCK_SIZE),
      );
      for (let block = startBlock; block <= endBlock; block++) {
        edgeBlocks[block].push(edge);
      }
    }
  }

  return {
    commitByHash: layout.commits.map((c) => [c.hash, c] as [string, SerializedLayoutCommit]),
    edgeBlocks,
    blockSize: EDGE_BLOCK_SIZE,
  };
}

/* ------------------------------------------------------------------ */
/*  Message handler                                                   */
/* ------------------------------------------------------------------ */

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, pages } = e.data;

  // Determine if we can do incremental computation.
  // Criteria: first commit hash matches (same repo/branch) AND page count grew.
  const firstHash = pages[0]?.[0]?.hash ?? "";
  let layout: LayoutState | null = null;
  let startPage = 0;

  if (
    cachedLayout &&
    cachedFirstHash === firstHash &&
    pages.length >= cachedPageCount
  ) {
    layout = cachedLayout;
    startPage = cachedPageCount;
  }

  // Compute layout for new (or all) pages
  for (let i = startPage; i < pages.length; i++) {
    layout = computeGraphLayout(pages[i], layout ?? undefined);
  }

  const result = layout ?? computeGraphLayout([]);

  // Update cache
  cachedPageCount = pages.length;
  cachedFirstHash = firstHash;
  cachedLayout = result;

  // Serialize and post back
  const response: WorkerResponse = {
    id,
    layout: serializeLayout(result),
    renderIndex: buildAndSerializeRenderIndex(result),
  };

  self.postMessage(response);
};
