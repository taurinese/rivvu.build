import type { ReactNode } from 'react';
import { useParams } from 'react-router';
import { NotFoundPage } from '@/app/NotFoundPage';
import { useBuilds } from '@/app/services';
import { resonatorById } from '@/data/game';
import type { Resonator } from '@/data/schema';
import type { Build } from '@/domain/build';

interface Props {
  children: (build: Build, resonator: Resonator) => ReactNode;
}

/** Résout le build de l'URL (/builds/:buildId/…) et son Résonateur. */
export function BuildLoader({ children }: Props) {
  const { buildId } = useParams();
  const status = useBuilds((s) => s.status);
  const build = useBuilds((s) => s.builds.find((b) => b.id === buildId));

  if (!build) {
    return status === 'ready' ? (
      <NotFoundPage message="Ce build n’existe pas ou a été supprimé." />
    ) : null;
  }
  const resonator = resonatorById.get(build.resonatorId);
  if (!resonator) {
    return <NotFoundPage message="Le Résonateur de ce build n’est plus disponible." />;
  }
  return <>{children(build, resonator)}</>;
}
