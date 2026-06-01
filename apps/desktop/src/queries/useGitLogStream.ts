import { useEffect, useRef, useState, useCallback } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { api, Commit } from "@/api/tauri";

interface LogChunk {
  commits: Commit[];
  total_so_far: number;
  is_last: boolean;
}

interface UseGitLogStreamOptions {
  initialPageSize?: number;
}

export function useGitLogStream(repoPath: string | null, options: UseGitLogStreamOptions = {}) {
  const { initialPageSize = 200 } = options;
  const [commits, setCommits] = useState<Commit[]>([]);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const streamRef = useRef(false);
  const offsetRef = useRef(0);

  // Listen for streaming events
  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      const unlisten = await listen<LogChunk>("git:log-chunk", (event) => {
        if (cancelled) return;
        const chunk = event.payload;

        setCommits((prev) => {
          // Deduplicate by hash (in case of overlapping pages)
          const existing = new Set(prev.map((c) => c.hash));
          const newCommits = chunk.commits.filter((c) => !existing.has(c.hash));
          return [...prev, ...newCommits];
        });
        setTotalLoaded(chunk.total_so_far);

        if (chunk.is_last) {
          setIsStreaming(false);
          setIsComplete(true);
        }
      });
      unlistenRef.current = unlisten;
    };

    setup();

    return () => {
      cancelled = true;
      unlistenRef.current?.();
    };
  }, []);

  const loadMore = useCallback(async (refName?: string | null) => {
    if (!repoPath || streamRef.current) return;

    streamRef.current = true;
    setIsStreaming(true);
    setError(null);

    try {
      await api.logStream(repoPath, 0, initialPageSize, refName ?? null);
    } catch (e) {
      setError(`${e}`);
      setIsStreaming(false);
    } finally {
      streamRef.current = false;
    }
  }, [repoPath, initialPageSize]);

  const loadPage = useCallback(async (page: number, refName?: string | null) => {
    if (!repoPath) return;

    try {
      await api.logStream(repoPath, page, initialPageSize, refName ?? null);
    } catch (e) {
      setError(`${e}`);
    }
  }, [repoPath, initialPageSize]);

  const refresh = useCallback(() => {
    setCommits([]);
    setTotalLoaded(0);
    setIsComplete(false);
    offsetRef.current = 0;
    loadMore();
  }, [loadMore]);

  return {
    commits,
    totalLoaded,
    isStreaming,
    isComplete,
    error,
    loadMore,
    loadPage,
    refresh,
  };
}