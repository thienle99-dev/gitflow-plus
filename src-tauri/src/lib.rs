use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_log::{RotationStrategy, Target, TargetKind, TimezoneStrategy};

mod commands;
mod watcher;

struct WatcherState(Mutex<Option<watcher::fs_watcher::RepoWatcher>>);

pub struct RepoCache {
    pub status_cache: Mutex<std::collections::HashMap<String, Vec<commands::status::StatusEntry>>>,
}

pub struct TrayHandle(pub Mutex<Option<tauri::tray::TrayIcon>>);

fn create_menu<R: tauri::Runtime>(app: &tauri::App<R>) -> Result<Menu<R>, tauri::Error> {
    let menu = Menu::new(app)?;

    // App Submenu
    let app_submenu = Submenu::new(app, "GitFlow Desktop", true)?;
    app_submenu.append(&PredefinedMenuItem::about(app, None, None)?)?;
    app_submenu.append(&MenuItem::with_id(
        app,
        "open_settings",
        "Settings...",
        true,
        Some("CmdOrCtrl+,"),
    )?)?;
    app_submenu.append(&PredefinedMenuItem::separator(app)?)?;
    app_submenu.append(&PredefinedMenuItem::hide(app, None)?)?;
    app_submenu.append(&PredefinedMenuItem::hide_others(app, None)?)?;
    app_submenu.append(&PredefinedMenuItem::show_all(app, None)?)?;
    app_submenu.append(&PredefinedMenuItem::separator(app)?)?;
    app_submenu.append(&PredefinedMenuItem::quit(app, None)?)?;

    // File Submenu
    let file_submenu = Submenu::new(app, "File", true)?;
    file_submenu.append(&MenuItem::with_id(
        app,
        "open_repo",
        "Open Repository...",
        true,
        Some("CmdOrCtrl+O"),
    )?)?;
    file_submenu.append(&MenuItem::with_id(
        app,
        "close_repo",
        "Close Repository",
        true,
        Some("CmdOrCtrl+W"),
    )?)?;

    // Edit Submenu
    let edit_submenu = Submenu::new(app, "Edit", true)?;
    edit_submenu.append(&PredefinedMenuItem::undo(app, None)?)?;
    edit_submenu.append(&PredefinedMenuItem::redo(app, None)?)?;
    edit_submenu.append(&PredefinedMenuItem::separator(app)?)?;
    edit_submenu.append(&PredefinedMenuItem::cut(app, None)?)?;
    edit_submenu.append(&PredefinedMenuItem::copy(app, None)?)?;
    edit_submenu.append(&PredefinedMenuItem::paste(app, None)?)?;
    edit_submenu.append(&PredefinedMenuItem::select_all(app, None)?)?;

    // View Submenu
    let view_submenu = Submenu::new(app, "View", true)?;
    view_submenu.append(&MenuItem::with_id(
        app,
        "toggle_sidebar",
        "Toggle Sidebar",
        true,
        Some("CmdOrCtrl+B"),
    )?)?;
    view_submenu.append(&MenuItem::with_id(
        app,
        "refresh",
        "Refresh / Fetch",
        true,
        Some("CmdOrCtrl+R"),
    )?)?;
    view_submenu.append(&MenuItem::with_id(
        app,
        "toggle_theme",
        "Toggle Dark Mode",
        true,
        Some("CmdOrCtrl+T"),
    )?)?;

    // Window Submenu
    let window_submenu = Submenu::new(app, "Window", true)?;
    window_submenu.append(&PredefinedMenuItem::minimize(app, None)?)?;

    // Help Submenu
    let help_submenu = Submenu::new(app, "Help", true)?;
    help_submenu.append(&MenuItem::with_id(
        app,
        "help_docs",
        "GitFlow Desktop Documentation",
        true,
        Some("CmdOrCtrl+H"),
    )?)?;

    menu.append(&app_submenu)?;
    menu.append(&file_submenu)?;
    menu.append(&edit_submenu)?;
    menu.append(&view_submenu)?;
    menu.append(&window_submenu)?;
    menu.append(&help_submenu)?;

    Ok(menu)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .clear_targets()
                .target(Target::new(TargetKind::LogDir {
                    file_name: Some("gitflow-desktop.log".to_string()),
                }))
                .level(if cfg!(debug_assertions) {
                    log::LevelFilter::Debug
                } else {
                    log::LevelFilter::Info
                })
                .max_file_size(5_000_000)
                .rotation_strategy(RotationStrategy::KeepAll)
                .timezone_strategy(TimezoneStrategy::UseLocal)
                .build(),
        )
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .skip_initial_state("tray")
                .with_filter(|label| label != "tray")
                .build(),
        )
        .manage(WatcherState(Mutex::new(Some(
            watcher::fs_watcher::RepoWatcher::new(),
        ))))
        .manage(commands::op_lock::RepoLocks::new())
        .manage(commands::running_ops::RunningOps::new())
        .manage(RepoCache {
            status_cache: Mutex::new(std::collections::HashMap::new()),
        })
        .manage(TrayHandle(Mutex::new(None)))
        .setup(|app| {
            log::info!("GitFlow Desktop starting");

            let menu = create_menu(app)?;
            app.set_menu(menu)?;

            let window = app.get_webview_window("main").unwrap();
            let _ = window.set_decorations(true);
            let main_window = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = main_window.hide();
                }
            });

            // Try to build a Tray Icon
            let tray_icon = app.default_window_icon().cloned().unwrap();
            let tray_handle = TrayIconBuilder::new()
                .icon(tray_icon)
                .tooltip("GitFlow Desktop")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        rect,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("tray") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                // Calculate position relative to clicked icon
                                let (pos_x, pos_y) = match rect.position {
                                    tauri::Position::Physical(p) => (p.x as f64, p.y as f64),
                                    tauri::Position::Logical(l) => (l.x, l.y),
                                };
                                let (size_w, size_h) = match rect.size {
                                    tauri::Size::Physical(s) => (s.width as f64, s.height as f64),
                                    tauri::Size::Logical(l) => (l.width, l.height),
                                };

                                let window_width = 400.0;
                                let window_height = 520.0;
                                let x = pos_x + (size_w / 2.0) - (window_width / 2.0);
                                let y = if pos_y > 500.0 {
                                    pos_y - window_height
                                } else {
                                    pos_y + size_h
                                };
                                let _ = window
                                    .set_position(tauri::PhysicalPosition::new(x as i32, y as i32));
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;
            *app.state::<TrayHandle>().0.lock().unwrap() = Some(tray_handle.clone());

            // Window blur event to auto-hide tray window
            if let Some(tray_win) = app.get_webview_window("tray") {
                let tray_win_clone = tray_win.clone();
                tray_win.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        let _ = tray_win_clone.hide();
                    }
                });
            }

            Ok(())
        })
        .on_menu_event(|app_handle, event| match event.id.0.as_str() {
            "open_settings" => {
                let _ = app_handle.emit("menu-action", "open-settings");
            }
            "open_repo" => {
                let _ = app_handle.emit("menu-action", "open-repo");
            }
            "close_repo" => {
                let _ = app_handle.emit("menu-action", "close-repo");
            }
            "toggle_sidebar" => {
                let _ = app_handle.emit("menu-action", "toggle-sidebar");
            }
            "refresh" => {
                let _ = app_handle.emit("menu-action", "refresh");
            }
            "toggle_theme" => {
                let _ = app_handle.emit("menu-action", "toggle-theme");
            }
            "help_docs" => {
                let _ = app_handle.emit("menu-action", "help-docs");
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            commands::repo::open_repo,
            commands::repo::get_repo_info,
            commands::repo::git_init,
            commands::app_logs::app_log_path,
            commands::app_logs::app_log_list,
            commands::app_logs::app_log_export_text,
            commands::app_logs::app_log_clear,
            commands::app_window::show_main_window,
            commands::app_window::open_settings_window,
            commands::app_window::open_repo_from_tray,
            commands::app_window::set_tray_sync_status,
            commands::bisect::bisect_start,
            commands::bisect::bisect_good,
            commands::bisect::bisect_bad,
            commands::bisect::bisect_skip,
            commands::bisect::bisect_status,
            commands::bisect::bisect_reset,
            commands::bisect::bisect_candidate_diff,
            commands::git_config::list_git_config,
            commands::git_config::get_git_config,
            commands::git_config::set_git_config,
            commands::git_config::unset_git_config,
            commands::git_config::add_git_config,
            commands::log::git_log,
            commands::log::git_log_since,
            commands::log::git_log_stream,
            commands::log::file_history,
            commands::log::git_activity,
            commands::status::git_status,
            commands::branch::list_branches,
            commands::branch::create_branch,
            commands::branch::checkout_branch,
            commands::branch::delete_branch,
            commands::branch::delete_remote_branch,
            commands::branch::compare_branches,
            commands::branch::branch_file_diff,
            commands::commit::stage_file,
            commands::commit::stage_files,
            commands::commit::unstage_file,
            commands::commit::stage_all,
            commands::commit::unstage_all,
            commands::commit::discard_file,
            commands::commit::discard_all,
            commands::commit::commit_changes,
            commands::commit::commit_file_groups,
            commands::commit::revert_commit,
            commands::commit::open_file_in_editor,
            commands::lint::run_project_linters,
            commands::diff::file_diff,
            commands::diff::commit_diff,
            commands::diff::staged_diff,
            commands::diff::commit_changed_files,
            commands::diff::apply_diff_hunk,
            commands::diff::write_file_content,
            commands::diff::read_working_file_base64,
            commands::diff::read_git_object_base64,
            commands::lfs::lfs_status,
            commands::lfs::lfs_pull,
            commands::lfs::lfs_push,
            commands::remote::git_pull,
            commands::remote::git_push,
            commands::remote::git_fetch,
            commands::remote::get_sync_status,
            commands::remote::detect_ssh_keys,
            commands::remote::detect_remote_protocol,
            commands::remote::set_temp_credentials,
            commands::remote::restore_remote_url,
            commands::remote::list_remotes,
            commands::remote::add_remote,
            commands::remote::remove_remote,
            commands::remote::rename_remote,
            commands::remote::set_remote_url,
            commands::remote::generate_ssh_key,
            commands::remote::get_remote_url,
            commands::remote::test_ssh_connection,
            commands::remote::test_https_token,
            commands::watcher::start_watcher,
            commands::watcher::stop_watcher,
            commands::merge::merge_branch,
            commands::merge::merge_abort,
            commands::merge::merge_continue,
            commands::merge::merge_status,
            commands::merge::merge_preview,
            commands::stash::stash_list,
            commands::stash::stash_push,
            commands::stash::stash_pop,
            commands::stash::stash_apply,
            commands::stash::stash_drop,
            commands::stash::stash_diff,
            commands::tag::tag_list,
            commands::tag::tag_create,
            commands::tag::tag_delete,
            commands::tag::tag_push,
            commands::cherry_pick::cherry_pick,
            commands::cherry_pick::cherry_pick_multi,
            commands::cherry_pick::cherry_pick_abort,
            commands::blame::file_blame,
            commands::search::search_commits,
            commands::search::search_content,
            commands::reflog::reflog_list,
            commands::reflog::undo_last,
            commands::reflog::restore_to_commit,
            commands::reflog::reset_to_commit,
            commands::signing::verify_signature,
            commands::signing::has_signature,
            commands::signing::list_signing_keys,
            commands::signing::get_signing_config,
            commands::rebase::rebase_start,
            commands::rebase::rebase_continue,
            commands::rebase::rebase_skip,
            commands::rebase::rebase_abort,
            commands::rebase::rebase_status,
            commands::rebase::rebase_todo_list,
            commands::rebase::get_paused_commit_info,
            commands::rebase::amend_and_continue_rebase,
            commands::ai::ai_http_request,
            commands::ai::read_convention_files,
            commands::clone::git_clone,
            commands::clone::cancel_clone,
            commands::submodule::submodule_list,
            commands::submodule::submodule_init,
            commands::submodule::submodule_update,
            commands::submodule::submodule_remove,
            commands::health::repo_health_check,
            commands::health::diagnostic_bundle,
            commands::op_lock::repo_lock_status,
            commands::preflight::preflight_check,
            commands::gitflow::gitflow_detect,
            commands::gitflow::gitflow_init,
            commands::gitflow::gitflow_update_config,
            commands::gitflow::gitflow_feature_start,
            commands::gitflow::gitflow_feature_finish,
            commands::gitflow::gitflow_release_start,
            commands::gitflow::gitflow_release_finish,
            commands::gitflow::gitflow_hotfix_start,
            commands::gitflow::gitflow_hotfix_finish,
            commands::credentials::credential_set,
            commands::credentials::credential_get,
            commands::credentials::credential_delete,
            commands::hooks::list_hooks,
            commands::hooks::enable_hook,
            commands::hooks::disable_hook,
            commands::hooks::save_hook,
            commands::hooks::delete_hook,
            commands::running_ops::cancel_git_op,
            commands::worktree::worktree_list,
            commands::worktree::worktree_add,
            commands::worktree::worktree_remove,
            commands::worktree::worktree_lock,
            commands::worktree::worktree_unlock,
            commands::worktree::worktree_prune,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
