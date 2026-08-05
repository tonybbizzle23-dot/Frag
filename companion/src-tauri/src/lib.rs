use std::sync::Mutex;
use tauri::{Emitter, Manager, State, menu::{Menu, MenuItem}, tray::TrayIconBuilder};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

struct AppState(Mutex<SessionState>);
struct SessionState { recording: bool, session_id: String, hotkey: String }

#[tauri::command]
fn set_recording(recording: bool, state: State<AppState>) -> Result<(), String> { state.0.lock().map_err(|e| e.to_string())?.recording = recording; Ok(()) }
#[tauri::command]
fn set_hotkey(hotkey: String, app: tauri::AppHandle, state: State<AppState>) -> Result<(), String> {
  let shortcut: Shortcut = hotkey.parse().map_err(|e: tauri_plugin_global_shortcut::Error| e.to_string())?;
  app.global_shortcut().unregister_all().map_err(|e| e.to_string())?;
  let handle = app.clone();
  app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| { if event.state == ShortcutState::Pressed { let _ = handle.emit("highlight-marker", ()); } }).map_err(|e| e.to_string())?;
  state.0.lock().map_err(|e| e.to_string())?.hotkey = hotkey; Ok(())
}
#[tauri::command]
fn session_id(state: State<AppState>) -> Result<String, String> { Ok(state.0.lock().map_err(|e| e.to_string())?.session_id.clone()) }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(AppState(Mutex::new(SessionState { recording: false, session_id: uuid::Uuid::new_v4().to_string(), hotkey: "Control+Shift+F".into() })))
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    .setup(|app| { let start = MenuItem::with_id(app, "record", "Start / Stop Recording", true, None::<&str>)?; let settings = MenuItem::with_id(app, "settings", "Open Settings", true, None::<&str>)?; let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?; let menu = Menu::with_items(app, &[&start, &settings, &quit])?; let _tray = TrayIconBuilder::new().menu(&menu).tooltip("FragClip Companion").on_menu_event(|app, event| { if event.id.as_ref() == "quit" { app.exit(0); } else if event.id.as_ref() == "settings" { let _ = app.get_webview_window("main").map(|w| w.show()); } }).build(app)?; let handle = app.handle().clone(); let shortcut: Shortcut = "Control+Shift+F".parse().unwrap(); app.global_shortcut().on_shortcut(shortcut, move |_app, _, event| { if event.state == ShortcutState::Pressed { let _ = handle.emit("highlight-marker", ()); } }).map_err(|e| e.to_string())?; Ok(()) })
    .invoke_handler(tauri::generate_handler![set_recording, set_hotkey, session_id])
    .run(tauri::generate_context!()).expect("error while running FragClip Companion");
}
