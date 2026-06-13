use keyring::Entry;

const SERVICE_NAME: &str = "com.gitflow.desktop";

/// Store a secret credential in the OS keychain.
#[tauri::command]
pub async fn credential_set(key: String, value: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &key)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;
    entry
        .set_password(&value)
        .map_err(|e| format!("Failed to store credential: {}", e))
}

/// Retrieve a secret credential from the OS keychain.
#[tauri::command]
pub async fn credential_get(key: String) -> Result<String, String> {
    let entry = Entry::new(SERVICE_NAME, &key)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;
    entry
        .get_password()
        .map_err(|e| format!("Credential not found: {}", e))
}

/// Delete a secret credential from the OS keychain.
#[tauri::command]
pub async fn credential_delete(key: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &key)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;
    entry
        .delete_credential()
        .map_err(|e| format!("Failed to delete credential: {}", e))
}
