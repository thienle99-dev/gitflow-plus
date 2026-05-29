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
            commands::diff::commit_changed_files,
            commands::remote::git_pull,
            commands::remote::git_push,
            commands::remote::git_fetch,
            commands::watcher::start_watcher,
            commands::watcher::stop_watcher,
            commands::merge::merge_branch,
            commands::merge::merge_abort,
            commands::merge::merge_continue,
            commands::merge::merge_status,
            commands::stash::stash_list,
            commands::stash::stash_push,
            commands::stash::stash_pop,
            commands::stash::stash_apply,
            commands::stash::stash_drop,
            commands::tag::tag_list,
            commands::tag::tag_create,
            commands::tag::tag_delete,
            commands::tag::tag_push,
            commands::cherry_pick::cherry_pick,
            commands::cherry_pick::cherry_pick_abort,
            commands::blame::file_blame,
            commands::search::search_commits,
            commands::reflog::reflog_list,
            commands::reflog::undo_last,
            commands::rebase::rebase_start,
            commands::rebase::rebase_continue,
            commands::rebase::rebase_skip,
            commands::rebase::rebase_abort,
            commands::rebase::rebase_status,
            commands::rebase::rebase_todo_list,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
