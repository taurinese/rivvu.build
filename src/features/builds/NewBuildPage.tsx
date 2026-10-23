import { useNavigate } from 'react-router';
import { useBuilds } from '@/app/services';
import { ResonatorPicker } from '@/features/resonators/ResonatorPicker';
import { Page } from '@/ui/Page';

export function NewBuildPage() {
  const create = useBuilds((s) => s.create);
  const navigate = useNavigate();

  return (
    <Page
      width="wide"
      eyebrow="Étape 1"
      title="Choisir un Résonateur"
      subtitle="Le point de départ de votre build. Vous pourrez le changer à tout moment."
    >
      <ResonatorPicker
        confirmLabel={(r) => `Créer un build ${r.name.fr}`}
        onConfirm={(resonator) => {
          void create(resonator.id, 'Mon build').then((id) => navigate(`/builds/${id}`));
        }}
      />
    </Page>
  );
}
