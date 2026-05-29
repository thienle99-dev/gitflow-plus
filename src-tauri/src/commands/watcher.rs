use crate::WatcherState;
use tauri::State;

#[tauri::command]
pub fn start_watcher(
    path: String,
    app: tauri::AppHandle,
    state: State<'_, WatcherState>,
) -> Result<String, String> {
    let mut guard = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    if let Some(ref mut watcher) = *guard {
        watcher.start(&path, app)?;
        Ok("Watcher started".to_string())
    } else {
        Err("No watcher available".to_string())
    }
}

#[tauri::command]
pub fn stop_watcher(state: State<'_, WatcherState>) -> Result<String, String> {
    let mut guard = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    if let Some(ref mut watcher) = *guard {
        watcher.stop();
        Ok("Watcher stopped".to_string())
    } else {
        Err("No watcher available".to_string())
    }
}
