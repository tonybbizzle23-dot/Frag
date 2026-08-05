import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import './style.css';

const API = import.meta.env.VITE_API_BASE_URL || 'https://wwwfragclip.com';
function App() {
  const [recording, setRecording] = useState(false), [count, setCount] = useState(0);
  const [hotkey, setHotkey] = useState(localStorage.hotkey || 'Control+Shift+F');
  const [cookie, setCookie] = useState(localStorage.sessionCookie || ''), [sessionId, setSessionId] = useState('');
  useEffect(() => { invoke<string>('session_id').then(setSessionId); const unlisten = listen('highlight-marker', () => { if (recording) { setCount(c => c + 1); void sendMarker(); } }); return () => { unlisten.then(f => f()); }; }, [recording, sessionId]);
  async function sendMarker() { try { await fetch(`${API}/api/markers`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json', ...(cookie ? {Cookie: cookie} : {})}, body:JSON.stringify({timestamp:new Date().toISOString(), windowTitle:document.title, sessionId}) }); } catch (e) { console.error('Marker sync failed', e); } }
  async function toggle() { const next=!recording; setRecording(next); await invoke('set_recording',{recording:next}); }
  async function saveSettings() { localStorage.hotkey=hotkey; localStorage.sessionCookie=cookie; await invoke('set_hotkey',{hotkey}); alert('Settings saved'); }
  return <main><header><span className="logo">FRAG<span>CLIP</span></span><small>COMPANION</small></header><section className="hero"><div className={`dot ${recording?'on':''}`}/><h1>{recording?'Recording':'Paused'}</h1><p>Press <kbd>{hotkey.replace('Control','Ctrl')}</kbd> to mark a highlight</p><button onClick={toggle}>{recording?'Stop Recording':'Start Recording'}</button></section><div className="stat"><strong>{count}</strong><span>markers this session</span></div><section className="settings"><h2>Settings</h2><label>Global hotkey<input value={hotkey} onChange={e=>setHotkey(e.target.value)} placeholder="Control+Shift+F" /></label><label>Session cookie (optional)<textarea value={cookie} onChange={e=>setCookie(e.target.value)} placeholder="fragclip_session=..." /></label><button className="secondary" onClick={saveSettings}>Save settings</button></section></main>;
}
createRoot(document.getElementById('root')!).render(<App />);
