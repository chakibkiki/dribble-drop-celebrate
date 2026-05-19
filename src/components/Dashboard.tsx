import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QUOTAS, STORE_TYPE_LABEL, type StoreType, GIFTS } from "@/lib/quotaConfig";
import { sessionStore } from "@/lib/sessionStore";
import * as XLSX from "xlsx";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";

type Session = { id: string; animator_name: string; wilaya: string; store_name: string; store_type: StoreType; started_at: string };

export default function Dashboard({ sessionId, onPlay, onClosed }: { sessionId: string; onPlay: () => void; onClosed: () => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [distributed, setDistributed] = useState<Record<string, number>>({});
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [closing, setClosing] = useState(false);
  const [exporting, setExporting] = useState(false);

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
    if (!confirm("Clôturer la journée et télécharger l'historique cumulatif ?")) return;
    setClosing(true);

    const { data: participants } = await supabase.from("participants").select("*").eq("session_id", sessionId).order("created_at");
    const { data: prizes } = await supabase.from("prize_distributions").select("*").eq("session_id", sessionId).order("attempt_number");
    const partMap = new Map((participants ?? []).map((p: any) => [p.id, p]));

    // === Construction de l'entrée du jour ===
    const dayKey = new Date(session.started_at).toISOString().slice(0, 10);
    const cfg = QUOTAS[session.store_type];
    const giftStats = Object.values(GIFTS).map((g) => {
      const dist = (prizes ?? []).filter((p: any) => p.gift_key === g.key).length;
      const init = cfg.stocks[g.key] ?? 0;
      return { key: g.key, label: g.label, tier: g.tier, dist, init, rest: init - dist };
    });
    const dayEntry = {
      date: dayKey,
      started_at: session.started_at,
      closed_at: new Date().toISOString(),
      animator: session.animator_name,
      wilaya: session.wilaya,
      store_name: session.store_name,
      store_type: session.store_type,
      total: (prizes ?? []).length,
      giftStats,
      prizes: (prizes ?? []).map((p: any) => {
        const part: any = partMap.get(p.participant_id);
        return {
          attempt: p.attempt_number,
          time: p.created_at,
          client: part?.full_name ?? "",
          age: part?.age ?? "",
          phone: part?.phone ?? "",
          tier: p.tier,
          gift: p.gift_label,
        };
      }),
      participants: (participants ?? []).map((p: any) => ({
        time: p.created_at, name: p.full_name, age: p.age, phone: p.phone ?? "",
      })),
    };

    // === Historique cumulatif en localStorage ===
    const histKey = `plinko_history_${session.store_name.replace(/[^a-z0-9]/gi, "_")}`;
    const raw = localStorage.getItem(histKey);
    const history: typeof dayEntry[] = raw ? JSON.parse(raw) : [];
    // Remplace l'éventuelle entrée du même jour, sinon ajoute
    const idx = history.findIndex((h) => h.date === dayKey);
    if (idx >= 0) history[idx] = dayEntry; else history.push(dayEntry);
    history.sort((a, b) => a.date.localeCompare(b.date));
    localStorage.setItem(histKey, JSON.stringify(history));

    // === Génération du fichier Excel cumulatif ===
    const wb = XLSX.utils.book_new();

    // Onglet "Résumé global" : une ligne par jour + totaux par cadeau
    const giftKeys = Object.values(GIFTS);
    const globalHeader = ["Date", "Magasin", "Animateur", "Total distribués", ...giftKeys.map((g) => g.label)];
    const globalRows: any[][] = [globalHeader];
    history.forEach((h) => {
      globalRows.push([
        h.date, h.store_name, h.animator, h.total,
        ...giftKeys.map((g) => h.giftStats.find((s) => s.key === g.key)?.dist ?? 0),
      ]);
    });
    // Totaux
    globalRows.push([]);
    globalRows.push([
      "TOTAL", "", "", history.reduce((s, h) => s + h.total, 0),
      ...giftKeys.map((g) => history.reduce((s, h) => s + (h.giftStats.find((x) => x.key === g.key)?.dist ?? 0), 0)),
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(globalRows), "Résumé global");

    // Un onglet par journée
    history.forEach((h) => {
      const sheet: any[][] = [
        ["Animateur", h.animator],
        ["Wilaya", h.wilaya],
        ["Magasin", h.store_name],
        ["Type magasin", STORE_TYPE_LABEL[h.store_type as StoreType]],
        ["Démarrage", new Date(h.started_at).toLocaleString("fr-FR")],
        ["Clôture", new Date(h.closed_at).toLocaleString("fr-FR")],
        ["Total cadeaux distribués", h.total],
        [],
        ["Cadeau", "Distribués", "Quota initial", "Restant"],
        ...h.giftStats.map((s) => [s.label, s.dist, s.init, s.rest]),
        [],
        ["N° essai", "Heure", "Client", "Âge", "Téléphone", "Palier", "Cadeau"],
        ...h.prizes.map((p) => [p.attempt, new Date(p.time).toLocaleString("fr-FR"), p.client, p.age, p.phone, p.tier, p.gift]),
      ];
      const safeName = h.date.replace(/[^0-9-]/g, "").slice(0, 31) || "Journée";
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet), safeName);
    });

    const fname = `Historique_Stocks_${session.store_name.replace(/[^a-z0-9]/gi, "_")}.xlsx`;
    if (Capacitor.isNativePlatform()) {
      // App native : écriture directe dans Documents/PlinkoISIS (écrase à chaque clôture)
      const b64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const folder = "PlinkoISIS";
      try {
        await Filesystem.mkdir({ path: folder, directory: Directory.Documents, recursive: true });
      } catch { /* dossier déjà existant */ }
      const res = await Filesystem.writeFile({
        path: `${folder}/${fname}`,
        data: b64,
        directory: Directory.Documents,
        encoding: undefined as unknown as Encoding, // base64 binaire
        recursive: true,
      });
      alert(`Historique enregistré sur la tablette :\n${res.uri}`);
    } else {
      // Navigateur web : téléchargement classique
      XLSX.writeFile(wb, fname);
    }

    await supabase.from("animator_sessions").update({ closed_at: new Date().toISOString() }).eq("id", sessionId);
    sessionStore.clear();
    setClosing(false);
    onClosed();
  };

  const exportStockCsv = async () => {
    if (!session) return;
    setExporting(true);
    const cfg = QUOTAS[session.store_type];
    const header = ["Palier", "Cadeau", "Quota initial", "Distribué", "Restant"];
    const lines = [header.join(";")];
    Object.values(GIFTS).forEach((g) => {
      const init = cfg.stocks[g.key] ?? 0;
      const used = distributed[g.key] ?? 0;
      lines.push([`P${g.tier}`, g.label, init, used, init - used].join(";"));
    });
    lines.push("");
    lines.push(["", "TOTAL", cfg.total, totalAttempts, cfg.total - totalAttempts].join(";"));
    const csv = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Stock_${session.store_name.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
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

        <button onClick={onPlay} disabled={remaining <= 0} className="w-full py-4 rounded-2xl bg-gradient-gold text-accent-foreground text-lg font-bold uppercase glow-gold disabled:opacity-40">
          {remaining <= 0 ? "Quota atteint" : "🎮 Nouveau participant"}
        </button>

        <button onClick={exportStockCsv} disabled={exporting} className="w-full py-3 rounded-2xl bg-secondary text-secondary-foreground border border-border font-semibold uppercase text-sm disabled:opacity-50">
          {exporting ? "Export…" : "📥 Exporter la feuille des stocks (CSV)"}
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