import { useBuilds } from '@/app/services';
import type { Resonator } from '@/data/schema';
import { FORTE_SKILLS, MAX_FORTE_LEVEL } from '@/domain/build';
import type { Build } from '@/domain/build';
import { BackLink } from '@/ui/BackLink';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { GroupedList, ListRow } from '@/ui/GroupedList';
import { Page } from '@/ui/Page';
import { Stepper } from '@/ui/Stepper';
import { BuildLoader } from './BuildLoader';
import { FORTE_LABEL } from './forte-labels';

function ForteEditor({ build, resonator }: { build: Build; resonator: Resonator }) {
  const update = useBuilds((s) => s.update);
  const setLevel = (skill: (typeof FORTE_SKILLS)[number], level: number) =>
    void update(build.id, (b) => ({ ...b, forte: { ...b.forte, [skill]: level } }));

  return (
    <Page
      eyebrow={<BackLink to={`/builds/${build.id}`} label={resonator.name.fr} />}
      title="Forte"
      subtitle="Niveau de chaque compétence, de 1 à 10."
    >
      <Card
        heading="Compétences"
        accessory={
          <Button
            size="small"
            variant="tinted"
            onClick={() => {
              void update(build.id, (b) => ({
                ...b,
                forte: { normal: 10, skill: 10, circuit: 10, liberation: 10, intro: 10 },
              }));
            }}
          >
            Tout au maximum
          </Button>
        }
      >
        <GroupedList>
          {FORTE_SKILLS.map((skill) => {
            const level = build.forte[skill];
            return (
              <ListRow
                key={skill}
                label={FORTE_LABEL[skill]}
                trailing={
                  <Stepper
                    label={FORTE_LABEL[skill]}
                    valueText={`${String(level)} / ${String(MAX_FORTE_LEVEL)}`}
                    canDecrement={level > 1}
                    canIncrement={level < MAX_FORTE_LEVEL}
                    onDecrement={() => {
                      setLevel(skill, level - 1);
                    }}
                    onIncrement={() => {
                      setLevel(skill, level + 1);
                    }}
                  />
                }
              />
            );
          })}
        </GroupedList>
      </Card>
    </Page>
  );
}

export function FortePage() {
  return (
    <BuildLoader>
      {(build, resonator) => <ForteEditor build={build} resonator={resonator} />}
    </BuildLoader>
  );
}
