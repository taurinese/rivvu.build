# Données du jeu

## Source

Tout provient du [wiki Wuthering Waves (Fandom)](https://wutheringwaves.fandom.com) : modules de données Lua et infobox des pages, lus en lecture seule via l'API MediaWiki. Texte sous licence CC BY-SA ; images © Kuro Games.

| Fichier                         | Contenu                                                                             | Source wiki                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/data/game/resonators.json` | Résonateurs jouables : rareté, attribut, arme, stats de base niv. 1, images         | `Template:Resonator Infobox`, `Module:Resonator Ascensions and Stats/data` |
| `src/data/game/weapons.json`    | Armes : rareté, type, ATQ de base, stat secondaire, passif par rang                 | `Template:Weapon Infobox`, `Module:Weapon Ascensions and Stats/data`       |
| `src/data/game/echoes.json`     | Échos : coût, classe, ensembles possibles                                           | `Template:Echo Infobox`                                                    |
| `src/data/game/sonatas.json`    | Ensembles de sonate : effets 2/3/5 pièces                                           | `Template:Sonata Infobox`                                                  |
| `src/data/game/curves.json`     | Courbes de niveau (personnage, ATQ et stat secondaire d'arme) + tables de référence | `Module:Character Ascensions and Stats`, `Module:WeaponScaling/*`          |
| `src/data/game/meta.json`       | Date d'import, compteurs, entrées écartées et pourquoi                              | —                                                                          |
| `src/domain/echoes.ts`          | Stats principales par coût, paliers de sous-stats                                   | Page `Echo/Stats`                                                          |
| `src/domain/damage.ts`          | Formule de dégâts (DÉF, RÉS, bonus, amplification)                                  | Page `Damage`                                                              |

## Mettre à jour

```bash
pnpm data:import                 # tout, images comprises (ne retélécharge pas les images existantes)
pnpm data:import --skip-images   # données seules
pnpm data:import --force-images  # retélécharge toutes les images
```

Dans l'environnement cloud de Claude Code, Node doit passer par le proxy : préfixer par `NODE_USE_ENV_PROXY=1`.

Après import : `pnpm test` (le projet `data` valide chaque entrée avec Zod, l'unicité des identifiants, l'existence des images et la cohérence des courbes).

## Règles

- **On n'invente rien.** Une entrée incomplète est écartée et listée dans `meta.json` → `skipped`.
- Les identifiants sont des slugs du nom anglais (`xiangli-yao`) : stables pour les builds sauvegardés.
- Les courbes d'armes sont des **ratios** dérivés des tables publiées (le wiki n'en publie pas pour toutes les valeurs de base) ; un test vérifie qu'elles reproduisent toutes les tables publiées à ±1 ATQ / ±0,1 % près.

## Limites connues (V1)

| Limite                                                                       | Conséquence                                                                 | Piste                                                      |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Rover (attribut « Multiple ») non importé                                    | Absent du sélecteur                                                         | Importer les variantes Rover par attribut                  |
| Résonateurs sans stats sur le wiki (Buling, Lucilla, Lucy, Rebecca, Jingran) | Absents                                                                     | Se mettront à jour au prochain import                      |
| Bonus de stats du Forte (ex. ATQ +12 %, Taux crit. +8 %)                     | **Non disponibles sur le wiki** : pas encore comptés dans les stats finales | Source de données structurée à valider (voir PROGRESS)     |
| Stats uniquement aux paliers d'ascension (1, 20, 40… 90)                     | Pas de niveau intermédiaire                                                 | Suffisant pour les builds (quasi toujours niv. 90)         |
| Stats principales d'Échos au niveau +25 (5★) uniquement                      | Pas d'Écho partiellement monté                                              | Ajouter les autres niveaux si une source fiable existe     |
| Passifs d'armes et effets 5 pièces en texte                                  | Pas encore modélisés dans le calcul                                         | Modélisation structurée en M5, effet par effet, avec tests |
