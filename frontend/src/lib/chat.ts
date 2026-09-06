const API = import.meta.env.VITE_API_URL;
export const CHAT_TOKEN_KEY = 'wnwrecker_chat_token';

export async function ensureConversation(): Promise<string> {
  const existing = localStorage.getItem(CHAT_TOKEN_KEY);
  if (existing) return existing;
  const res = await fetch(`${API}/api/chat/start`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: null, contact: null }),
  });
  const data = await res.json();
  const token = data.token as string;
  localStorage.setItem(CHAT_TOKEN_KEY, token);
  return token;
}
export async function attachPart(token: string, partId: number) {
  await fetch(`${API}/api/chat/${token}/parts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partId }) });
}
export async function sendChatMessage(token: string, text: string) {
  await fetch(`${API}/api/chat/${token}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
}
export async function requestHuman(token: string) { await fetch(`${API}/api/chat/${token}/human`, { method: 'POST' }); }
export function openChat() { window.dispatchEvent(new CustomEvent('wn-open-chat')); }

export async function enquireAboutParts(parts: { id: number; label: string }[]) {
  const token = await ensureConversation();
  for (const p of parts) await attachPart(token, p.id);
  await requestHuman(token);   // hand straight to a person, no bot confusion
  const list = parts.map(p => `• ${p.label}`).join('\n');
  await sendChatMessage(token, `Hi, I'd like to enquire about:\n${list}`);
  openChat();
}