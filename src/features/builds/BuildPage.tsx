import { useParams } from 'react-router';
import { NotFoundPage } from '@/app/NotFoundPage';
import { useBuilds } from '@/app/services';
import { resonatorById } from '@/data/game';
import { BuildOverview } from './BuildOverview';

export function BuildPage() {
  const { buildId } = useParams();
  const status = useBuilds((s) => s.status);
  const build = useBuilds((s) => s.builds.find((b) => b.id === buildId));

  if (!build) {
    return status === 'ready' ? (
      <NotFoundPage message="Ce build n’existe pas ou a été supprimé." />
    ) : null;
  }
  const resonator = resonatorById.get(build.resonatorId);
  if (!resonator)
    return <NotFoundPage message="Le Résonateur de ce build n’est plus disponible." />;
  return <BuildOverview build={build} resonator={resonator} />;
}
