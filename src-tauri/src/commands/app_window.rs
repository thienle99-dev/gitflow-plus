use tauri::{AppHandle, Emitter, Manager};

fn show_main_and_hide_tray(app: &AppHandle) -> Result<(), String> {
    let main = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    main.show()
        .map_err(|e| format!("Failed to show main window: {}", e))?;
    main.unminimize()
        .map_err(|e| format!("Failed to unminimize main window: {}", e))?;
    main.set_focus()
        .map_err(|e| format!("Failed to focus main window: {}", e))?;

    if let Some(tray) = app.get_webview_window("tray") {
        let _ = tray.hide();
    }

    Ok(())
}

#[tauri::command]
pub async fn show_main_window(app: AppHandle) -> Result<(), String> {
    show_main_and_hide_tray(&app)
}

#[tauri::command]
pub async fn open_settings_window(app: AppHandle) -> Result<(), String> {
    show_main_and_hide_tray(&app)?;
    app.emit_to("main", "open-dialog", "settings")
        .map_err(|e| format!("Failed to open settings: {}", e))
}

#[tauri::command]
pub async fn open_repo_from_tray(app: AppHandle) -> Result<(), String> {
    show_main_and_hide_tray(&app)?;
    app.emit_to("main", "menu-action", "open-repo")
        .map_err(|e| format!("Failed to emit open-repo: {}", e))
}
