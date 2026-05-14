import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  full_name: z.string().trim().min(2, "Nom requis").max(100),
  age: z.coerce.number().int().min(5).max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export default function ParticipantForm({ sessionId, onReady, onBack }: { sessionId: string; onReady: (participantId: string) => void; onBack: () => void }) {
  const [form, setForm] = useState({ full_name: "", age: "", phone: "" });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? "Champs invalides");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from("participants").insert({
      session_id: sessionId,
      full_name: parsed.data.full_name,
      age: parsed.data.age,
      phone: parsed.data.phone || null,
    }).select("id").single();
    setLoading(false);
    if (error || !data) { setErr("Erreur d'enregistrement"); return; }
    onReady(data.id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary to-background flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-card border border-border rounded-2xl p-6 space-y-4 shadow-2xl">
        <h2 className="text-2xl text-center text-gradient-primary">Informations du participant</h2>
        <div>
          <label className="text-sm font-semibold">Nom et prénom *</label>
          <input className="w-full mt-1 px-3 py-2 rounded-lg bg-input border border-border text-foreground" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength={100} />
        </div>
        <div>
          <label className="text-sm font-semibold">Âge *</label>
          <input type="number" inputMode="numeric" className="w-full mt-1 px-3 py-2 rounded-lg bg-input border border-border text-foreground" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} min={5} max={120} />
        </div>
        <div>
          <label className="text-sm font-semibold">Téléphone (optionnel)</label>
          <input type="tel" inputMode="tel" className="w-full mt-1 px-3 py-2 rounded-lg bg-input border border-border text-foreground" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} />
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onBack} className="flex-1 py-3 rounded-xl bg-muted text-foreground font-bold">Retour</button>
          <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-gradient-gold text-accent-foreground font-bold uppercase glow-gold disabled:opacity-50">
            {loading ? "..." : "Jouer ⚽"}
          </button>
        </div>
      </form>
    </div>
  );
}