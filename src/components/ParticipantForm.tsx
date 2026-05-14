import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import introImg from "@/assets/intro.png";

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

  const pill = "w-full px-6 py-3 rounded-full bg-[#e63946] text-white placeholder:text-white/95 placeholder:font-bold text-center font-bold shadow-[0_4px_0_rgba(0,0,0,0.25)] border-2 border-white focus:outline-none focus:ring-4 focus:ring-white/40";

  return (
    <div
      className="min-h-screen w-full bg-cover bg-top bg-no-repeat overflow-y-auto"
      style={{ backgroundImage: `url(${introImg})` }}
    >
      <div className="h-[72vh] min-h-[520px]" />

      <form onSubmit={submit} className="w-full max-w-md mx-auto px-6 pb-8 space-y-3">
        <input
          className={pill}
          placeholder="Nom et prénom"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          maxLength={100}
        />
        <input
          type="number"
          inputMode="numeric"
          className={pill}
          placeholder="Âge"
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value })}
          min={5}
          max={120}
        />
        <input
          type="tel"
          inputMode="tel"
          className={pill}
          placeholder="Téléphone (optionnel)"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          maxLength={30}
        />

        {err && (
          <p className="text-sm text-white bg-destructive/90 rounded-lg px-3 py-2 text-center font-semibold">{err}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 py-3 rounded-full bg-white/20 text-white border-2 border-white/70 backdrop-blur font-bold uppercase shadow-[0_3px_0_rgba(0,0,0,0.2)]"
          >
            Retour
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-[2] py-3 rounded-full bg-gradient-gold text-accent-foreground font-extrabold uppercase tracking-wider glow-gold disabled:opacity-50 shadow-[0_4px_0_rgba(0,0,0,0.25)] border-2 border-white"
          >
            {loading ? "..." : "Jouer ⚽"}
          </button>
        </div>
      </form>
    </div>
  );
}