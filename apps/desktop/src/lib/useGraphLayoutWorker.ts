/**
 * Hook that offloads graph layout computation to a Web Worker.
 *
 * Sends commit pages to the worker whenever `data` changes and returns
 * the deserialized LayoutState + GraphRenderIndex ready for rendering.
 */
import { useEffect, useRef, useState } from "react";
import type { Commit } from "@/api/tauri";
import type { LayoutState } from "@/lib/graph-layout";
import type { GraphRenderIndex } from "@/components/features/graph/useCanvasRenderer";
import type { WorkerResponse } from "@/lib/graph-layout.worker";

/* ------------------------------------------------------------------ */
/*  Empty defaults (used before worker responds)                      */
/* ------------------------------------------------------------------ */

const EMPTY_LAYOUT: LayoutState = {
  commits: [],
  laneMap: new Map(),
  laneColors: new Map(),
  nextLane: 0,
};

const EMPTY_RENDER_INDEX: GraphRenderIndex = {
  commitByHash: new Map(),
  edgeBlocks: [[]],
  blockSize: 128,
};

/* ------------------------------------------------------------------ */
/*  Deserialization helpers                                            */
/* ------------------------------------------------------------------ */

function deserializeLayout(raw: WorkerResponse["layout"]): LayoutState {
  return {
    commits: raw.commits,
    laneMap: new Map(raw.laneMap),
    laneColors: new Map(raw.laneColors),
    nextLane: raw.nextLane,
  };
}

function deserializeRenderIndex(raw: WorkerResponse["renderIndex"]): GraphRenderIndex {
  return {
    commitByHash: new Map(raw.commitByHash),
    edgeBlocks: raw.edgeBlocks,
    blockSize: raw.blockSize,
  };
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useGraphLayoutWorker(
  data: { pages: Commit[][] } | undefined,
  repoPath: string | null,
) {
  const [layout, setLayout] = useState<LayoutState>(EMPTY_LAYOUT);
  const [graphIndex, setGraphIndex] = useState<GraphRenderIndex>(EMPTY_RENDER_INDEX);
  const [isComputing, setIsComputing] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  // Create / terminate worker on mount / unmount
  useEffect(() => {
    const worker = new Worker(
      new URL("./graph-layout.worker.ts", import.meta.url),
      { type: "module" },
    );

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { id, layout: rawLayout, renderIndex: rawIndex } = e.data;
      // Ignore stale responses
      if (id !== requestIdRef.current) return;

      setLayout(deserializeLayout(rawLayout));
      setGraphIndex(deserializeRenderIndex(rawIndex));
      setIsComputing(false);
    };

    worker.onerror = (e) => {
      console.error("[graph-layout.worker]", e);
      setIsComputing(false);
    };

    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Send pages to worker whenever query data changes
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;

    const pages = data?.pages;
    if (!pages || pages.length === 0) {
      setLayout(EMPTY_LAYOUT);
      setGraphIndex(EMPTY_RENDER_INDEX);
      return;
    }

    const id = ++requestIdRef.current;
    setIsComputing(true);
    worker.postMessage({ id, pages });
  }, [data]);

  // Reset when repo changes
  useEffect(() => {
    if (!repoPath) {
      setLayout(EMPTY_LAYOUT);
      setGraphIndex(EMPTY_RENDER_INDEX);
    }
  }, [repoPath]);

  return { layout, graphIndex, isComputing };
}
