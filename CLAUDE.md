# Rivvu — instructions pour les agents

Builder Wuthering Waves (rivvu.build). App web React + TypeScript, interface en français, design Apple HIG en mode sombre (clair supporté).
Guide complet : `docs/GUIDE.md`. Avancement et prochaine étape : `docs/PROGRESS.md`. Décisions : `docs/adr/`.

## Commandes

- `pnpm dev` : serveur de dev
- `pnpm test` : tests unitaires, composants, données (Vitest, projets `unit` / `dom` / `data`)
- `pnpm test:coverage` : idem avec seuils (domaine ≥ 95 %, global ≥ 80 %)
- `pnpm test:e2e` : Playwright (desktop 1440 + iPhone), axe a11y
- `pnpm check` : tout ce que fait la CI hors E2E. À lancer avant chaque PR.
- `pnpm typecheck`, `pnpm lint`, `pnpm format`
- `pnpm data:import` : réimporte les données du jeu depuis le wiki (voir `docs/DATA.md` ; en session cloud, préfixer par `NODE_USE_ENV_PROXY=1`)

## Règles

1. **TDD** : test d'abord, le voir échouer, puis coder. Ne jamais affaiblir un test pour le faire passer.
2. **`src/domain/` est pur** : aucun import de React, `@/ui`, `@/features`, `@/app` (règle ESLint). Toute formule de jeu vit là, avec tests.
3. **Données du jeu** : jamais codées en dur dans l'UI. Générées par `scripts/import-game-data.ts` dans `src/data/game/` (ne pas éditer à la main), validées par Zod. Ne jamais inventer une valeur : entrée écartée ou placeholder + issue. Détails : `docs/DATA.md`.
4. **Design** : uniquement les tokens de `src/ui/tokens.css` (aucune couleur en dur dans les composants). Cibles tactiles ≥ 44 px, WCAG AA, `prefers-reduced-motion`, sombre et clair.
5. **Persistance** : uniquement via l'interface `BuildRepository` (ADR 0002). Jamais d'accès direct à `localStorage` hors de l'adaptateur.
6. **Git** : branche `feat|fix|chore/…` depuis `main`, commits conventionnels, PR avec le template, squash merge. Jamais de push direct sur `main`.
7. **Fin de PR** : mettre à jour `docs/PROGRESS.md`.

## Pièges connus

- TypeScript est figé en `~6.0` (typescript-eslint ne supporte pas encore ≥ 6.1).
- `@playwright/test` est figé sur la version des navigateurs préinstallés de l'environnement cloud (1.63.0).
- Les espaces fines insécables (U+202F) s'écrivent ` ` dans le code (ESLint `no-irregular-whitespace`).
- Images du jeu : `public/assets/` (WebP), © Kuro Games, jamais de hotlink vers le wiki.
