import type { StoreType } from "./quotaConfig";

export type LocalSession = {
  id: string;
  animator_name: string;
  wilaya: string;
  store_name: string;
  store_type: StoreType;
  started_at: string;
  closed_at: string | null;
};

export type LocalParticipant = {
  id: string;
  session_id: string;
  full_name: string;
  age: number;
  phone: string | null;
  created_at: string;
};

export type LocalPrize = {
  id: string;
  session_id: string;
  participant_id: string;
  tier: 1 | 2 | 3;
  gift_key: string;
  gift_label: string;
  attempt_number: number;
  created_at: string;
};

const K_SESSIONS = "plinko_local_sessions";
const K_PARTS = "plinko_local_participants";
const K_PRIZES = "plinko_local_prizes";

const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36));

const read = <T>(k: string): T[] => {
  try { return JSON.parse(localStorage.getItem(k) ?? "[]"); } catch { return []; }
};
const write = <T>(k: string, v: T[]) => localStorage.setItem(k, JSON.stringify(v));

export const localStore = {
  // Sessions
  createSession(input: Omit<LocalSession, "id" | "started_at" | "closed_at">): LocalSession {
    const s: LocalSession = {
      id: uid(),
      ...input,
      started_at: new Date().toISOString(),
      closed_at: null,
    };
    const all = read<LocalSession>(K_SESSIONS);
    all.push(s);
    write(K_SESSIONS, all);
    return s;
  },
  getSession(id: string): LocalSession | null {
    return read<LocalSession>(K_SESSIONS).find((s) => s.id === id) ?? null;
  },
  closeSession(id: string) {
    const all = read<LocalSession>(K_SESSIONS);
    const i = all.findIndex((s) => s.id === id);
    if (i >= 0) { all[i].closed_at = new Date().toISOString(); write(K_SESSIONS, all); }
  },

  // Participants
  createParticipant(input: Omit<LocalParticipant, "id" | "created_at">): LocalParticipant {
    const p: LocalParticipant = { id: uid(), created_at: new Date().toISOString(), ...input };
    const all = read<LocalParticipant>(K_PARTS);
    all.push(p);
    write(K_PARTS, all);
    return p;
  },
  listParticipants(sessionId: string): LocalParticipant[] {
    return read<LocalParticipant>(K_PARTS)
      .filter((p) => p.session_id === sessionId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  // Prizes
  createPrize(input: Omit<LocalPrize, "id" | "created_at">): LocalPrize {
    const p: LocalPrize = { id: uid(), created_at: new Date().toISOString(), ...input };
    const all = read<LocalPrize>(K_PRIZES);
    all.push(p);
    write(K_PRIZES, all);
    return p;
  },
  listPrizes(sessionId: string): LocalPrize[] {
    return read<LocalPrize>(K_PRIZES)
      .filter((p) => p.session_id === sessionId)
      .sort((a, b) => a.attempt_number - b.attempt_number);
  },
  countPrizes(sessionId: string): number {
    return read<LocalPrize>(K_PRIZES).filter((p) => p.session_id === sessionId).length;
  },
  giftCounts(sessionId: string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const p of read<LocalPrize>(K_PRIZES)) {
      if (p.session_id === sessionId) counts[p.gift_key] = (counts[p.gift_key] ?? 0) + 1;
    }
    return counts;
  },
};