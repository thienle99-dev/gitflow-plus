use notify::event::ModifyKind;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

pub struct RepoWatcher {
    running: Arc<AtomicBool>,
    _watcher: Option<RecommendedWatcher>,
    watched_paths: Vec<PathBuf>,
}

#[derive(Clone, serde::Serialize)]
pub struct WatcherEvent {
    pub event_type: String,
}

impl RepoWatcher {
    pub fn new() -> Self {
        RepoWatcher {
            running: Arc::new(AtomicBool::new(false)),
            _watcher: None,
            watched_paths: Vec::new(),
        }
    }

    pub fn start(&mut self, path: &str, app: AppHandle) -> Result<(), String> {
        let repo_root = Path::new(path);
        let git_dir = repo_root.join(".git");
        if !git_dir.exists() {
            return Err("No .git directory found".to_string());
        }

        self.unwatch_current_paths();

        if self._watcher.is_none() {
            self.running.store(true, Ordering::SeqCst);
            let running = self.running.clone();
            let (tx, rx) = mpsc::channel::<Result<Event, notify::Error>>();

            let watcher = RecommendedWatcher::new(
                move |res| {
                    let _ = tx.send(res);
                },
                Config::default(),
            )
            .map_err(|e| format!("Failed to create watcher: {}", e))?;

            let app_clone = app.clone();

            std::thread::spawn(move || {
                let mut last_emit: Option<Instant> = None;
                let debounce = Duration::from_millis(300);

                while running.load(Ordering::SeqCst) {
                    match rx.recv() {
                        Ok(Ok(event)) => {
                            let event_type = classify_event(&event);
                            if event_type.is_empty() {
                                continue;
                            }

                            // Debounce: skip if last emit was < 300ms ago
                            let now = Instant::now();
                            if let Some(last) = last_emit {
                                if now.duration_since(last) < debounce {
                                    continue;
                                }
                            }
                            last_emit = Some(now);

                            let _ = app_clone.emit(
                                "repo:changed",
                                WatcherEvent {
                                    event_type: event_type.to_string(),
                                },
                            );
                        }
                        Ok(Err(_)) => {}
                        Err(_) => break,
                    }
                }
            });

            self._watcher = Some(watcher);
        }

        let watcher = self
            ._watcher
            .as_mut()
            .ok_or_else(|| "No watcher available".to_string())?;

        // Watch Git metadata recursively for branch/index changes, but keep the
        // worktree watch shallow. Recursive root watches can be very expensive
        // for repos with node_modules, target, dist, or other generated trees.
        watcher
            .watch(git_dir.as_path(), RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch .git directory: {}", e))?;
        watcher
            .watch(repo_root, RecursiveMode::NonRecursive)
            .map_err(|e| format!("Failed to watch repo root: {}", e))?;

        self.watched_paths = vec![git_dir, repo_root.to_path_buf()];
        Ok(())
    }

    pub fn stop(&mut self) {
        self.unwatch_current_paths();
    }

    fn unwatch_current_paths(&mut self) {
        if let Some(watcher) = self._watcher.as_mut() {
            for path in self.watched_paths.drain(..) {
                let _ = watcher.unwatch(path.as_path());
            }
        } else {
            self.watched_paths.clear();
        }
    }
}

impl Drop for RepoWatcher {
    fn drop(&mut self) {
        self.running.store(false, Ordering::SeqCst);
        self.unwatch_current_paths();

        // notify's macOS kqueue watcher can panic while dropping during a Tauri
        // invoke shutdown path. Keep process teardown quiet by avoiding that Drop.
        #[cfg(target_os = "macos")]
        if let Some(watcher) = self._watcher.take() {
            std::mem::forget(watcher);
        }
    }
}

fn classify_event(event: &Event) -> &'static str {
    let path_str = event.paths.first().and_then(|p| p.to_str()).unwrap_or("");

    // Skip noise: .git/objects, .git/logs (internal git bookkeeping)
    if path_str.contains(".git/objects") || path_str.contains(".git/logs") {
        return "";
    }

    // Skip common non-git directories
    if path_str.contains("/node_modules/")
        || path_str.contains("/target/")
        || path_str.contains("/.git/index.lock")
    {
        return "";
    }

    // Inside .git directory
    if path_str.contains("/.git/") {
        if path_str.contains("/refs/") {
            return "refs";
        }
        if path_str.ends_with("HEAD") {
            return "head";
        }
        if path_str.ends_with("/index") {
            return "worktree";
        }
        return "";
    }

    // Working tree file change
    match &event.kind {
        EventKind::Modify(ModifyKind::Data(_))
        | EventKind::Modify(ModifyKind::Any)
        | EventKind::Create(_)
        | EventKind::Remove(_) => "worktree",
        EventKind::Modify(ModifyKind::Name(_)) => "worktree",
        _ => "",
    }
}
