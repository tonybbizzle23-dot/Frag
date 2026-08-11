# FragClip Companion

Desktop system tray app that lets you mark gameplay highlights with a global hotkey while gaming. Markers sync to your [FragClip](https://wwwfragclip.com) account for one-click clip generation.

Default hotkey: **Ctrl+Shift+F**

## Features

- Global hotkey — mark highlights without alt-tabbing out of your game
- System tray — runs quietly in the background
- Recording indicator — shows marker count per session
- Configurable hotkey — change to any shortcut you prefer
- Session cookie support — sync markers to your FragClip account
- Auto-start support

## Prerequisites (Windows)

1. **Rust** — install via [rustup](https://rustup.rs). On Windows this is an installer, not a shell command:
   - Download **rustup-init.exe** from https://win.rustup.rs/ and run it, **or**
   - `winget install Rustlang.Rustup`
   - Accept the defaults (stable toolchain, MSVC host). rustup adds `cargo` and `rustc` to your PATH — restart any open terminals afterwards.

2. **Microsoft Visual Studio C++ Build Tools** (or Visual Studio 2022) with the **"Desktop development with C++"** workload. Download from https://visualstudio.microsoft.com/downloads/.
   Rust uses MSVC's `link.exe` and the Windows SDK when compiling — this is required even if you never write C++ yourself. If you install it after Rust, just retry the build (no reinstall of Rust needed).

3. **Bun** (or Node.js) — install from https://bun.sh.

4. **WebView2** — pre-installed on Windows 10/11. If it's missing, Tauri will prompt you to install it.

## Quick Start

Open a terminal (PowerShell or cmd) in this `companion/` folder:

```powershell
# 1. Install frontend dependencies
bun install

# 2. Run in development mode (hot reload, opens the app window)
bun run tauri dev

# 3. Build the release installers (.exe NSIS installer + .msi)
bun run tauri build
```

Notes:

- The Tauri CLI (`@tauri-apps/cli`) is already pinned in `package.json` — there is **no** `cargo install tauri-cli` step.
- The **first build takes several minutes** while Rust compiles ~400 crates. Later builds are much faster.
- The built installers are in `src-tauri/target/release/bundle/`:
  - `nsis/FragClip Companion_0.1.0_x64-setup.exe` — the installer most users should run
  - `msi/FragClip Companion_0.1.0_x64_en-US.msi` — MSI package

## Configuration

### API endpoint

By default, markers are sent to `https://wwwfragclip.com/api/markers`. To use a different server, set the `VITE_API_BASE_URL` environment variable before running the dev/build command:

```powershell
# PowerShell
$env:VITE_API_BASE_URL = "http://localhost:3000"
bun run tauri dev
```

(Remember to remove it afterwards: `Remove-Item Env:VITE_API_BASE_URL`)

### Session cookie

For authenticated marker syncing, paste your `fragclip_session` cookie into the Settings panel. You can find it in your browser's DevTools → Application → Cookies → wwwfragclip.com.

Markers are POSTed from the app's Rust backend (not the webview), so the cookie is sent exactly as pasted — browser cookie restrictions don't apply.

### Hotkeys

The default hotkey is `Ctrl+Shift+F`. Change it in Settings using Tauri shortcut syntax, e.g. `Control+Shift+F`, `Alt+1`, `F9` (modifiers: `Control`, `Alt`, `Shift`, `Super`).

## Updating the app icon

Icons live in `src-tauri/icons/`. To regenerate the full set (`.ico` for Windows, `.icns` for macOS, PNGs) from a new square 1024×1024 PNG or SVG:

```powershell
bun run tauri icon path\to\your-icon.png
```

## File Structure

```
companion/
├── src/                    # React frontend (settings UI)
│   ├── main.tsx            # App component and marker logic
│   └── style.css           # FragClip dark theme
├── src-tauri/              # Rust/Tauri backend
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   └── lib.rs          # Tray, hotkey, marker-sync commands
│   ├── icons/              # Generated app icons (icon.ico, icon.icns, PNGs)
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # App config
├── package.json
└── vite.config.ts
```

## Troubleshooting

- **Build fails early with "linker `link.exe` not found"**: the MSVC "Desktop development with C++" workload is missing or Visual Studio was installed after Rust. Install the workload and retry — no Rust reinstall needed.
- **`bun` is not recognized**: close and reopen the terminal after installing Bun (PATH refresh).
- **Hotkey does nothing while gaming**: another app may hold the shortcut (e.g. PowerToys, GeForce Experience). Pick a different hotkey in Settings.
- **Markers don't sync**: make sure you're logged into FragClip in your browser and the pasted cookie starts with `fragclip_session=`. Errors are printed to the console when running `bun run tauri dev`.
