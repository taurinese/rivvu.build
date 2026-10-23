/// <reference lib="webworker" />
import { z } from 'zod';
import { buildSchema, echoInstanceSchema } from '@/app/persistence/build-schema';
import { optimizeBuild } from './optimize-build';
import type { OptimizeOutcome } from './optimize-build';

export type WorkerReply = { ok: true; outcome: OptimizeOutcome } | { ok: false; message: string };

/** Tout message est vérifié avant calcul : le Worker ne fait confiance à aucune donnée reçue. */
const requestSchema = z.object({
  build: buildSchema,
  inventory: z.array(echoInstanceSchema).max(1000),
  skillId: z.string().min(1).max(200),
  keep: z.number().int().min(1).max(20).optional(),
});

/** Calcul de l'optimiseur hors du fil principal : l'interface reste fluide. */
self.onmessage = (event: MessageEvent<unknown>) => {
  // Un Worker dédié ne reçoit que les messages de sa page (origine vide ou identique).
  if (event.origin !== '' && event.origin !== self.location.origin) return;
  let reply: WorkerReply;
  try {
    const request = requestSchema.parse(event.data);
    reply = { ok: true, outcome: optimizeBuild(request) };
  } catch (error) {
    reply = { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
  self.postMessage(reply);
};
