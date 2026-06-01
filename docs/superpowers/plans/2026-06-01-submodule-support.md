# Submodule Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add submodule status display, init, update, and removal operations to GitFlow Desktop's file tree.

**Architecture:** Backend adds `submodule_remove` command. Frontend adds query hook, integrates submodules into file tree as special entries with status badges, and provides detail panel with four action buttons.

**Tech Stack:** Rust (Tauri commands), TypeScript/React (TanStack Query, Zustand), git CLI

---

## File Structure

**Backend (Rust):**
- Modify: `src-tauri/src/commands/submodule.rs` — add `submodule_remove` command
- Modify: `src-tauri/src/lib.rs` — register new command in `invoke_handler!`

**Frontend (React):**
- Create: `apps/desktop/src/queries/useSubmoduleList.ts` — query hook
- Modify: `apps/desktop/src/api/tauri.ts` — add `submodules` namespace
- Create: `apps/desktop/src/components/sidebar/SubmoduleEntry.tsx` — file tree entry component
- Create: `apps/desktop/src/components/sidebar/SubmoduleContextMenu.tsx` — right-click menu
- Create: `apps/desktop/src/components/detail/SubmoduleDetail.tsx` — right panel detail view
- Modify: `apps/desktop/src/components/sidebar/Sidebar.tsx` — integrate submodule entries into file tree
- Modify: `apps/desktop/src/components/detail/RightPanel.tsx` — show submodule detail when selected
- Modify: `apps/desktop/src/layouts/MainLayout.tsx` — invalidate submodule queries on `worktree` events

---

## Tasks

### Task 1: Backend — Add submodule_remove Command

**Files:**
- Modify: `src-tauri/src/commands/submodule.rs`

- [ ] **Step 1: Add submodule_remove function**

Open `src-tauri/src/commands/submodule.rs` and add this function after `submodule_update`:

```rust
#[tauri::command]
pub fn submodule_remove(path: String, submodule_path: String) -> Result<String, String> {
    let mut args = vec![
        "--no-pager".to_string(),
        "-C".to_string(),
        path,
        "submodule".to_string(),
        "deinit".to_string(),
        "-f".to_string(),
        submodule_path,
    ];

    let output = Command::new("git")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        Ok("Submodule removed successfully".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to remove submodule: {}", stderr.trim()))
    }
}
```

- [ ] **Step 2: Register command in invoke_handler**

Open `src-tauri/src/lib.rs` and find the `invoke_handler!` macro. Add `submodule_remove` to the list:

```rust
invoke_handler![
    // ... existing commands
    submodule::submodule_list,
    submodule::submodule_init,
    submodule::submodule_update,
    submodule::submodule_remove,  // Add this line
    // ... rest of commands
]
```

- [ ] **Step 3: Build and verify**

Run: `cd src-tauri && cargo build`

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/submodule.rs src-tauri/src/lib.rs
git commit -m "feat: add submodule_remove backend command"
```

---

### Task 2: Frontend API — Add submodules namespace

**Files:**
- Modify: `apps/desktop/src/api/tauri.ts`

- [ ] **Step 1: Add SubmoduleInfo interface**

Open `apps/desktop/src/api/tauri.ts` and add this interface after the `Tag` interface:

```typescript
export interface SubmoduleInfo {
  name: string;
  path: string;
  commit_hash: string;
  status: string; // "ok", "not_initialized", "modified", "conflict"
  desc: string;
}
```

- [ ] **Step 2: Add submodules API namespace**

Find the `export const api = {` section and add this namespace after the `tags` namespace:

```typescript
  submodules: {
    list: (path: string) =>
      invoke<SubmoduleInfo[]>("submodule_list", { path }),
    init: (path: string, submodulePath?: string) =>
      invoke<string>("submodule_init", { path, submodulePath: submodulePath ?? null }),
    update: (path: string, submodulePath?: string) =>
      invoke<string>("submodule_update", { path, submodulePath: submodulePath ?? null }),
    remove: (path: string, submodulePath: string) =>
      invoke<string>("submodule_remove", { path, submodulePath }),
  },
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd apps/desktop && pnpm tsc --noEmit`

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/api/tauri.ts
git commit -m "feat: add submodules API namespace"
```

---

### Task 3: Frontend Query Hook — useSubmoduleList

**Files:**
- Create: `apps/desktop/src/queries/useSubmoduleList.ts`

- [ ] **Step 1: Create query hook file**

Create `apps/desktop/src/queries/useSubmoduleList.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { api, SubmoduleInfo } from "@/api/tauri";

export function useSubmoduleList(repoPath: string | null) {
  return useQuery({
    queryKey: ["git", repoPath, "submodules"],
    queryFn: () => api.submodules.list(repoPath!),
    enabled: !!repoPath,
  });
}
```

- [ ] **Step 2: Verify file exists**

Run: `ls -la apps/desktop/src/queries/useSubmoduleList.ts`

Expected: File exists.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/queries/useSubmoduleList.ts
git commit -m "feat: add useSubmoduleList query hook"
```

---

### Task 4: Frontend UI — SubmoduleEntry Component

**Files:**
- Create: `apps/desktop/src/components/sidebar/SubmoduleEntry.tsx`

- [ ] **Step 1: Create SubmoduleEntry component**

Create `apps/desktop/src/components/sidebar/SubmoduleEntry.tsx`:

```typescript
import { SubmoduleInfo } from "@/api/tauri";
import { useUIStore } from "@/stores/ui";
import { Folder, Link2 } from "lucide-react";

interface SubmoduleEntryProps {
  submodule: SubmoduleInfo;
  isSelected: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
}

export default function SubmoduleEntry({
  submodule,
  isSelected,
  onContextMenu,
}: SubmoduleEntryProps) {
  const selectFile = useUIStore((s) => s.selectFile);

  const statusBadge = {
    ok: "✓",
    not_initialized: "✗",
    modified: "⚠",
    conflict: "⚡",
  }[submodule.status] || "?";

  const statusColor = {
    ok: "text-green-500",
    not_initialized: "text-red-500",
    modified: "text-yellow-500",
    conflict: "text-orange-500",
  }[submodule.status] || "text-gray-500";

  return (
    <div
      onClick={() => selectFile(submodule.path)}
      onContextMenu={onContextMenu}
      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
        isSelected
          ? "bg-accent/20 text-accent"
          : "hover:bg-surface-2/40 text-text-primary"
      }`}
    >
      <div className="relative">
        <Folder size={14} className="text-accent" />
        <Link2 size={10} className="absolute -bottom-1 -right-1" />
      </div>
      <span className="flex-1 text-xs font-medium truncate">
        {submodule.name}
      </span>
      <span className={`text-xs font-bold ${statusColor}`}>
        {statusBadge}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Verify file exists**

Run: `ls -la apps/desktop/src/components/sidebar/SubmoduleEntry.tsx`

Expected: File exists.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/components/sidebar/SubmoduleEntry.tsx
git commit -m "feat: add SubmoduleEntry component"
```

---

### Task 5: Frontend UI — SubmoduleDetail Component

**Files:**
- Create: `apps/desktop/src/components/detail/SubmoduleDetail.tsx`

- [ ] **Step 1: Create SubmoduleDetail component**

Create `apps/desktop/src/components/detail/SubmoduleDetail.tsx`:

```typescript
import { SubmoduleInfo } from "@/api/tauri";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { showToast } from "@/lib/toast";

interface SubmoduleDetailProps {
  submodule: SubmoduleInfo;
}

export default function SubmoduleDetail({ submodule }: SubmoduleDetailProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: "init" | "update" | "remove") => {
    if (!repoPath) return;
    setLoading(action);
    try {
      if (action === "init") {
        await api.submodules.init(repoPath, submodule.path);
        showToast("Submodule initialized");
      } else if (action === "update") {
        await api.submodules.update(repoPath, submodule.path);
        showToast("Submodule updated");
      } else if (action === "remove") {
        await api.submodules.remove(repoPath, submodule.path);
        showToast("Submodule removed");
      }
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "submodules"] });
    } catch (e) {
      showToast(`Error: ${e}`, "error");
    } finally {
      setLoading(null);
    }
  };

  const statusLabel = {
    ok: "Initialized",
    not_initialized: "Not Initialized",
    modified: "Modified",
    conflict: "Conflict",
  }[submodule.status] || "Unknown";

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">
          {submodule.name}
        </h3>
        <p className="text-xs text-text-muted mt-1">{submodule.path}</p>
      </div>

      <div className="space-y-2 text-xs">
        <div>
          <span className="text-text-muted">Commit:</span>
          <code className="ml-2 text-text-primary font-mono">
            {submodule.commit_hash.slice(0, 7)}
          </code>
        </div>
        <div>
          <span className="text-text-muted">Status:</span>
          <span className="ml-2 text-text-primary">{statusLabel}</span>
        </div>
        {submodule.desc && (
          <div>
            <span className="text-text-muted">Description:</span>
            <span className="ml-2 text-text-primary">{submodule.desc}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => handleAction("init")}
          disabled={loading === "init" || submodule.status !== "not_initialized"}
          className="flex-1 px-2 py-1 text-xs bg-accent text-white rounded disabled:opacity-50"
        >
          {loading === "init" ? "Initializing..." : "Init"}
        </button>
        <button
          onClick={() => handleAction("update")}
          disabled={loading === "update" || submodule.status === "not_initialized"}
          className="flex-1 px-2 py-1 text-xs bg-accent text-white rounded disabled:opacity-50"
        >
          {loading === "update" ? "Updating..." : "Update"}
        </button>
        <button
          onClick={() => handleAction("remove")}
          disabled={loading === "remove"}
          className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded disabled:opacity-50"
        >
          {loading === "remove" ? "Removing..." : "Remove"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify file exists**

Run: `ls -la apps/desktop/src/components/detail/SubmoduleDetail.tsx`

Expected: File exists.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/components/detail/SubmoduleDetail.tsx
git commit -m "feat: add SubmoduleDetail component"
```

---

### Task 6: Integration — Sidebar File Tree

**Files:**
- Modify: `apps/desktop/src/components/sidebar/Sidebar.tsx`

- [ ] **Step 1: Import submodule components and hook**

Open `apps/desktop/src/components/sidebar/Sidebar.tsx` and add these imports at the top:

```typescript
import { useSubmoduleList } from "@/queries/useSubmoduleList";
import SubmoduleEntry from "./SubmoduleEntry";
```

- [ ] **Step 2: Add submodule list query**

In the Sidebar component, after the `useTagList` hook, add:

```typescript
  const { data: submodules } = useSubmoduleList(repoPath);
```

- [ ] **Step 3: Add submodule section to render**

Find the section that renders branches/tags. Add this after the tags section:

```typescript
      {/* Submodules Section */}
      {submodules && submodules.length > 0 && (
        <div className="px-2 mt-3 space-y-1">
          <div className="text-xs font-semibold text-text-muted px-2 py-1">
            Submodules ({submodules.length})
          </div>
          {submodules.map((sub) => (
            <SubmoduleEntry
              key={sub.path}
              submodule={sub}
              isSelected={selectedRef === sub.path}
              onContextMenu={(e) => {
                e.preventDefault();
                // Context menu will be added in next task
              }}
            />
          ))}
        </div>
      )}
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `cd apps/desktop && pnpm tsc --noEmit`

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/sidebar/Sidebar.tsx
git commit -m "feat: integrate submodules into sidebar file tree"
```

---

### Task 7: Integration — Right Panel

**Files:**
- Modify: `apps/desktop/src/components/detail/RightPanel.tsx`

- [ ] **Step 1: Import SubmoduleDetail**

Open `apps/desktop/src/components/detail/RightPanel.tsx` and add:

```typescript
import SubmoduleDetail from "./SubmoduleDetail";
import { useSubmoduleList } from "@/queries/useSubmoduleList";
```

- [ ] **Step 2: Add submodule detection logic**

In the RightPanel component, add this hook:

```typescript
  const { data: submodules } = useSubmoduleList(repoPath);
```

- [ ] **Step 3: Add submodule rendering**

In the render section, add this check before the file detail rendering:

```typescript
  // Check if selected file is a submodule
  const selectedSubmodule = submodules?.find(
    (sub) => sub.path === selectedFile
  );

  if (selectedSubmodule) {
    return <SubmoduleDetail submodule={selectedSubmodule} />;
  }
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `cd apps/desktop && pnpm tsc --noEmit`

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/detail/RightPanel.tsx
git commit -m "feat: show submodule detail in right panel"
```

---

### Task 8: Integration — Query Invalidation

**Files:**
- Modify: `apps/desktop/src/layouts/MainLayout.tsx`

- [ ] **Step 1: Add submodule query invalidation**

Open `apps/desktop/src/layouts/MainLayout.tsx` and find the file watcher event listener. In the `if (type === "worktree")` block, add:

```typescript
      if (type === "worktree") {
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "status"] });
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "submodules"] }); // Add this line
      }
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd apps/desktop && pnpm tsc --noEmit`

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/layouts/MainLayout.tsx
git commit -m "feat: invalidate submodule queries on worktree changes"
```

---

### Task 9: Testing — Manual Verification

- [ ] **Step 1: Start dev server**

Run: `cd apps/desktop && pnpm dev`

Expected: Vite dev server starts on port 1420.

- [ ] **Step 2: Start Tauri app**

In another terminal, run: `cd src-tauri && cargo tauri dev`

Expected: Desktop app launches.

- [ ] **Step 3: Open a repo with submodules**

Use the app to open a git repository that contains submodules (or create a test repo).

Expected: Submodules appear in the sidebar with status badges.

- [ ] **Step 4: Test init action**

Click a submodule with "not_initialized" status, click Init button.

Expected: Status changes to "ok" after operation completes.

- [ ] **Step 5: Test update action**

Click a submodule, click Update button.

Expected: Operation completes without error.

- [ ] **Step 6: Test remove action**

Click a submodule, click Remove button.

Expected: Submodule is removed from the list.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: complete submodule support implementation"
```

---

## Summary

This plan implements full submodule support:
- Backend command for removing submodules
- Frontend query hook for fetching submodule list
- UI components for displaying submodules with status badges
- Detail panel with init/update/remove actions
- Integration with file tree and query invalidation
