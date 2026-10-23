/// <reference lib="webworker" />
import { optimizeBuild } from './optimize-build';
import type { OptimizeOutcome, OptimizeRequest } from './optimize-build';

export type WorkerReply = { ok: true; outcome: OptimizeOutcome } | { ok: false; message: string };

/** Calcul de l'optimiseur hors du fil principal : l'interface reste fluide. */
self.onmessage = (event: MessageEvent<OptimizeRequest>) => {
  let reply: WorkerReply;
  try {
    reply = { ok: true, outcome: optimizeBuild(event.data) };
  } catch (error) {
    reply = { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
  self.postMessage(reply);
};
