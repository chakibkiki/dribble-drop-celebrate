import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QUOTAS, STORE_TYPE_LABEL, type StoreType, GIFTS } from "@/lib/quotaConfig";
import { sessionStore } from "@/lib/sessionStore";
import * as XLSX from "xlsx";

type Session = { id: string; animator_name: string; wilaya: string; store_name: string; store_type: StoreType; started_at: string };

export default function Dashboard({ sessionId, onPlay, onClosed }: { sessionId: string; onPlay: () => void; onClosed: () => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [distributed, setDistributed] = useState<Record<string, number>>({});
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [closing, setClosing] = useState(false);

  const refresh = async () => {
    const { data: s } = await supabase.from("animator_sessions").select("*").eq("id", sessionId).maybeSingle();
    if (s) setSession(s as Session);
    const { data: prizes } = await supabase.from("prize_distributions").select("gift_key").eq("session_id", sessionId);
    const counts: Record<string, number> = {};
    (prizes ?? []).forEach((p) => { counts[p.gift_key] = (counts[p.gift_key] ?? 0) + 1; });
    setDistributed(counts);
    setTotalAttempts((prizes ?? []).length);
  };

  useEffect(() => { refresh(); }, [sessionId]);

  const closeDay = async () => {
    if (!session) return;
    if (!confirm("Clôturer la journée et télécharger le fichier Excel ?")) return;
    setClosing(true);

    const { data: participants } = await supabase.from("participants").select("*").eq("session_id", sessionId).order("created_at");
    const { data: prizes } = await supabase.from("prize_distributions").select("*").eq("session_id", sessionId).order("attempt_number");
    const partMap = new Map((participants ?? []).map((p: any) => [p.id, p]));

    const wb = XLSX.utils.book_new();

    // Onglet 1 : Résumé
    const summary = [
      ["Animateur", session.animator_name],
      ["Wilaya", session.wilaya],
      ["Magasin", session.store_name],
      ["Type magasin", STORE_TYPE_LABEL[session.store_type]],
      ["Date démarrage", new Date(session.started_at).toLocaleString("fr-FR")],
      ["Date clôture", new Date().toLocaleString("fr-FR")],
      ["Total cadeaux distribués", (prizes ?? []).length],
      [],
      ["Cadeau", "Distribués", "Quota initial", "Restant"],
      ...Object.values(GIFTS).map((g) => {
        const dist = (prizes ?? []).filter((p: any) => p.gift_key === g.key).length;
        const init = QUOTAS[session.store_type].stocks[g.key] ?? 0;
        return [g.label, dist, init, init - dist];
      }),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Résumé");

    // Onglet 2 : Cadeaux + clients
    const rows = (prizes ?? []).map((p: any) => {
      const part: any = partMap.get(p.participant_id);
      return {
        "N° essai": p.attempt_number,
        "Heure": new Date(p.created_at).toLocaleString("fr-FR"),
        "Client": part?.full_name ?? "",
        "Âge": part?.age ?? "",
        "Téléphone": part?.phone ?? "",
        "Palier": p.tier,
        "Cadeau": p.gift_label,
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Cadeaux distribués");

    // Onglet 3 : Tous participants
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((participants ?? []).map((p: any) => ({
      "Heure": new Date(p.created_at).toLocaleString("fr-FR"),
      "Nom": p.full_name,
      "Âge": p.age,
      "Téléphone": p.phone ?? "",
    }))), "Participants");

    const fname = `Plinko_${session.store_name.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fname);

    await supabase.from("animator_sessions").update({ closed_at: new Date().toISOString() }).eq("id", sessionId);
    sessionStore.clear();
    setClosing(false);
    onClosed();
  };

  if (!session) return <div className="min-h-screen flex items-center justify-center text-foreground">Chargement…</div>;

  const cfg = QUOTAS[session.store_type];
  const remaining = cfg.total - totalAttempts;

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary to-background p-4 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-4">
        <header className="bg-card border border-border rounded-2xl p-4">
          <h1 className="text-2xl text-gradient-primary">Plinko ISIS — {STORE_TYPE_LABEL[session.store_type]}</h1>
          <p className="text-sm text-muted-foreground">{session.animator_name} · {session.store_name} · {session.wilaya}</p>
        </header>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Distribués" value={totalAttempts} />
          <Stat label="Restants" value={remaining} />
          <Stat label="Quota total" value={cfg.total} />
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h3 className="font-bold mb-2">Stock par cadeau</h3>
          {Object.values(GIFTS).map((g) => {
            const init = cfg.stocks[g.key];
            const used = distributed[g.key] ?? 0;
            const left = init - used;
            return (
              <div key={g.key} className="flex justify-between text-sm">
                <span className="text-muted-foreground">P{g.tier} · {g.label}</span>
                <span className={left === 0 ? "text-destructive font-bold" : "text-foreground font-semibold"}>{left} / {init}</span>
              </div>
            );
          })}
        </div>

        <button onClick={onPlay} disabled={remaining <= 0} className="w-full py-4 rounded-2xl bg-gradient-gold text-accent-foreground text-lg font-bold uppercase glow-gold disabled:opacity-40">
          {remaining <= 0 ? "Quota atteint" : "🎮 Nouveau participant"}
        </button>

        <button onClick={closeDay} disabled={closing} className="w-full py-3 rounded-2xl bg-destructive text-destructive-foreground font-bold uppercase disabled:opacity-50">
          {closing ? "Génération…" : "📊 Clôturer & Exporter Excel"}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3 text-center">
      <div className="text-2xl font-bold text-gradient-primary">{value}</div>
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
    </div>
  );
}