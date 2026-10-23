/**
 * Compétences des Résonateurs (importées du wiki, validées en CI par src/data/game.test.ts).
 * Module séparé de game.ts : volumineux, il n'est chargé qu'avec les écrans de dégâts.
 */
import skillsJson from './game/skills.json';
import type { Skill } from './schema';

export const skills = skillsJson as unknown as readonly Skill[];
