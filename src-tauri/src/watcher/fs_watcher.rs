use notify::event::ModifyKind;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
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
        }
    }

    pub fn start(&mut self, path: &str, app: AppHandle) -> Result<(), String> {
        let repo_root = Path::new(path);
        let git_dir = repo_root.join(".git");
        if !git_dir.exists() {
            return Err("No .git directory found".to_string());
        }

        self.running.store(true, Ordering::SeqCst);
        let running = self.running.clone();
        let (tx, rx) = mpsc::channel::<Result<Event, notify::Error>>();

        let mut watcher = RecommendedWatcher::new(
            move |res| {
                let _ = tx.send(res);
            },
            Config::default(),
        )
        .map_err(|e| format!("Failed to create watcher: {}", e))?;

        // Watch Git metadata recursively for branch/index changes, but keep the
        // worktree watch shallow. Recursive root watches can be very expensive
        // for repos with node_modules, target, dist, or other generated trees.
        watcher
            .watch(git_dir.as_path(), RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch .git directory: {}", e))?;
        watcher
            .watch(repo_root, RecursiveMode::NonRecursive)
            .map_err(|e| format!("Failed to watch repo root: {}", e))?;

        let app_clone = app.clone();
        let git_dir_str = git_dir.to_string_lossy().to_string();

        std::thread::spawn(move || {
            let mut last_emit: Option<Instant> = None;
            let debounce = Duration::from_millis(300);

            while running.load(Ordering::SeqCst) {
                match rx.recv() {
                    Ok(Ok(event)) => {
                        let event_type = classify_event(&event, &git_dir_str);
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
        Ok(())
    }

    pub fn stop(&mut self) {
        self.running.store(false, Ordering::SeqCst);
        self._watcher = None;
    }
}

fn classify_event(event: &Event, git_dir: &str) -> &'static str {
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
    if path_str.starts_with(git_dir) || path_str.contains("/.git/") {
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
