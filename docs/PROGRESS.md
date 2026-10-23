# Avancement

Journal de bord : une session neuve doit pouvoir reprendre le travail en lisant ce fichier.

## Jalons

| Jalon                                            | Statut  |
| ------------------------------------------------ | ------- |
| M0 — Socle, outillage, CI                        | terminé |
| M1 — Moteur de stats + données du jeu            | terminé |
| M2 — Design system + coquille de l'app           | terminé |
| M3 — Parcours Résonateur → Arme → Forte → Chaîne | terminé |
| M4 — Éditeur d'Échos + inventaire                | terminé |
| M5 — Équipe, buffs, calcul de dégâts             | terminé |
| M6 — Comparateur, partage URL, export image      | terminé |
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

### M3 — Étapes du build

- Fiche : panneau en verre dépoli (niveau par paliers d'ascension, Chaîne S0–S6, arme), navigation par étapes avec avancement, cartes Échos / Forte / Statistiques (base ou finales) / Repères.
- Pages : arme (armes du bon type, niveau, syntonisation R1–R5, passif avec valeurs du rang), Forte (1–10), changement de Résonateur (arme retirée si type incompatible).
- Surfaces d'illustration toujours sombres (lisibles en thème clair), restauration du défilement à chaque page.
- Leçon : la PR M2 a échoué en CI sur le seuil de couverture faute d'avoir lancé `pnpm check` complet avant de pousser ; M2 et M3 sont livrés ensemble. Toujours lancer `pnpm check` avant une PR.

### M4 — Échos

- Éditeur : emplacements ordonnés (le premier = Écho principal), sélecteur d'espèce (recherche FR/EN, coût, ensemble, coût restant), ensemble par Écho, stat principale limitée au coût, sous-stats par paliers du jeu (boutons), qualité du jet, valeur crit., alertes de validation, ensembles actifs, apport sur les stats.
- Inventaire d'Échos réutilisables (`rivvu:v1:echoes`, même modèle prêt pour la synchro) : enregistrement depuis un build, ajout depuis l'inventaire, page « Échos » avec les builds qui les utilisent.
- Feuille modale accessible (`ui/Sheet`) : focus capturé, Échap, focus rendu.
- Données : nettoyage des noms (guillemet parasite « Nuages lunaires" »), test de non-régression sur tous les noms ; Prettier lancé après chaque import.

### M5 — Dégâts

- Données : 244 compétences (50 Résonateurs) avec multiplicateurs par niveau et type de dégâts (« considered as X damage » du texte du jeu) ; bonus structurés des ensembles (2/5 pièces) et des passifs d'armes (variable du rang, cumuls).
- Modèle `Build` v2 (migration 1→2) : mode combat, ennemi (niveau, résistance), buffs personnalisés.
- Stats : effets d'ensembles et passifs comptés, bonus conditionnels seulement en combat ; liste transparente des « Bonus comptés ».
- Page « Dégâts estimés » : situation (combat, niveau et RÉS de l'ennemi), équipe (2 coéquipiers), buffs personnalisés, tableau par compétence (multiplicateur, normal, critique, moyenne). Résumé « coup le plus fort » sur la fiche.
- Performance : compétences, page Dégâts et résumé chargés à la demande (JS initial 170 kB gzip). `pnpm check` vérifie désormais aussi le budget du bundle, comme la CI.

### M6 — Partage et comparaison

- Partage par lien autonome (ADR 0003) : feuille « Partager » (copier, partage natif, export PNG), page `/partage` en lecture seule avec « Ajouter à mes builds ».
- Export en image 1200×630 dessiné sur canvas (illustration, arme, stats, Échos), chargé à la demande.
- « Dupliquer » (variantes) et comparateur `/comparer?a=…&b=…` : stats clés et dégâts (coup le plus fort, total par compétence pour un même Résonateur), écart signé et annoncé aux lecteurs d'écran.
- Bandeau immersif extrait en composant `ResonatorHero` (fiche et build partagé) ; `slugify` partagé dans `src/lib`.

## Prochaine étape

M7 : optimiseur (meilleure combinaison d'Échos de l'inventaire pour un objectif), planificateur de matériaux, import OCR de captures d'Échos.

## Décisions en attente (côté utilisateur)

- Branchement de Cloudflare Pages (previews par PR + production) : en fin de projet.
- Protection de la branche `main` (checks requis) : à activer dans les réglages GitHub (le proxy de session interdit de le faire).
- Bonus de stats du Forte : absents du wiki. Options : autoriser une source de données structurée (ex. dump du jeu) ou saisie vérifiée en jeu.
