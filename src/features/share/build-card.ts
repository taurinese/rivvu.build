import { echoById, resonatorById, sonataById, weaponById } from '@/data/game';
import type { Build } from '@/domain/build';
import { sonataPieceCounts } from '@/domain/echoes';
import { stepLabel } from '@/domain/levels';
import type { Element, StatKey } from '@/domain/types';
import { computeBuildStats } from '@/features/builds/build-stats';
import { ELEMENT_LABEL, STAT_LABEL } from '@/features/game/labels';
import { formatFlat, formatPercent } from '@/lib/format';

/** Contenu de l'image de partage d'un build (indépendant du dessin). */
export interface BuildCardModel {
  resonatorName: string;
  buildName: string;
  element: Element;
  sprite: string | null;
  subtitle: string;
  weapon: { name: string; icon: string | null; meta: string } | null;
  stats: { label: string; value: string }[];
  echoes: { name: string; icon: string | null; cost: number; mainStat: string }[];
  sets: { name: string; icon: string | null; pieces: number }[];
}

export function buildCardModel(build: Build): BuildCardModel | null {
  const resonator = resonatorById.get(build.resonatorId);
  if (!resonator) return null;
  const { stats } = computeBuildStats(build);
  const weapon = build.weapon ? weaponById.get(build.weapon.id) : undefined;
  const flat = (key: StatKey, value: number) => ({
    label: STAT_LABEL[key],
    value: formatFlat(value),
  });
  const pct = (key: StatKey, value: number) => ({
    label: STAT_LABEL[key],
    value: formatPercent(value),
  });

  return {
    resonatorName: resonator.name.fr,
    buildName: build.name,
    element: resonator.element,
    sprite: resonator.sprite,
    subtitle: `Niv. ${stepLabel(build.level)} · S${String(build.chain)}`,
    weapon:
      weapon && build.weapon
        ? {
            name: weapon.name.fr,
            icon: weapon.icon,
            meta: `Niv. ${stepLabel(build.weapon.level)} · R${String(build.weapon.rank)}`,
          }
        : null,
    stats: [
      flat('hp', stats.hp),
      flat('atk', stats.atk),
      flat('def', stats.def),
      pct('critRate', stats.critRate),
      pct('critDmg', stats.critDmg),
      // Libellés courts : l'image a des colonnes étroites.
      { label: 'Régén.', value: formatPercent(stats.energyRegen) },
      {
        label: `Bonus ${ELEMENT_LABEL[resonator.element]}`,
        value: formatPercent(stats.dmgBonus[resonator.element]),
      },
    ],
    echoes: build.echoes.map((echo) => {
      const data = echoById.get(echo.echoId);
      return {
        name: data?.name.fr ?? echo.echoId,
        icon: data?.icon ?? null,
        cost: echo.cost,
        mainStat: STAT_LABEL[echo.mainStat],
      };
    }),
    sets: Object.entries(sonataPieceCounts(build.echoes)).map(([id, pieces]) => {
      const sonata = sonataById.get(id);
      return { name: sonata?.name.fr ?? id, icon: sonata?.icon ?? null, pieces };
    }),
  };
}
