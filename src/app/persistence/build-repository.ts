import type { Build } from '@/domain/build';

/**
 * Port de persistance des builds (ADR 0002). Asynchrone dès la V1 pour que le passage
 * à un stockage distant (comptes utilisateurs) ne change aucun appelant.
 */
export interface BuildRepository {
  /** Builds non supprimés, du plus récemment modifié au plus ancien. */
  list(): Promise<Build[]>;
  get(id: string): Promise<Build | null>;
  /** Enregistre (création ou mise à jour) : incrémente `revision` et met à jour `updatedAt`. */
  save(build: Build): Promise<Build>;
  /** Suppression logique (`deletedAt`). */
  remove(id: string): Promise<void>;
  /** Appelé après toute modification, y compris depuis un autre onglet. Renvoie la fonction de désabonnement. */
  subscribe(listener: () => void): () => void;
}
