import type { EchoInstance } from '@/domain/echoes';

/** Écho de l'inventaire : une instance réutilisable entre builds, prête pour la synchro (ADR 0002). */
export interface InventoryEcho extends EchoInstance {
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
  deletedAt: string | null;
}

export interface EchoInventory {
  list(): Promise<InventoryEcho[]>;
  /** Crée ou met à jour (identifié par `uid`). */
  save(echo: EchoInstance): Promise<InventoryEcho>;
  remove(uid: string): Promise<void>;
  subscribe(listener: () => void): () => void;
}
