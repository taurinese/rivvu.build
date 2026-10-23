import { BUILD_SCHEMA_VERSION } from '@/domain/build';
import type { Build } from '@/domain/build';
import { migrateBuild } from '../persistence/build-schema';

/**
 * Partage d'un build par URL : contenu compressé (deflate) puis encodé en base64url,
 * placé dans le fragment (`/partage#…`) pour ne jamais transiter par un serveur.
 * Ni l'identifiant, ni le propriétaire, ni l'historique ne sont partagés.
 */
export const MAX_SHARE_CODE_LENGTH = 16_000;

export class ShareError extends Error {
  constructor(message = 'Lien de partage invalide ou abîmé.') {
    super(message);
    this.name = 'ShareError';
  }
}

export interface SharePayload {
  /** Version du format du build partagé (migrée à la lecture). */
  v: number;
  b: Record<string, unknown>;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): Uint8Array<ArrayBuffer> {
  const binary = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function transform(
  bytes: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  // Les erreurs d'écriture (données altérées) remontent aussi par la lecture.
  writer
    .write(bytes)
    .then(() => writer.close())
    .catch(() => undefined);
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

export async function encodePayload(payload: SharePayload): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  return toBase64Url(await transform(json, new CompressionStream('deflate-raw')));
}

export function encodeShare(build: Build): Promise<string> {
  const { id, ownerId, revision, createdAt, updatedAt, deletedAt, schemaVersion, ...content } =
    build;
  return encodePayload({ v: schemaVersion, b: content });
}

async function readPayload(code: string): Promise<SharePayload> {
  if (!code || code.length > MAX_SHARE_CODE_LENGTH || !/^[A-Za-z0-9_-]+$/.test(code))
    throw new ShareError();
  try {
    const json = await transform(fromBase64Url(code), new DecompressionStream('deflate-raw'));
    const payload: unknown = JSON.parse(new TextDecoder().decode(json));
    if (
      payload &&
      typeof payload === 'object' &&
      'v' in payload &&
      typeof payload.v === 'number' &&
      'b' in payload &&
      payload.b &&
      typeof payload.b === 'object'
    )
      return { v: payload.v, b: payload.b as Record<string, unknown> };
  } catch {
    // Code tronqué ou altéré : signalé ci-dessous.
  }
  throw new ShareError();
}

/** Build prêt à être affiché ou copié (nouvel identifiant, sans propriétaire). */
export async function decodeShare(
  code: string,
  { newId = () => crypto.randomUUID(), now = () => new Date().toISOString() } = {},
): Promise<Build> {
  const { v, b } = await readPayload(code);
  if (v > BUILD_SCHEMA_VERSION)
    throw new ShareError('Ce lien vient d’une version plus récente de Rivvu.');
  const timestamp = now();
  try {
    return migrateBuild({
      ...b,
      id: newId(),
      ownerId: null,
      revision: 0,
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      schemaVersion: v,
    });
  } catch {
    throw new ShareError('Ce lien contient un build invalide.');
  }
}
