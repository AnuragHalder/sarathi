// Guest chats live only in this browser (localStorage) until the visitor signs in.
import type { Style } from "./styles";

export type ChatMsg = { role: "user" | "assistant"; content: string; style?: Style; crisis?: boolean };
export type GuestChat = { id: string; title: string; style: Style; updatedAt: string; messages: ChatMsg[] };

const KEY = "sarathi-guest-chats";
export const GUEST_CHAT_LIMIT = 3;

export function listGuestChats(): GuestChat[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeAll(chats: GuestChat[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(chats));
  } catch {}
}

export function saveGuestChat(chat: GuestChat) {
  const all = listGuestChats().filter((c) => c.id !== chat.id);
  writeAll([chat, ...all]);
}

export function deleteGuestChat(id: string) {
  writeAll(listGuestChats().filter((c) => c.id !== id));
}

export function clearGuestChats() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export const titleFrom = (text: string) => {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 60 ? t.slice(0, 57).trimEnd() + "…" : t || "New conversation";
};
