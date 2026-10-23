# ADR 0002 — Persistance locale prête pour les comptes utilisateurs

- Statut : acceptée
- Date : 2026-10-23

## Contexte

En V1, les builds sont enregistrés dans le navigateur (`localStorage`). Plus tard, Rivvu aura de vrais comptes : les données locales devront cohabiter avec un serveur puis y être migrées sans perte.

## Décision

1. **Port + adaptateurs** : l'application ne parle qu'à une interface asynchrone `BuildRepository` (`list`, `get`, `save`, `remove`, `subscribe`). V1 : `LocalStorageBuildRepository`. Plus tard : `RemoteBuildRepository` et un `SyncingBuildRepository` qui combine les deux.
2. **API asynchrone dès maintenant** (`Promise`), même si `localStorage` est synchrone : le passage au réseau ne changera aucun appelant.
3. **Modèle d'entité prêt pour la synchro** : chaque document persisté porte
   - `id` : UUID v4 généré côté client (pas d'identifiant séquentiel serveur à attendre) ;
   - `ownerId` : `null` en local, renseigné après connexion (« revendication » des builds locaux) ;
   - `createdAt`, `updatedAt` (ISO 8601) et `revision` (entier incrémenté) pour la résolution de conflits ;
   - `deletedAt` : suppression logique, pour propager les suppressions lors d'une synchro ;
   - `schemaVersion` : version du format.
4. **Migrations** : chaque lecture passe par une chaîne de migrations versionnées puis par une validation Zod. Une donnée illisible est mise de côté (clé de quarantaine), jamais supprimée silencieusement.
5. **Clés namespacées** : `rivvu:v1:builds`, `rivvu:v1:echoes`, `rivvu:v1:settings` pour pouvoir coexister et migrer.
6. **Synchro entre onglets** via l'évènement `storage`, exposée par `subscribe`.

## Conséquences

- La bascule vers des comptes revient à écrire un nouvel adaptateur et un écran de connexion : aucun écran métier ne change.
- Les identifiants générés côté client restent valides côté serveur.
- Le quota `localStorage` (~5 Mo) suffit pour des centaines de builds ; au-delà, un adaptateur IndexedDB pourra remplacer celui-ci derrière la même interface.
