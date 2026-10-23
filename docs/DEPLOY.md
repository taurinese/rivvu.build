# Déploiement (Cloudflare Pages)

Rivvu est un site statique : `pnpm build` produit `dist/`, servi tel quel.

## Brancher le dépôt (une fois)

1. Tableau de bord Cloudflare → **Workers & Pages** → **Créer** → **Pages** → **Connecter à Git** → dépôt `taurinese/rivvu.build`.
2. Réglages de build :
   - Branche de production : `main`.
   - Préréglage de framework : **Aucun**.
   - Commande de build : `pnpm build`.
   - Répertoire de sortie : `dist`.
   - Variable d'environnement : `NODE_VERSION` = `22` (pnpm est fourni par le champ `packageManager` de `package.json`).
3. Enregistrer : chaque push sur `main` déploie la production, et chaque PR reçoit une URL de prévisualisation.
4. Domaine : **Domaines personnalisés** → `rivvu.build` (et `www.rivvu.build` en redirection).

## Ce que le dépôt fournit déjà

- `public/_redirects` : toutes les routes renvoient `index.html` (navigation côté client, liens `/builds/…` et `/partage#…`).
- `public/_headers` :
  - politique de sécurité stricte : tout vient du site lui-même, l'OCR a besoin de `wasm-unsafe-eval` ;
  - `X-Frame-Options` et `Referrer-Policy` ;
  - cache d'un an pour `/assets/*` et d'une semaine pour `/ocr/*`.

  `vite preview` applique les mêmes en-têtes : la suite E2E vérifie l'app sous cette politique et échoue en cas de violation.

- Le moteur et les langues OCR sont copiés dans `dist/ocr/` au build (environ 15 Mo, chargés seulement à l'import d'une capture). Aucun fichier ne dépasse la limite de 25 Mio par fichier de Cloudflare Pages.

## Vérifier après le premier déploiement

- Ouvrir un lien profond (`/builds/<id>`) directement : la page doit s'afficher (pas de 404).
- Importer une capture d'Écho : la lecture doit aboutir (ressources `/ocr/` servies).
- Partager un build et ouvrir le lien en navigation privée.
