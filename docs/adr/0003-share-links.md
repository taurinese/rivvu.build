# ADR 0003 — Liens de partage autonomes

- Statut : acceptée
- Date : 2026-10-23

## Contexte

Partager un build doit marcher dès la V1, sans compte ni serveur (hébergement statique Cloudflare Pages), et les liens déjà envoyés doivent rester lisibles quand le format des builds évolue.

## Décision

1. **Tout le build dans l'URL** : `https://rivvu.build/partage#<code>`. Le code est dans le fragment (`#`), jamais envoyé au serveur ni journalisé.
2. **Encodage** : `{ v, b }` en JSON (`v` = `schemaVersion` du build, `b` = contenu sans `id`, `ownerId`, `revision`, dates ni `deletedAt`), compressé en `deflate-raw` (`CompressionStream`, natif) puis en base64url. Pas de dépendance ajoutée. Un build complet tient en quelques centaines de caractères.
3. **Lecture = même chemin que la persistance** : le contenu passe par les migrations versionnées et la validation Zod d'ADR 0002, avec un nouvel UUID et `ownerId: null`. Un lien d'une version plus récente, abîmé ou trop long (> 16 000 caractères) est refusé avec un message clair.
4. **Lecture seule d'abord** : la page affiche le build reçu ; « Ajouter à mes builds » en crée une copie locale (`importBuild`).

## Conséquences

- Le format `{ v, b }` est un **contrat** : ne jamais retirer une migration ; tout changement de `Build` passe par une nouvelle version et sa migration (les liens anciens restent valides).
- Avec de vrais comptes, des liens courts côté serveur (`/b/<id>`) pourront s'ajouter ; les liens autonomes continueront de fonctionner.
