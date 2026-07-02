// Anonymous commenter identity, stored in the browser (no account required).
// - display name: shown next to comments
// - author token: a per-browser secret that proves ownership for edit/delete

const NAME_KEY = "schemnotes:name";
const TOKEN_KEY = "schemnotes:token";

export function getDisplayName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(NAME_KEY);
}

export function setDisplayName(name: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NAME_KEY, name.trim());
}

export function getAuthorToken(): string {
  if (typeof window === "undefined") return "";
  let token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    window.localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}
