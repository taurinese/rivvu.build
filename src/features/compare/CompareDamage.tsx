import type { Resonator } from '@/data/schema';
import type { Build } from '@/domain/build';
import type { FinalStats } from '@/domain/stats';
import { resonatorSkills, skillDamage, strongestHit } from '@/features/damage/skill-damage';
import { formatFlat } from '@/lib/format';
import { DeltaCell } from './DeltaCell';
import styles from './ComparePage.module.css';

export interface DamageSide {
  build: Build;
  stats: FinalStats;
  resonator: Resonator;
}

const total = ({ build, stats, resonator }: DamageSide, skillId: string) => {
  const skill = resonatorSkills(resonator.id).find((s) => s.id === skillId);
  return skill
    ? skillDamage(build, stats, skill, resonator).reduce((sum, row) => sum + row.average, 0)
    : 0;
};

/** Dégâts comparés (chargé à la demande avec les données de compétences). */
export function CompareDamage({ a, b }: { a: DamageSide; b: DamageSide }) {
  const bestA = strongestHit(a.build, a.stats, a.resonator)?.row.average ?? 0;
  const bestB = strongestHit(b.build, b.stats, b.resonator)?.row.average ?? 0;
  const sameResonator = a.resonator.id === b.resonator.id;
  const skills = sameResonator ? resonatorSkills(a.resonator.id) : [];

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Dégâts moyens</th>
          <th scope="col">A</th>
          <th scope="col">B</th>
          <th scope="col">Écart</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Coup le plus fort</th>
          <td>{formatFlat(bestA)}</td>
          <td>{formatFlat(bestB)}</td>
          <DeltaCell a={bestA} b={bestB} relative />
        </tr>
        {skills.map((skill) => {
          const va = total(a, skill.id);
          const vb = total(b, skill.id);
          return (
            <tr key={skill.id}>
              <th scope="row">{skill.name.fr}</th>
              <td>{formatFlat(va)}</td>
              <td>{formatFlat(vb)}</td>
              <DeltaCell a={va} b={vb} relative />
            </tr>
          );
        })}
      </tbody>
      {!sameResonator ? (
        <caption className={styles.caption}>
          Résonateurs différents : seul le coup le plus fort est comparé.
        </caption>
      ) : null}
    </table>
  );
}
