use std::sync::Mutex;

use tauri::{
  menu::{Menu, MenuItem},
  tray::TrayIconBuilder,
  Emitter, Manager, State,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

struct AppState(Mutex<SessionState>);
struct SessionState {
  recording: bool,
  session_id: String,
  hotkey: String,
}

#[tauri::command]
fn set_recording(recording: bool, state: State<AppState>) -> Result<(), String> {
  state.0.lock().map_err(|e| e.to_string())?.recording = recording;
  Ok(())
}

#[tauri::command]
fn set_hotkey(hotkey: String, app: tauri::AppHandle, state: State<AppState>) -> Result<(), String> {
  let shortcut: Shortcut = hotkey
    .parse()
    .map_err(|e: tauri_plugin_global_shortcut::Error| e.to_string())?;
  app.global_shortcut().unregister_all().map_err(|e| e.to_string())?;
  let handle = app.clone();
  app
    .global_shortcut()
    .on_shortcut(shortcut, move |_app, _shortcut, event| {
      if event.state == ShortcutState::Pressed {
        let _ = handle.emit("highlight-marker", ());
      }
    })
    .map_err(|e| e.to_string())?;
  state.0.lock().map_err(|e| e.to_string())?.hotkey = hotkey;
  Ok(())
}

#[tauri::command]
fn session_id(state: State<AppState>) -> Result<String, String> {
  Ok(state.0.lock().map_err(|e| e.to_string())?.session_id.clone())
}

/// Post a highlight marker to the FragClip API from Rust.
///
/// This intentionally runs outside the webview: browsers forbid setting the
/// `Cookie` header from `fetch()`, so the webview could never authenticate
/// the request. A native HTTP client has no such restriction and is also
/// immune to CORS, since the companion is served from a non-web origin
/// (`tauri://localhost`).
#[tauri::command]
async fn send_marker(
  api_base: String,
  timestamp: String,
  window_title: String,
  session_id: String,
  cookie: Option<String>,
) -> Result<(), String> {
  let client = reqwest::Client::new();
  let mut req = client
    .post(format!("{}/api/markers", api_base.trim_end_matches('/')))
    .header("Content-Type", "application/json");
  if let Some(cookie) = cookie.as_deref().map(str::trim).filter(|c| !c.is_empty()) {
    req = req.header("Cookie", cookie);
  }
  let resp = req
    .json(&serde_json::json!({
      "timestamp": timestamp,
      "windowTitle": window_title,
      "sessionId": session_id,
    }))
    .send()
    .await
    .map_err(|e| format!("Failed to reach FragClip: {e}"))?;
  let status = resp.status();
  if !status.is_success() {
    let body = resp.text().await.unwrap_or_default();
    return Err(format!("FragClip API returned {status}: {body}"));
  }
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(AppState(Mutex::new(SessionState {
      recording: false,
      session_id: uuid::Uuid::new_v4().to_string(),
      hotkey: "Control+Shift+F".into(),
    })))
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    .setup(|app| {
      let record = MenuItem::with_id(app, "record", "Start / Stop Recording", true, None::<&str>)?;
      let settings = MenuItem::with_id(app, "settings", "Open Settings", true, None::<&str>)?;
      let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&record, &settings, &quit])?;

      let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("FragClip Companion")
        .on_menu_event(|app, event| match event.id.as_ref() {
          "record" => {
            let _ = app.emit("toggle-recording", ());
          }
          "settings" => {
            if let Some(win) = app.get_webview_window("main") {
              let _ = win.show();
            }
          }
          "quit" => app.exit(0),
          _ => {}
        })
        .build(app)?;

      // Register the default global hotkey. If registration fails (e.g. the
      // hotkey is already taken by another app), log it but keep running so
      // the user can pick a different hotkey in Settings.
      let default_hotkey: Shortcut = "Control+Shift+F"
        .parse()
        .map_err(|e: tauri_plugin_global_shortcut::Error| e.to_string())?;
      let handle = app.handle().clone();
      app
        .global_shortcut()
        .on_shortcut(default_hotkey, move |_app, _shortcut, event| {
          if event.state == ShortcutState::Pressed {
            let _ = handle.emit("highlight-marker", ());
          }
        })
        .map_err(|e| e.to_string())?;

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      set_recording,
      set_hotkey,
      session_id,
      send_marker
    ])
    .run(tauri::generate_context!())
    .expect("error while running FragClip Companion");
}
