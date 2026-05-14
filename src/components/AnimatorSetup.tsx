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

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-end p-4 overflow-y-auto bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${introImg})` }}
    >
      <form onSubmit={submit} className="w-full max-w-md bg-card/95 backdrop-blur border border-border rounded-2xl p-6 space-y-4 shadow-2xl mt-4 mb-4">
        <h2 className="text-2xl text-center text-gradient-primary">Démarrage Animateur</h2>
        <p className="text-center text-sm text-muted-foreground -mt-2">Renseignez vos informations pour commencer la journée</p>

        <div>
          <label className="text-sm font-semibold">Nom et prénom *</label>
          <input className="w-full mt-1 px-3 py-2 rounded-lg bg-input border border-border text-foreground" value={form.animator_name} onChange={(e) => setForm({ ...form, animator_name: e.target.value })} maxLength={100} />
        </div>
        <div>
          <label className="text-sm font-semibold">Wilaya *</label>
          <input className="w-full mt-1 px-3 py-2 rounded-lg bg-input border border-border text-foreground" value={form.wilaya} onChange={(e) => setForm({ ...form, wilaya: e.target.value })} maxLength={60} />
        </div>
        <div>
          <label className="text-sm font-semibold">Nom du magasin *</label>
          <input className="w-full mt-1 px-3 py-2 rounded-lg bg-input border border-border text-foreground" value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} maxLength={120} />
        </div>
        <div>
          <label className="text-sm font-semibold">Type de magasin *</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {(["top_mt", "mt", "mm"] as StoreType[]).map((t) => (
              <button type="button" key={t} onClick={() => setForm({ ...form, store_type: t })} className={`py-2 rounded-lg border text-sm font-bold transition ${form.store_type === t ? "bg-primary text-primary-foreground border-primary" : "bg-input border-border text-foreground"}`}>
                {STORE_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{form.store_type === "mm" ? "Quota : 60 cadeaux/jour" : "Quota : 80 cadeaux/jour"}</p>
        </div>

        {err && <p className="text-sm text-destructive">{err}</p>}

        <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-gold text-accent-foreground font-bold uppercase tracking-wider glow-gold disabled:opacity-50">
          {loading ? "..." : "Démarrer la journée"}
        </button>
      </form>
    </div>
  );
}