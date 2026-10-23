# Avancement

Journal de bord : une session neuve doit pouvoir reprendre le travail en lisant ce fichier.

## Jalons

| Jalon                                            | Statut  |
| ------------------------------------------------ | ------- |
| M0 — Socle, outillage, CI                        | terminé |
| M1 — Moteur de stats + données du jeu            | terminé |
| M2 — Design system + coquille de l'app           | terminé |
| M3 — Parcours Résonateur → Arme → Forte → Chaîne | à faire |
| M4 — Éditeur d'Échos + inventaire                | à faire |
| M5 — Équipe, buffs, calcul de dégâts             | à faire |
| M6 — Comparateur, partage URL, export image      | à faire |
| M7 — Optimiseur, planificateur, import OCR       | à faire |

## Journal

### M0 — Socle

- Stack posée (ADR 0001), persistance décidée (ADR 0002).
- Outillage : TypeScript strict, ESLint strict + a11y, Prettier, lefthook, Vitest (projets unit/dom/data, seuils de couverture), Playwright desktop + mobile avec axe.
- CI GitHub Actions : qualité (types, lint, format, tests + couverture, build, budget bundle) + E2E ; CodeQL ; Renovate.
- Tokens de design (sombre + clair) extraits du canevas.

### M1 — Données + moteur

- Import automatique du wiki (`pnpm data:import`) : 51 Résonateurs, 124 armes, 187 Échos, 37 ensembles, courbes de niveau, ~480 images WebP.
- Moteur pur `src/domain/` : stats de base par palier, règles des Échos (coût, stats principales, paliers de sous-stats, comptage des ensembles), agrégation des stats finales, formule de dégâts du wiki.
- Tests de référence : Jiyan niv. 90 et Sommet verdoyant niv. 90 retrouvent exactement les valeurs du wiki ; courbes vérifiées contre toutes les tables publiées.

### M2 — Design system, coquille, persistance

- Persistance : port `BuildRepository` + adaptateur localStorage (révisions, suppression logique, migrations, quarantaine, synchro entre onglets).
- Stores Zustand (builds, réglages/thème), modèle `Build` dans le domaine.
- Composants HIG : Button, IconButton, SegmentedControl (clavier), Stepper, Toggle, Card, GroupedList, Pill, SearchField, ProgressRing, Page, icônes.
- Coquille : barre latérale desktop, barre d'onglets mobile, routes `/`, `/nouveau`, `/builds/:id`, `/reglages`.
- Sélecteur de Résonateur (filtres attribut/arme, recherche FR/EN, aperçu illustré), liste des builds, fiche (bandeau immersif, renommage, suppression), réglages (thème).
- E2E : création → rechargement → suppression, thème, axe sur chaque page, desktop + mobile.

## Prochaine étape

M3 : niveau/ascension, arme (sélecteur + rang), Forte, Chaîne, stats finales sur la fiche.

## Décisions en attente (côté utilisateur)

- Branchement de Cloudflare Pages (previews par PR + production) : en fin de projet.
- Protection de la branche `main` (checks requis) : à activer dans les réglages GitHub (le proxy de session interdit de le faire).
- Bonus de stats du Forte : absents du wiki. Options : autoriser une source de données structurée (ex. dump du jeu) ou saisie vérifiée en jeu.
