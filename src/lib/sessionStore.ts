const KEY = "plinko_session_id";

export const sessionStore = {
  get: () => (typeof window !== "undefined" ? localStorage.getItem(KEY) : null),
  set: (id: string) => localStorage.setItem(KEY, id),
  clear: () => localStorage.removeItem(KEY),
};