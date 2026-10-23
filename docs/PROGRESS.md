# Avancement

Journal de bord : une session neuve doit pouvoir reprendre le travail en lisant ce fichier.

## Jalons

| Jalon                                            | Statut   |
| ------------------------------------------------ | -------- |
| M0 — Socle, outillage, CI                        | en cours |
| M1 — Moteur de stats + données du jeu            | à faire  |
| M2 — Design system + coquille de l'app           | à faire  |
| M3 — Parcours Résonateur → Arme → Forte → Chaîne | à faire  |
| M4 — Éditeur d'Échos + inventaire                | à faire  |
| M5 — Équipe, buffs, calcul de dégâts             | à faire  |
| M6 — Comparateur, partage URL, export image      | à faire  |
| M7 — Optimiseur, planificateur, import OCR       | à faire  |

## Journal

### M0 — Socle

- Stack posée (ADR 0001), persistance décidée (ADR 0002).
- Outillage : TypeScript strict, ESLint strict + a11y, Prettier, lefthook, Vitest (projets unit/dom/data, seuils de couverture), Playwright desktop + mobile avec axe.
- CI GitHub Actions : qualité (types, lint, format, tests + couverture, build, budget bundle) + E2E ; CodeQL ; Renovate.
- Tokens de design (sombre + clair) extraits du canevas.

## Prochaine étape

M1 : schémas des données du jeu, import depuis le wiki, moteur de stats.

## Décisions en attente (côté utilisateur)

- Branchement de Cloudflare Pages (previews par PR + production) : en fin de projet.
