import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/form";
import { SshKeyStatus } from "./SshKeyStatus";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";

interface GitTabProps {
  autoFetch: boolean;
  setAutoFetch: (v: boolean) => void;
  fetchInterval: number;
  setFetchInterval: (v: number) => void;
  autoPrune: boolean;
  setAutoPrune: (v: boolean) => void;
  confirmDangerous: boolean;
  setConfirmDangerous: (v: boolean) => void;
}

export function GitTab({
  autoFetch,
  setAutoFetch,
  fetchInterval,
  setFetchInterval,
  autoPrune,
  setAutoPrune,
  confirmDangerous,
  setConfirmDangerous,
}: GitTabProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const [remoteProtocol, setRemoteProtocol] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!repoPath) {
      setRemoteProtocol(undefined);
      return;
    }
    api.remote.detectProtocol(repoPath).then(setRemoteProtocol).catch(() => setRemoteProtocol(undefined));
  }, [repoPath]);

  return (
    <div className="space-y-4">
      {/* SSH Keys & Protocol */}
      {repoPath && (
        <SshKeyStatus remoteProtocol={remoteProtocol} />
      )}

      {/* Background Synchronization Card */}
      <div id="git-autofetch" className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
        <div>
          <Switch
            checked={autoFetch}
            onChange={setAutoFetch}
            label="Enable Background Auto-Fetch"
            description="Periodically refresh upstream status while a repository is open."
          />
        </div>
        <div className={`border-t border-border-40 pt-3 flex items-center justify-between gap-4 transition-opacity ${!autoFetch ? "opacity-40" : ""}`}>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-text-primary">Fetch Interval</span>
            <span className="text-2xs text-text-muted mt-0.5 leading-normal">How frequently GitFlow queries remotes for background updates.</span>
          </div>
          <div className="relative w-40 shrink-0">
            <select
              value={fetchInterval}
              onChange={(e) => setFetchInterval(Number(e.target.value))}
              disabled={!autoFetch}
              className="w-full h-8 pl-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surface-2 transition-all disabled:cursor-not-allowed"
            >
              <option value={5}>Every 5 minutes</option>
              <option value={10}>Every 10 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every hour</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
              <ChevronDown size={11} strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>

      {/* Operations & Safety Card */}
      <div id="git-operations" className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3">
        <Switch
          checked={autoPrune}
          onChange={setAutoPrune}
          label="Prune deleted remote branches during fetch"
          description="Automatically clean up stale remote-tracking references during fetch operations."
        />
        
        <div className="border-t border-border-40 pt-2.5">
          <Switch
            checked={confirmDangerous}
            onChange={setConfirmDangerous}
            label="Confirm destructive actions"
            description="Show confirmation modals before carrying out dangerous Git tasks (force push, discard shifts)."
          />
        </div>
      </div>
    </div>
  );
}
