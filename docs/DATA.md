# Données du jeu

## Source

Tout provient du [wiki Wuthering Waves (Fandom)](https://wutheringwaves.fandom.com) : modules de données Lua et infobox des pages, lus en lecture seule via l'API MediaWiki. Texte sous licence CC BY-SA ; images © Kuro Games.

| Fichier                         | Contenu                                                                                                                                                                           | Source wiki                                                                                                                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/game/resonators.json` | Résonateurs jouables : rareté, attribut, arme, stats de base niv. 1, images                                                                                                       | `Template:Resonator Infobox`, `Module:Resonator Ascensions and Stats/data`                                                                                                                |
| `src/data/game/weapons.json`    | Armes : rareté, type, ATQ de base, stat secondaire, passif par rang                                                                                                               | `Template:Weapon Infobox`, `Module:Weapon Ascensions and Stats/data`                                                                                                                      |
| `src/data/game/echoes.json`     | Échos : coût, classe, ensembles possibles                                                                                                                                         | `Template:Echo Infobox`                                                                                                                                                                   |
| `src/data/game/sonatas.json`    | Ensembles de sonate : effets 2/3/5 pièces                                                                                                                                         | `Template:Sonata Infobox`                                                                                                                                                                 |
| `src/data/game/skills.json`     | Compétences : type, stat de référence (ATQ/PV/DÉF), lignes de dégâts × niveaux 1–10                                                                                               | `Template:Skill Infobox` (pages `<Résonateur>/Skills`)                                                                                                                                    |
| `src/data/game/materials.json`  | Coûts d'ascension (Résonateur, arme par rareté), de Forte, des compétences innées et des bonus de stats ; matériaux de chaque Résonateur et arme ; objets (nom FR, rareté, icône) | Code de `Module:Character Ascensions and Stats`, `Module:Weapon Ascensions and Stats`, `Module:Skill Upgrade` (lu dans l'arbre syntaxique), `Module:Skill Upgrade/data`, pages des objets |
| `src/data/game/curves.json`     | Courbes de niveau (personnage, ATQ et stat secondaire d'arme) + tables de référence                                                                                               | `Module:Character Ascensions and Stats`, `Module:WeaponScaling/*`                                                                                                                         |
| `src/data/game/meta.json`       | Date d'import, compteurs, entrées écartées et pourquoi                                                                                                                            | —                                                                                                                                                                                         |
| `src/domain/echoes.ts`          | Stats principales par coût, paliers de sous-stats                                                                                                                                 | Page `Echo/Stats`                                                                                                                                                                         |
| `src/domain/damage.ts`          | Formule de dégâts (DÉF, RÉS, bonus, amplification)                                                                                                                                | Page `Damage`                                                                                                                                                                             |

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

| Limite                                                                                         | Conséquence                                                                 | Piste                                                     |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------- |
| Rover (attribut « Multiple ») non importé                                                      | Absent du sélecteur                                                         | Importer les variantes Rover par attribut                 |
| Résonateurs sans stats sur le wiki (Buling, Lucilla, Lucy, Rebecca, Jingran)                   | Absents                                                                     | Se mettront à jour au prochain import                     |
| Bonus de stats du Forte (ex. ATQ +12 %, Taux crit. +8 %)                                       | **Non disponibles sur le wiki** : pas encore comptés dans les stats finales | Source de données structurée à valider (voir PROGRESS)    |
| Stats uniquement aux paliers d'ascension (1, 20, 40… 90)                                       | Pas de niveau intermédiaire                                                 | Suffisant pour les builds (quasi toujours niv. 90)        |
| Stats principales d'Échos au niveau +25 (5★) uniquement                                        | Pas d'Écho partiellement monté                                              | Ajouter les autres niveaux si une source fiable existe    |
| Effets d'ensembles et passifs d'armes : seuls les bonus chiffrés « stat +X % » sont structurés | Les effets complexes (soins, coordination, débuffs) restent en texte        | Modéliser au cas par cas, avec tests                      |
| Bonus conditionnels (5 pièces, cumuls de passifs)                                              | Comptés seulement en mode « Bonus de combat », au maximum de cumuls         | Réglage par cumul si besoin                               |
| Buffs de coéquipiers (Outro, ensembles de soutien)                                             | Saisis à la main (« Buffs personnalisés »)                                  | Modéliser les Outros les plus joués                       |
| Libellés des lignes de dégâts en anglais (noms propres)                                        | Les termes génériques sont traduits, les noms d'attaques restent en anglais | Récupérer les traductions FR des pages de compétences     |
| Lignes de dégâts sans « % » sur le wiki                                                        | Lues comme des pourcentages et signalées « % supposé »                      | Corriger sur le wiki                                      |
| Cartethyia : pas de page de compétences exploitable                                            | Pas de dégâts estimés pour elle                                             | Se mettra à jour au prochain import                       |
| Expérience (potions de Résonateur, cœurs d'énergie d'arme)                                     | Absente du planificateur de matériaux                                       | Importer les courbes d'expérience si le wiki les publie   |
| Nombre de branches de bonus de stats (4)                                                       | Structure du jeu, non publiée comme donnée par le wiki                      | Constante `STAT_BONUS_STRANDS`, à revoir si le jeu change |
| Objets sans page sur le wiki (matériau local de Hsin et Suoming)                               | Affichés « Matériau inconnu » dans le planificateur                         | Se mettra à jour au prochain import                       |
