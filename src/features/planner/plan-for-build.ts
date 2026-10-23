import { itemById, materials } from '@/data/materials';
import type { Materials } from '@/data/schema';
import { weaponById } from '@/data/game';
import type { Build } from '@/domain/build';
import {
  INHERENT_SKILLS,
  STAT_BONUS_STRANDS,
  emptyProgress,
  planMaterials,
} from '@/domain/planner';
import type { Progress } from '@/domain/planner';

export type Item = Materials['items'][number];

export interface PlanLine {
  /** null : objet absent du wiki (emplacement non résolu). */
  item: Item | null;
  slot: string;
  qty: number;
}

/** État actuel enregistré (ou Résonateur neuf) et objectif du build. */
export function plannerOf(build: Build): { current: Progress; target: Progress } {
  return {
    current: build.planner?.current ?? emptyProgress(),
    target: {
      level: build.level,
      weaponLevel: build.weapon?.level ?? null,
      forte: build.forte,
      inherent: build.planner?.inherent ?? INHERENT_SKILLS,
      statBonus: build.planner?.statBonus ?? {
        tier1: STAT_BONUS_STRANDS,
        tier2: STAT_BONUS_STRANDS,
      },
    },
  };
}

/** Matériaux restant à réunir pour ce build, un objet par ligne (le plus rare d'abord). */
export function materialPlan(build: Build): { credits: number; lines: PlanLine[] } {
  const { current, target } = plannerOf(build);
  const weapon = build.weapon ? weaponById.get(build.weapon.id) : undefined;
  const plan = planMaterials(current, target, {
    ...materials.costs,
    weaponAscension: weapon ? (materials.costs.weaponAscension[String(weapon.rarity)] ?? []) : [],
  });

  const totals = new Map<string, PlanLine>();
  const collect = (needs: Record<string, number>, slots: Record<string, string> | undefined) => {
    for (const [slot, qty] of Object.entries(needs)) {
      const item = itemById.get(slots?.[slot] ?? '') ?? null;
      const key = item?.id ?? `?${slot}`;
      const line = totals.get(key) ?? { item, slot, qty: 0 };
      totals.set(key, { ...line, qty: line.qty + qty });
    }
  };
  collect(plan.resonator, materials.resonators[build.resonatorId]);
  if (weapon) collect(plan.weapon, materials.weapons[weapon.id]);

  const lines = [...totals.values()].sort(
    (a, b) =>
      (b.item?.rarity ?? 0) - (a.item?.rarity ?? 0) ||
      (a.item?.name.fr ?? a.slot).localeCompare(b.item?.name.fr ?? b.slot, 'fr'),
  );
  return { credits: plan.credits, lines };
}
