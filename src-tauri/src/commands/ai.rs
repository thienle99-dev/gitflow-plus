use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpRequestData {
    pub url: String,
    pub method: String,
    pub headers: std::collections::HashMap<String, String>,
    pub body: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpResponseData {
    pub status: u16,
    pub body: String,
}

#[tauri::command]
pub async fn ai_http_request(request: HttpRequestData) -> Result<HttpResponseData, String> {
    let client = reqwest::Client::new();
    let mut req_builder = match request.method.to_uppercase().as_str() {
        "POST" => client.post(&request.url),
        "GET" => client.get(&request.url),
        _ => return Err(format!("Unsupported method: {}", request.method)),
    };

    for (k, v) in request.headers {
        req_builder = req_builder.header(k, v);
    }

    if let Some(body_str) = request.body {
        req_builder = req_builder.body(body_str);
    }

    let response = req_builder.send().await.map_err(|e| e.to_string())?;
    let status = response.status().as_u16();
    let body = response.text().await.map_err(|e| e.to_string())?;

    Ok(HttpResponseData { status, body })
}
