use notify::event::ModifyKind;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
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
        let watch_path = Path::new(path).join(".git");
        if !watch_path.exists() {
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

        watcher
            .watch(watch_path.as_path(), RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to start watching: {}", e))?;

        let app_clone = app.clone();
        std::thread::spawn(move || {
            while running.load(Ordering::SeqCst) {
                match rx.recv() {
                    Ok(Ok(event)) => {
                        let event_type = classify_event(&event);
                        if !event_type.is_empty() {
                            let _ = app_clone.emit(
                                "repo:changed",
                                WatcherEvent {
                                    event_type: event_type.to_string(),
                                },
                            );
                        }
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

fn classify_event(event: &Event) -> &'static str {
    match &event.kind {
        EventKind::Modify(ModifyKind::Data(_)) => "worktree",
        EventKind::Create(_) | EventKind::Remove(_) => {
            path_contains_ref(event)
        }
        EventKind::Modify(ModifyKind::Name(_)) => {
            path_contains_ref(event)
        }
        EventKind::Modify(ModifyKind::Any) => path_contains_ref(event),
        _ => "",
    }
}

fn path_contains_ref(event: &Event) -> &'static str {
    let path_str = event
        .paths
        .first()
        .and_then(|p| p.to_str())
        .unwrap_or("");
    if path_str.contains("/refs/") || path_str.contains("\\refs\\") {
        "refs"
    } else if path_str.contains("HEAD") && path_str.ends_with("HEAD") {
        "head"
    } else {
        "worktree"
    }
}
