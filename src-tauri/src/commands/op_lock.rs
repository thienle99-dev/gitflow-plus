use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use serde::Serialize;
use tokio::sync::OwnedMutexGuard;

/// Per-repo operation lock. Prevents concurrent mutating git operations
/// (pull/push/fetch/merge/rebase/cherry-pick/checkout/commit/stash/tag/lfs/submodule)
/// on the same repository path.
///
/// Read-only operations (log, status, diff, blame, search) do NOT need the lock.
pub struct RepoLocks {
    inner: Mutex<HashMap<String, Arc<tokio::sync::Mutex<()>>>>,
}

impl RepoLocks {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(HashMap::new()),
        }
    }

    /// Acquire the lock for a given repo path. If another operation is already
    /// running on this repo, this will await until it completes.
    /// Returns a guard that releases the lock when dropped.
    pub async fn acquire(&self, repo_path: &str) -> OwnedMutexGuard<()> {
        let mutex = {
            let mut map = self.inner.lock().unwrap();
            map.entry(repo_path.to_string())
                .or_insert_with(|| Arc::new(tokio::sync::Mutex::new(())))
                .clone()
        };
        mutex.lock_owned().await
    }

    /// Try to acquire the lock without blocking. Returns None if already held.
    pub fn try_acquire(&self, repo_path: &str) -> Option<OwnedMutexGuard<()>> {
        let mutex = {
            let mut map = self.inner.lock().unwrap();
            map.entry(repo_path.to_string())
                .or_insert_with(|| Arc::new(tokio::sync::Mutex::new(())))
                .clone()
        };
        mutex.try_lock_owned().ok()
    }

    /// Check if a repo currently has an operation in progress.
    pub fn is_locked(&self, repo_path: &str) -> bool {
        let map = self.inner.lock().unwrap();
        if let Some(mutex) = map.get(repo_path) {
            mutex.try_lock().is_err()
        } else {
            false
        }
    }
}

#[derive(Serialize)]
pub struct RepoLockStatus {
    pub path: String,
    pub locked: bool,
}

#[tauri::command]
pub fn repo_lock_status(
    locks: tauri::State<'_, RepoLocks>,
    path: String,
) -> RepoLockStatus {
    RepoLockStatus {
        locked: locks.is_locked(&path),
        path,
    }
}
