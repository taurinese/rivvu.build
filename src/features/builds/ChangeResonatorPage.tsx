import { useNavigate } from 'react-router';
import { useBuilds } from '@/app/services';
import { ResonatorPicker } from '@/features/resonators/ResonatorPicker';
import { BackLink } from '@/ui/BackLink';
import { Page } from '@/ui/Page';
import { BuildLoader } from './BuildLoader';

export function ChangeResonatorPage() {
  const update = useBuilds((s) => s.update);
  const navigate = useNavigate();
  return (
    <BuildLoader>
      {(build, resonator) => (
        <Page
          width="wide"
          eyebrow={<BackLink to={`/builds/${build.id}`} label={resonator.name.fr} />}
          title="Changer de Résonateur"
          subtitle="L’arme est retirée si son type ne correspond plus."
        >
          <ResonatorPicker
            initialId={resonator.id}
            confirmLabel={(r) =>
              r.id === resonator.id ? `Garder ${r.name.fr}` : `Choisir ${r.name.fr}`
            }
            onConfirm={(next) => {
              void update(build.id, (b) => ({
                ...b,
                resonatorId: next.id,
                weapon: next.weaponType === resonator.weaponType ? b.weapon : null,
              })).then(() => navigate(`/builds/${build.id}`));
            }}
          />
        </Page>
      )}
    </BuildLoader>
  );
}
