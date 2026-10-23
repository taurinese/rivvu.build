import { BuildLoader } from './BuildLoader';
import { BuildOverview } from './BuildOverview';

export function BuildPage() {
  return (
    <BuildLoader>
      {(build, resonator) => <BuildOverview build={build} resonator={resonator} />}
    </BuildLoader>
  );
}
