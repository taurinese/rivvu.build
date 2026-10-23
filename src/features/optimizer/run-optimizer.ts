import type { OptimizeOutcome, OptimizeRequest } from './optimize-build';
import type { WorkerReply } from './optimizer.worker';

/** Lance l'optimiseur dans un Web Worker (ou sur le fil principal si le navigateur n'en a pas). */
export async function runOptimizer(request: OptimizeRequest): Promise<OptimizeOutcome> {
  if (typeof Worker === 'undefined') {
    const { optimizeBuild } = await import('./optimize-build');
    return optimizeBuild(request);
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./optimizer.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      worker.terminate();
      if (event.data.ok) resolve(event.data.outcome);
      else reject(new Error(event.data.message));
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message));
    };
    worker.postMessage(request);
  });
}
