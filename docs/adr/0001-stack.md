# ADR 0001 — Stack technique

- Statut : acceptée
- Date : 2026-10-23

## Contexte

Rivvu est une application web riche et interactive (builder), sans backend en V1, qui doit être fluide sur desktop et mobile, testable de bout en bout et déployable sur Cloudflare Pages.

## Décision

| Besoin      | Choix                                                                          | Raison                                                        |
| ----------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Build / dev | Vite 8                                                                         | Rapide, standard, sortie statique compatible Cloudflare Pages |
| UI          | React 19 + TypeScript 6.0 `strict`                                             | Écosystème, typage fort (`noUncheckedIndexedAccess`)          |
| Routing     | React Router 7 (mode bibliothèque)                                             | Simple, mature, URL partageables                              |
| État        | Zustand                                                                        | Store minimal, sans boilerplate, testable hors React          |
| Validation  | Zod 4                                                                          | Schémas des données du jeu et des builds persistés            |
| Styles      | CSS Modules + tokens CSS                                                       | Aucun runtime, tokens issus du canevas de design              |
| Tests       | Vitest 5 (+ Testing Library, fast-check), Playwright + axe                     | Unitaires, propriétés, composants, E2E, a11y, visuel          |
| Qualité     | ESLint 9 (typescript-eslint strict, jsx-a11y, react-hooks), Prettier, lefthook | Règles bloquantes en pre-commit et en CI                      |
| Paquets     | pnpm 10, Node 22                                                               | Lockfile strict, rapide                                       |

## Conséquences

- TypeScript est limité à `<6.1` tant que typescript-eslint ne le supporte pas (Renovate configuré en conséquence).
- Pas de SSR : contenu 100 % client. Le SEO des pages de partage sera traité plus tard (pré-rendu ou fonction Cloudflare) si besoin.

- `exactOptionalPropertyTypes` a été retiré : incompatible avec le typage des CSS Modules et de React Router (props `className` optionnelles), pour un gain faible.
