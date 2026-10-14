const API = import.meta.env.VITE_API_URL;

// The chat only lasts for this browser tab/session (closing the tab or browser ends it).
// The customer gets a short reference code (e.g. WN-7F3K2) to rejoin the same chat later.
const TOKEN_KEY = 'wnwrecker_chat_token';
const REF_KEY = 'wnwrecker_chat_ref';

// older versions kept the chat forever in localStorage — clear that once
try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }

export function getChatSession(): { token: string | null; reference: string | null } {
  try {
    return { token: sessionStorage.getItem(TOKEN_KEY), reference: sessionStorage.getItem(REF_KEY) };
  } catch {
    return { token: null, reference: null };
  }
}

export function saveChatSession(token: string, reference: string | null) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    if (reference) sessionStorage.setItem(REF_KEY, reference);
  } catch { /* storage blocked — chat still works until the page reloads */ }
}

export function clearChatSession() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REF_KEY);
  } catch { /* ignore */ }
}

export async function startConversation(): Promise<{ token: string; reference: string | null }> {
  const res = await fetch(`${API}/api/chat/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: null, contact: null }),
  });
  if (!res.ok) throw new Error('Could not start a chat.');
  const data = await res.json();
  saveChatSession(data.token, data.reference ?? null);
  return { token: data.token as string, reference: (data.reference as string) ?? null };
}

// returns the current open chat, or starts a new one (a closed chat can't take new messages)
export async function ensureConversation(): Promise<string> {
  const { token } = getChatSession();
  if (token) {
    try {
      const res = await fetch(`${API}/api/chat/${token}`);
      if (res.ok) {
        const data = await res.json();
        if (!data.closed) return token;
      }
    } catch { /* fall through and start a new chat */ }
  }
  return (await startConversation()).token;
}

export async function rejoinConversation(code: string): Promise<{ token: string; reference: string | null }> {
  const res = await fetch(`${API}/api/chat/rejoin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (res.status === 404) throw new Error('No chat found with that reference code.');
  if (!res.ok) throw new Error('Could not rejoin the chat.');
  const data = await res.json();
  saveChatSession(data.token, data.reference ?? null);
  return { token: data.token as string, reference: (data.reference as string) ?? null };
}

export async function attachPart(token: string, partId: number) {
  await fetch(`${API}/api/chat/${token}/parts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partId }) });
}
export async function sendChatMessage(token: string, text: string) {
  await fetch(`${API}/api/chat/${token}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
}
export async function requestHuman(token: string) { await fetch(`${API}/api/chat/${token}/human`, { method: 'POST' }); }
export function openChat() { window.dispatchEvent(new CustomEvent('wn-open-chat')); }

// "Ask about this part" / cart enquiry: attach the parts, hand straight to a person, open the widget
export async function enquireAboutParts(parts: { id: number; label: string }[]) {
  const token = await ensureConversation();
  for (const p of parts) await attachPart(token, p.id);
  await requestHuman(token);
  const list = parts.map(p => `• ${p.label}`).join('\n');
  await sendChatMessage(token, `Hi, I'd like to enquire about:\n${list}`);
  openChat();
}
