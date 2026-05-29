use std::sync::Mutex;
use tauri::Manager;

mod commands;
mod watcher;

struct WatcherState(Mutex<Option<watcher::fs_watcher::RepoWatcher>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .manage(WatcherState(Mutex::new(Some(
            watcher::fs_watcher::RepoWatcher::new(),
        ))))
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            let _ = window.set_decorations(true);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::repo::open_repo,
            commands::repo::get_repo_info,
            commands::log::git_log,
            commands::status::git_status,
            commands::branch::list_branches,
            commands::branch::create_branch,
            commands::branch::checkout_branch,
            commands::branch::delete_branch,
            commands::commit::stage_file,
            commands::commit::unstage_file,
            commands::commit::stage_all,
            commands::commit::unstage_all,
            commands::commit::commit_changes,
            commands::diff::file_diff,
            commands::diff::commit_diff,
            commands::diff::staged_diff,
            commands::remote::git_pull,
            commands::remote::git_push,
            commands::remote::git_fetch,
            commands::watcher::start_watcher,
            commands::watcher::stop_watcher,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
