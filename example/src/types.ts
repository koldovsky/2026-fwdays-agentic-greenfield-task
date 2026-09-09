export interface Resources {
  fuel: number;
  supplies: number;
  crew: number;
  morale: number;
  science: number;
  industry: number;
  hull: number;
  reputation: number;
  score: number;
}

export type ResourceKey = keyof Resources;

export interface StartingLoadout {
  id: string;
  name: string;
  description: string;
  bonusResources: Partial<Resources>;
  trait: string;
  traitDescription: string;
}

export interface ActiveModifier {
  id: string;
  name: string;
  description: string;
  duration: number; // in turns, -1 for permanent
  effects: Partial<Resources>; // applied every turn (upkeep/bonus)
}

export interface EventChoice {
  text: string;
  requirement?: {
    resource: ResourceKey;
    value: number;
    failMessage?: string;
  };
  cost?: Partial<Resources>;
  reward?: Partial<Resources>;
  rewardText: string;
  modifierAdded?: ActiveModifier;
  nextEventId?: string; // for chain events
}

export interface GameEvent {
  id: string;
  title: string;
  category: EventCategory;
  description: string;
  choices: EventChoice[];
}

export type EventCategory =
  | 'Deep Space'
  | 'Star System Arrival'
  | 'Distress Signal'
  | 'Ancient Ruins'
  | 'Derelict Ship'
  | 'Resource Cache'
  | 'Solar Storm'
  | 'Crew Conflict'
  | 'Scientific Discovery'
  | 'Pirate Encounter'
  | 'Alien Artifact'
  | 'Equipment Failure';

export type Temperature = 'Frozen' | 'Cold' | 'Temperate' | 'Warm' | 'Hot';
export type Atmosphere = 'None' | 'Thin' | 'Breathable' | 'Dense' | 'Toxic';
export type Gravity = 'Low' | 'Standard' | 'High';
export type Water = 'None' | 'Scarce' | 'Moderate' | 'Ocean';
export type Life = 'None' | 'Microbial' | 'Primitive' | 'Advanced';
export type PlanetResources = 'Poor' | 'Average' | 'Rich';

export interface Planet {
  name: string;
  temperature: Temperature;
  atmosphere: Atmosphere;
  gravity: Gravity;
  water: Water;
  life: Life;
  resources: PlanetResources;
  hazards: string[];
  suitability: number; // 0 to 100
  scanned: boolean;
  scanLevel: number; // 0 = unscanned, 1 = partial, 2 = full
}

export interface RunRecord {
  id: string;
  seed: number;
  date: string;
  turnCount: number;
  finalScore: number;
  colonyName: string;
  colonyType: string; // Government + Society + Outcome
  planetName: string;
  planetSuitability: number;
  loadoutName: string;
  outcomeText: string;
  victory: boolean;
}

export interface GameStats {
  totalRuns: number;
  victoryCount: number;
  bestScore: number;
  averageScore: number;
  fastestVictory: number; // min turns
  longestExpedition: number; // max turns
  favoriteSeed: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  icon: string;
}
