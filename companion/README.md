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

1. **Rust** — install via [rustup](https://rustup.rs)  
   `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

2. **Microsoft Visual Studio C++ Build Tools** or **Visual Studio 2022** with the "Desktop development with C++" workload.  
   Download from: https://visualstudio.microsoft.com/downloads/

3. **Bun** (or Node.js) — install from https://bun.sh

4. **WebView2** — pre-installed on Windows 10+ (if missing, Tauri will prompt you to install it)

## Quick Start

```bash
# Install dependencies
bun install

# Install Tauri CLI
cargo install tauri-cli --version "^2"

# Run in development mode (hot reload)
cargo tauri dev

# Build for production (.msi / .exe installer)
cargo tauri build
```

The built installer will be in `src-tauri/target/release/bundle/`.

## Configuration

### API endpoint

By default, markers are sent to `https://wwwfragclip.com/api/markers`.  
To use a different server, set the `VITE_API_BASE_URL` environment variable:

```bash
VITE_API_BASE_URL=http://localhost:3000 cargo tauri dev
```

### Session cookie

For authenticated marker syncing, paste your `fragclip_session` cookie into the Settings panel.  
You can find it in your browser's DevTools → Application → Cookies → wwwfragclip.com.

## File Structure

```
companion/
├── src/                    # React frontend (settings UI)
│   ├── main.tsx            # App component and marker logic
│   └── style.css           # FragClip dark theme
├── src-tauri/              # Rust/Tauri backend
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   └── lib.rs          # Tray, hotkey, commands
│   ├── icons/icon.png      # Tray icon (replace with branded icon)
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # App config
├── package.json
└── vite.config.ts
```
