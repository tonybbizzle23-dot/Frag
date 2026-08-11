import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import './style.css';

const API = import.meta.env.VITE_API_BASE_URL || 'https://wwwfragclip.com';

function App() {
  const [recording, setRecording] = useState(false);
  const [count, setCount] = useState(0);
  const [hotkey, setHotkey] = useState(localStorage.hotkey || 'Control+Shift+F');
  const [cookie, setCookie] = useState(localStorage.sessionCookie || '');
  const [sessionId, setSessionId] = useState('');
  const recordingRef = useRef(recording);
  recordingRef.current = recording;

  useEffect(() => {
    invoke<string>('session_id').then(setSessionId).catch(console.error);
  }, []);

  useEffect(() => {
    const unlistenHighlight = listen('highlight-marker', () => {
      if (recordingRef.current) {
        setCount((c) => c + 1);
        void sendMarker();
      }
    });
    const unlistenToggle = listen('toggle-recording', () => {
      const next = !recordingRef.current;
      setRecording(next);
      void invoke('set_recording', { recording: next });
    });
    return () => {
      unlistenHighlight.then((f) => f());
      unlistenToggle.then((f) => f());
    };
  }, []);

  async function sendMarker() {
    try {
      await invoke('send_marker', {
        apiBase: API,
        timestamp: new Date().toISOString(),
        windowTitle: document.title,
        sessionId,
        cookie,
      });
    } catch (e) {
      console.error('Marker sync failed', e);
    }
  }

  async function toggle() {
    const next = !recording;
    setRecording(next);
    await invoke('set_recording', { recording: next });
  }

  async function saveSettings() {
    try {
      await invoke('set_hotkey', { hotkey });
      localStorage.hotkey = hotkey;
      localStorage.sessionCookie = cookie;
      alert('Settings saved');
    } catch (e) {
      alert('Could not register hotkey: ' + String(e));
    }
  }

  return (
    <main>
      <header>
        <span className="logo">FRAG<span>CLIP</span></span>
        <small>COMPANION</small>
      </header>
      <section className="hero">
        <div className={`dot ${recording ? 'on' : ''}`} />
        <h1>{recording ? 'Recording' : 'Paused'}</h1>
        <p>
          Press <kbd>{hotkey.replace('Control', 'Ctrl')}</kbd> to mark a highlight
        </p>
        <button onClick={toggle}>{recording ? 'Stop Recording' : 'Start Recording'}</button>
      </section>
      <div className="stat">
        <strong>{count}</strong>
        <span>markers this session</span>
      </div>
      <section className="settings">
        <h2>Settings</h2>
        <label>
          Global hotkey
          <input
            value={hotkey}
            onChange={(e) => setHotkey(e.target.value)}
            placeholder="Control+Shift+F"
          />
        </label>
        <label>
          Session cookie (optional)
          <textarea
            value={cookie}
            onChange={(e) => setCookie(e.target.value)}
            placeholder="fragclip_session=..."
          />
        </label>
        <button className="secondary" onClick={saveSettings}>
          Save settings
        </button>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
