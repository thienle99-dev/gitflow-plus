use tauri::Manager;

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
