## Plinko ISIS — Refonte complète

### Flux de l'application

```
[Démarrage] 
   → [Setup Animateur (1x/jour)]
        Nom + Wilaya + Magasin + Type (Top MT / MT / MM)
   → [Dashboard animateur]
        - Bouton "Nouveau participant"
        - Compteur essais / quotas restants
        - Bouton "Clôturer la journée" → export Excel
   → [Formulaire Participant]
        Nom + Âge (obligatoires) + Téléphone (optionnel)
   → [Jeu Plinko 5 cases]
        Case bord = Palier 2 (x2) | Centre = Palier 3 | Intermédiaires = Palier 1 (x2)
   → [Affichage cadeau gagné]
        Image + nom du cadeau, retour dashboard
```

### Cadeaux & quotas (depuis l'Excel)

| Magasin | Total/j | P1 (Produit 300g + Bracelet) | P2 (Magnet + Sac TNT) | P3 (T-shirt + Sac à dos) |
|---|---|---|---|---|
| Top MT | 80 | 40 + 20 | 12 + 5 | 2 + 1 |
| MT | 80 | 40 + 20 | 12 + 5 | 2 + 1 |
| MM | 60 | 28 + 16 | 9 + 4 | 2 + 1 |

### Algorithme d'attribution (probabilité progressive)

À chaque essai, on calcule un score pondéré par palier :
- Stock restant du palier
- Pour P3 : multiplicateur de probabilité = 0 avant le seuil (40 pour TopMT/MT, 35 pour MM), puis croît linéairement vers 1 jusqu'à la fin de journée
- Tirage pondéré aléatoire parmi les paliers ayant du stock
- Une fois le palier choisi, tirage aléatoire entre les cadeaux du palier (proportionnel au stock)
- Le ballon est ensuite physiquement guidé vers la case correspondante (force appliquée discrètement par Matter.js)

Si tous les stocks d'un palier sont épuisés, le ballon va dans une case d'un palier disponible.

### Backend (Lovable Cloud)

Tables :
- `animator_sessions` : id, animator_name, wilaya, store_name, store_type, started_at, closed_at
- `participants` : id, session_id, full_name, age, phone, created_at
- `prize_distributions` : id, session_id, participant_id, tier (1/2/3), gift_name, gift_image, attempt_number, created_at

Politique RLS : public (pas d'auth utilisateur — l'app tourne sur tablette en mode kiosk). Les sessions sont identifiées par un ID stocké en localStorage côté tablette.

Edge function `export-session-excel` : reçoit `session_id`, génère un .xlsx (xlsx lib npm) avec onglets Participants + Cadeaux distribués + Résumé, renvoie en base64 pour téléchargement direct.

### Écrans / composants

- `pages/Index.tsx` — routeur d'état (setup / dashboard / form / game / result)
- `components/AnimatorSetup.tsx` — formulaire 1er lancement
- `components/Dashboard.tsx` — état journalier + bouton clôture
- `components/ParticipantForm.tsx` — formulaire client
- `components/PlinkoGame.tsx` — terrain de foot vertical, 5 cases, ballon guidé
- `components/PrizeReveal.tsx` — écran "Bravo, vous avez gagné" avec image
- `lib/giftAlgorithm.ts` — logique de tirage pondéré
- `lib/quotaConfig.ts` — quotas par type de magasin

### Visuels

- Terrain de foot vert vertical (ressemble à `Page_02.png`)
- Cases en bas étiquetées Palier 01 / Palier 02 / GOAL!
- Écran Bravo bleu avec joueur algérien (réutilise les images uploadées)
- Cadeaux : placeholders pour le moment, l'utilisateur enverra les images réelles

### Détails techniques

- Validation des formulaires avec zod
- Pas d'auth (kiosk mode), session animateur identifiée par localStorage + DB
- Export Excel via lib `xlsx` dans une edge function
- Quota recalculé à chaque tirage côté serveur via une RPC SQL pour éviter les conflits
- Réinitialisation auto à la clôture (insertion d'une nouvelle session le lendemain)

### Ce qui reste à faire après ce premier build

- Remplacer les images placeholder par les vraies photos cadeaux que vous enverrez
- Ajuster les seuils P3 si besoin après tests réels
- Optionnel : QR code, son, confettis, animation joueur
