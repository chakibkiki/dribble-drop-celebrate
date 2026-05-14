import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { sessionStore } from "@/lib/sessionStore";
import { STORE_TYPE_LABEL, type StoreType } from "@/lib/quotaConfig";
import introImg from "@/assets/intro.png";

const schema = z.object({
  animator_name: z.string().trim().min(2, "Nom requis").max(100),
  wilaya: z.string().trim().min(2, "Wilaya requise").max(60),
  store_name: z.string().trim().min(2, "Nom du magasin requis").max(120),
  store_type: z.enum(["top_mt", "mt", "mm"]),
});

export default function AnimatorSetup({ onReady }: { onReady: (id: string) => void }) {
  const [form, setForm] = useState({ animator_name: "", wilaya: "", store_name: "", store_type: "top_mt" as StoreType });
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
    const { data, error } = await supabase.from("animator_sessions").insert(parsed.data).select("id").single();
    setLoading(false);
    if (error || !data) {
      setErr("Erreur lors de la création de la session");
      return;
    }
    sessionStore.set(data.id);
    onReady(data.id);
  };

  const pill = "w-full px-3 py-1.5 text-xs rounded-full bg-[#e63946] text-white placeholder:text-white/95 placeholder:font-bold text-center font-bold shadow-[0_3px_0_rgba(0,0,0,0.25)] border border-white focus:outline-none focus:ring-2 focus:ring-white/40";

  return (
    <div className="relative h-screen w-full bg-[#0a2a6e] overflow-hidden">
      {/* Background unique */}
      <img
        src={introImg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none scale-[0.7]"
      />

      {/* Formulaire centré */}
      <div className="relative h-screen flex items-center justify-center px-6 z-10">
        <form onSubmit={submit} className="w-full max-w-[280px] space-y-1.5 bg-transparent">
        <input
          className={pill}
          placeholder="Nom de l'Animateur"
          value={form.animator_name}
          onChange={(e) => setForm({ ...form, animator_name: e.target.value })}
          maxLength={100}
        />
        <input
          className={pill}
          placeholder="La Ville"
          value={form.wilaya}
          onChange={(e) => setForm({ ...form, wilaya: e.target.value })}
          maxLength={60}
        />
        <input
          className={pill}
          placeholder="Nom du Magasin"
          value={form.store_name}
          onChange={(e) => setForm({ ...form, store_name: e.target.value })}
          maxLength={120}
        />

        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
          {(["top_mt", "mt", "mm"] as StoreType[]).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setForm({ ...form, store_type: t })}
              className={`py-1 rounded-full border text-[10px] font-bold uppercase transition shadow-[0_2px_0_rgba(0,0,0,0.2)] ${
                form.store_type === t
                  ? "bg-white text-[#e63946] border-white"
                  : "bg-white/20 text-white border-white/70 backdrop-blur"
              }`}
            >
              {STORE_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-white text-center font-semibold drop-shadow">
          {form.store_type === "mm" ? "Quota : 60 cadeaux/jour" : "Quota : 80 cadeaux/jour"}
        </p>

        {err && (
          <p className="text-sm text-white bg-destructive/90 rounded-lg px-3 py-2 text-center font-semibold">{err}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-1.5 text-xs rounded-full bg-gradient-gold text-accent-foreground font-extrabold uppercase tracking-wider glow-gold disabled:opacity-50 shadow-[0_3px_0_rgba(0,0,0,0.25)] border border-white"
        >
          {loading ? "..." : "Démarrer la journée"}
        </button>
      </form>
      </div>
    </div>
  );
}