use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use tauri::Manager;

type ProcessHandle = Arc<Mutex<Option<Child>>>;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let backend_proc: ProcessHandle = Arc::new(Mutex::new(None));
    let backend_for_setup = backend_proc.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(move |app| {
            let backend_path = resolve_backend_path(app);
            eprintln!("[OpenClaw Studio] Backend path: {backend_path}");

            let child_state = backend_for_setup.clone();
            std::thread::spawn(move || {
                match Command::new("node").arg(&backend_path).spawn() {
                    Ok(child) => {
                        eprintln!("[OpenClaw Studio] Backend started (pid: {})", child.id());
                        if let Ok(mut guard) = child_state.lock() {
                            *guard = Some(child);
                        }
                    }
                    Err(e) => {
                        eprintln!("[OpenClaw Studio] Failed to start backend: {e}");
                    }
                }
            });

            std::thread::spawn(|| {
                let health = std::net::TcpStream::connect_timeout(
                    &"127.0.0.1:18789".parse().unwrap(),
                    std::time::Duration::from_secs(2),
                );
                if health.is_err() {
                    eprintln!("[OpenClaw Studio] Gateway not running, starting...");
                    match Command::new("openclaw")
                        .args(["gateway", "--port", "18789"])
                        .spawn()
                    {
                        Ok(child) => {
                            eprintln!("[OpenClaw Studio] Gateway started (pid: {})", child.id());
                        }
                        Err(e) => {
                            eprintln!("[OpenClaw Studio] Failed to start gateway: {e}");
                        }
                    }
                } else {
                    eprintln!("[OpenClaw Studio] Gateway already running");
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |_app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                eprintln!("[OpenClaw Studio] Shutting down...");
                if let Ok(mut guard) = backend_proc.lock() {
                    if let Some(ref mut child) = *guard {
                        let _ = child.kill();
                        let _ = child.wait();
                        eprintln!("[OpenClaw Studio] Backend process stopped");
                    }
                }
            }
        });
}

fn resolve_backend_path(app: &tauri::App) -> String {
    if cfg!(debug_assertions) {
        let cwd = std::env::current_dir().unwrap_or_default();
        let candidate = cwd.join("backend/dist/index.js");
        if candidate.exists() {
            return candidate.to_string_lossy().to_string();
        }
        let parent = cwd.parent().map(|p| p.join("backend/dist/index.js"));
        if let Some(ref p) = parent {
            if p.exists() {
                return p.to_string_lossy().to_string();
            }
        }
        candidate.to_string_lossy().to_string()
    } else {
        app.path()
            .resource_dir()
            .map(|p| {
                p.join("backend/dist/index.js")
                    .to_string_lossy()
                    .to_string()
            })
            .unwrap_or_else(|_| "backend/dist/index.js".to_string())
    }
}
