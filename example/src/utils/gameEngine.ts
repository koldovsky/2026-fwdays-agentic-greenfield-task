import { Planet, Resources, Temperature, Atmosphere, Gravity, Water, Life, PlanetResources, StartingLoadout, RunRecord, Achievement } from '../types';
import { RNG } from './rng';
import { TEMPERATURES, ATMOSPHERES, GRAVITIES, WATERS, LIFES, RESOURCES_LEVELS, HAZARDS } from '../data/gameContent';

// Procedurally generate a planet name based on seed and system index
export function generatePlanetName(rng: RNG, systemIndex: number): string {
  const prefixes = ['Epsilon', 'Alpha', 'Delta', 'Zeta', 'Gamma', 'Sigma', 'Kepler', 'Gliese', 'TRS', 'HD', 'Elysium', 'Nova', 'Aurelia', 'Vesper'];
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  const prefix = rng.choice(prefixes);
  const codeNum = rng.range(100, 999);
  const letter = rng.choice(alphabet.split(''));
  
  // Make it sound organic
  if (rng.next() > 0.5) {
    return `${prefix}-${codeNum}${letter}`;
  } else {
    return `${prefix} ${rng.range(1, 12)}`;
  }
}

// Generate a planet with fully procedural attributes
export function generatePlanet(rng: RNG, systemIndex: number): Planet {
  const name = generatePlanetName(rng, systemIndex);
  
  const temperature = rng.choice(TEMPERATURES);
  const atmosphere = rng.choice(ATMOSPHERES);
  const gravity = rng.choice(GRAVITIES);
  const water = rng.choice(WATERS);
  const life = rng.choice(LIFES);
  const resources = rng.choice(RESOURCES_LEVELS);
  
  // Choose random hazards (0 to 3 based on difficulty/rng)
  const numHazards = rng.range(0, rng.next() > 0.7 ? 2 : 1);
  const hazards = rng.sample(HAZARDS, numHazards);
  
  const suitability = calculateSuitability(temperature, atmosphere, gravity, water, life, resources, hazards);

  return {
    name,
    temperature,
    atmosphere,
    gravity,
    water,
    life,
    resources,
    hazards,
    suitability,
    scanned: false,
    scanLevel: 0,
  };
}

// Calculate suitability score (0 to 100) based on planet attributes
export function calculateSuitability(
  temp: Temperature,
  atmos: Atmosphere,
  grav: Gravity,
  water: Water,
  life: Life,
  res: PlanetResources,
  hazards: string[]
): number {
  let score = 0;

  // Temperature (Max 25)
  if (temp === 'Temperate') score += 25;
  else if (temp === 'Warm') score += 18;
  else if (temp === 'Cold') score += 12;
  else if (temp === 'Hot') score += 5;
  else if (temp === 'Frozen') score += 2;

  // Atmosphere (Max 30)
  if (atmos === 'Breathable') score += 30;
  else if (atmos === 'Thin') score += 15;
  else if (atmos === 'Dense') score += 10;
  else if (atmos === 'Toxic') score += 4;
  else if (atmos === 'None') score += 0;

  // Gravity (Max 15)
  if (grav === 'Standard') score += 15;
  else if (grav === 'Low') score += 10;
  else if (grav === 'High') score += 6;

  // Water (Max 15)
  if (water === 'Moderate') score += 15;
  else if (water === 'Ocean') score += 10;
  else if (water === 'Scarce') score += 5;
  else if (water === 'None') score += 0;

  // Life (Max 10)
  if (life === 'Advanced') score += 10;
  else if (life === 'Primitive') score += 8;
  else if (life === 'Microbial') score += 5;
  else if (life === 'None') score += 2;

  // Resources (Max 5)
  if (res === 'Rich') score += 5;
  else if (res === 'Average') score += 3;
  else if (res === 'Poor') score += 1;

  // Subtract for hazards
  score -= hazards.length * 10;

  // Keep between 5 and 100
  return Math.max(5, Math.min(100, score));
}

// Calculate the final expedition score
export function calculateExpeditionScore(
  resources: Resources,
  planetSuitability: number,
  turnCount: number,
  isVictory: boolean
): number {
  if (!isVictory) {
    // Consolidation score on defeat
    return Math.floor(turnCount * 50 + resources.science * 2 + resources.industry * 2);
  }

  // Base victory score
  let score = 2000;

  // Planet suitability impact (highly scaled)
  score += planetSuitability * 50;

  // Remaining resources value
  score += resources.crew * 100;
  score += resources.morale * 15;
  score += resources.supplies * 10;
  score += resources.fuel * 8;
  score += resources.science * 5;
  score += resources.industry * 5;
  score += resources.hull * 10;
  score += resources.reputation * 15;

  // Turn bonus (fewer turns to find an optimal world means more efficient colony)
  // Max bonus 1000, decreases as turns increase
  const turnBonus = Math.max(0, (50 - turnCount) * 40);
  score += turnBonus;

  return Math.floor(score);
}

// Generate procedurally generated Colony Name
export function generateColonyName(rng: RNG, planetName: string): string {
  const descriptors = ['Free', 'United', 'First', 'Stellar', 'Sovereign', 'Cooperative', 'New', 'Solar', 'Astra', 'Horizon', 'Sentinel', 'Unity'];
  const nouns = ['Enclave', 'Union', 'Settlement', 'Commonwealth', 'Authority', 'Haven', 'Nexus', 'Colony', 'Domain', 'Republic', 'Frontier', 'Sanctuary'];
  
  const desc = rng.choice(descriptors);
  const noun = rng.choice(nouns);
  
  return `${desc} ${noun} of ${planetName}`;
}

export interface ColonyOutcome {
  government: string;
  society: string;
  outcome: string;
  narrative: string;
}

// Generate Colony Outcome and Traits based on Final State (Section 9)
export function generateColonyOutcome(
  resources: Resources,
  planet: Planet,
  turnCount: number,
  loadoutId: string,
  rng: RNG
): ColonyOutcome {
  let government = 'Democratic';
  let society = 'Cooperative';
  let outcome = 'Stable';
  let narrative = '';

  // 1. Determine Government based on resources and decisions
  if (loadoutId === 'military_escort' || (resources.morale < 30 && resources.industry > 40)) {
    government = rng.choice(['Military Junta', 'Stratocracy', 'Secured Directorship']);
  } else if (resources.science > 65) {
    government = rng.choice(['Scientific Technocracy', 'Sage Council', 'Rational Directorate']);
  } else if (resources.industry > 60 && resources.reputation < 35) {
    government = rng.choice(['Corporate Syndicate', 'Industrial Directorate', 'Consortium Board']);
  } else if (resources.supplies > 40 && resources.morale > 60) {
    government = rng.choice(['Cooperative Assembly', 'Syndicalist Union', 'Egalitarian Council']);
  } else if (resources.morale > 75 && resources.science < 30) {
    government = rng.choice(['Theocratic Order', 'Ecclesia of the Stars', 'Spiritual Hegemony']);
  } else if (resources.crew > 50) {
    government = rng.choice(['Collective Concord', 'People\'s Commune', 'Unified Comminality']);
  } else {
    government = rng.choice(['Representative Democracy', 'Colonial Republic', 'Citizen Assembly']);
  }

  // 2. Determine Society
  const highestResource = Object.entries({
    science: resources.science,
    industry: resources.industry,
    supplies: resources.supplies,
    morale: resources.morale,
  }).sort((a, b) => b[1] - a[1])[0][0];

  if (highestResource === 'science') {
    society = 'Scientific';
  } else if (highestResource === 'industry') {
    society = 'Industrial';
  } else if (highestResource === 'supplies') {
    society = 'Agricultural';
  } else if (planet.suitability < 45) {
    society = 'Survivalist';
  } else if (resources.reputation < 25) {
    society = 'Isolationist';
  } else if (resources.fuel > 30 && resources.crew > 35) {
    society = 'Expansionist';
  } else {
    society = 'Pacifist';
  }

  // 3. Determine Outcome
  if (planet.suitability >= 80 && resources.crew > 20 && resources.morale > 50 && resources.supplies > 30) {
    outcome = 'Prosperous';
  } else if (planet.suitability >= 85 && resources.science > 50 && resources.industry > 50) {
    outcome = 'Legendary';
  } else if (planet.suitability < 35 || resources.crew < 5 || resources.morale < 15) {
    outcome = 'Fragile';
  } else {
    outcome = 'Stable';
  }

  // 4. Generate Narrative
  const govNoun = government.toLowerCase();
  const socAdj = society.toLowerCase();
  
  const intro = `Colony Report #${rng.range(1000, 9999)} - On the planet ${planet.name}, after a grueling expedition of ${turnCount} turns, the pioneers of the ship have laid down the final foundations of their new home.`;
  
  let planetDesc = '';
  if (planet.suitability >= 75) {
    planetDesc = `The planet's temperate air, breathable atmosphere, and rich water reserves made it an absolute paradise. The soil is fertile, and life flourishes under the warm local star.`;
  } else if (planet.suitability >= 50) {
    planetDesc = `The planet is functional, though it presents challenges. With its ${planet.atmosphere.toLowerCase()} atmosphere and ${planet.temperature.toLowerCase()} climate, the colonists will spend their first few years in insulated dome shelters, slowly terraforming the land.`;
  } else {
    planetDesc = `The planet is a harsh, unforgiving crucible. Enduring ${planet.temperature.toLowerCase()} temperatures, a ${planet.atmosphere.toLowerCase()} atmosphere, and hazardous ${planet.hazards.join(' and ') || 'conditions'}, survival will require complete reliance on high-tech biodomes and strict material conservation.`;
  }

  let societyDesc = '';
  if (outcome === 'Legendary') {
    societyDesc = `The settlement rapidly blossomed into a beacon of stellar civilization. A truly Legendary ${society} society has emerged under a highly efficient ${government}. The archives of Old Earth will speak of this landing as the greatest triumph of humanity.`;
  } else if (outcome === 'Prosperous') {
    societyDesc = `Under the guidance of the ${government}, the colony enjoys immense wealth. Their ${socAdj} focus has enabled rapid expansion, ensuring a Prosperous and joyful future where hunger and fear are relics of the past.`;
  } else if (outcome === 'Stable') {
    societyDesc = `The ${government} has established a Stable, law-abiding community. Taking a ${socAdj} approach to daily challenges, they have balanced their resources, set up steady supply lines, and can safely look forward to generations of peace.`;
  } else {
    societyDesc = `The new society is incredibly Fragile. Plagued by low numbers, damaged machinery, and internal friction, the ${government} rules with an iron fist. It remains a daily struggle for survival, where a single equipment failure could spell doom for the colony.`;
  }

  narrative = `${intro}\n\n${planetDesc}\n\n${societyDesc}`;

  return {
    government,
    society,
    outcome,
    narrative,
  };
}

// Check Achievements unlocked at the end of a run or during gameplay
export function checkAchievements(
  history: RunRecord[],
  currentRecord: RunRecord | null,
  activeResources: Resources | null,
  turnCount: number,
  planet: Planet | null,
  unlockedIds: string[]
): string[] {
  const newlyUnlocked: string[] = [];

  const triggerUnlock = (id: string) => {
    if (!unlockedIds.includes(id) && !newlyUnlocked.includes(id)) {
      newlyUnlocked.push(id);
    }
  };

  // 1. First Steps: Complete first expedition
  if (currentRecord) {
    triggerUnlock('first_steps');
  }

  // 2. One More Turn: Reach turn 50
  if (turnCount >= 50) {
    triggerUnlock('one_more_turn');
  }

  // 3. Barely Alive: Colonize with 1 crew remaining
  if (currentRecord && currentRecord.victory && activeResources && activeResources.crew === 1) {
    triggerUnlock('barely_alive');
  }

  // 4. Perfect Landing: Colonize planet with max suitability (>= 90)
  if (currentRecord && currentRecord.victory && currentRecord.planetSuitability >= 90) {
    triggerUnlock('perfect_landing');
  }

  // 5. Fuel Miser: Finish with less than 5 fuel
  if (currentRecord && currentRecord.victory && activeResources && activeResources.fuel < 5) {
    triggerUnlock('fuel_miser');
  }

  // 6. Explorer: Visit 20 systems (turnCount or systemIndex)
  if (turnCount >= 20) {
    triggerUnlock('explorer');
  }

  // 7. Against All Odds: Colonize a hostile world (suitability < 40)
  if (currentRecord && currentRecord.victory && currentRecord.planetSuitability < 40) {
    triggerUnlock('against_all_odds');
  }

  // 8. Lucky Seed: Win without losing morale (Wait, we can track if morale ever dipped below starting? Or just ending morale >= 100 or original start morale)
  if (currentRecord && currentRecord.victory && activeResources && activeResources.morale >= 95) {
    triggerUnlock('lucky_seed');
  }

  return newlyUnlocked;
}

// Initial achievements list
export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first expedition to the stars.',
    unlocked: false,
    icon: 'Rocket',
  },
  {
    id: 'one_more_turn',
    name: 'One More Turn',
    description: 'Reach turn 50 in a single expedition.',
    unlocked: false,
    icon: 'Clock',
  },
  {
    id: 'barely_alive',
    name: 'Barely Alive',
    description: 'Establish a colony with only 1 Crew member remaining alive.',
    unlocked: false,
    icon: 'HeartPulse',
  },
  {
    id: 'perfect_landing',
    name: 'Perfect Landing',
    description: 'Establish a colony on a planet with 90%+ suitability rating.',
    unlocked: false,
    icon: 'Globe',
  },
  {
    id: 'fuel_miser',
    name: 'Fuel Miser',
    description: 'Establish a colony with less than 5 units of Fuel remaining.',
    unlocked: false,
    icon: 'Gauge',
  },
  {
    id: 'explorer',
    name: 'Veteran Explorer',
    description: 'Visit 20 star systems in a single game.',
    unlocked: false,
    icon: 'Compass',
  },
  {
    id: 'against_all_odds',
    name: 'Against All Odds',
    description: 'Establish a colony on a hostile world (Suitability under 40%).',
    unlocked: false,
    icon: 'ShieldAlert',
  },
  {
    id: 'lucky_seed',
    name: 'Inspiring Leader',
    description: 'Establish a colony with Crew Morale at 95% or higher.',
    unlocked: false,
    icon: 'Smile',
  },
];
