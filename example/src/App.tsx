import { useState, useEffect } from 'react';
import { Globe, Award, Sparkles, BookOpen, AlertTriangle } from 'lucide-react';
import { Resources, StartingLoadout, ActiveModifier, GameEvent, Planet, RunRecord, GameStats, Achievement, EventChoice } from './types';
import { STARTING_LOADOUTS, GAME_EVENTS } from './data/gameContent';
import { createRNG } from './utils/rng';
import { generatePlanet, calculateExpeditionScore, generateColonyName, generateColonyOutcome, checkAchievements, INITIAL_ACHIEVEMENTS } from './utils/gameEngine';
import { DashboardHeader } from './components/DashboardHeader';
import { ResourcePanel } from './components/ResourcePanel';
import { LoadoutSelection } from './components/LoadoutSelection';
import { EventCardView } from './components/EventCardView';
import { PlanetScannerView } from './components/PlanetScannerView';
import { ColonyReportView } from './components/ColonyReportView';

const BASE_RESOURCES: Resources = {
  fuel: 50,
  supplies: 50,
  crew: 20,
  morale: 70,
  science: 10,
  industry: 15,
  hull: 100,
  reputation: 50,
  score: 0,
};

export default function App() {
  // Game Flow States
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'scanning' | 'ending'>('setup');
  const [loadout, setLoadout] = useState<StartingLoadout | null>(null);
  const [seed, setSeed] = useState<number>(0);
  const [turnCount, setTurnCount] = useState<number>(1);
  const [systemIndex, setSystemIndex] = useState<number>(1);

  // Ship and Galactic States
  const [resources, setResources] = useState<Resources>(BASE_RESOURCES);
  const [activeModifiers, setActiveModifiers] = useState<ActiveModifier[]>([]);
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [currentPlanet, setCurrentPlanet] = useState<Planet | null>(null);

  // Settlement Outcome States
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [colonyName, setColonyName] = useState<string>('');
  const [colonyTraits, setColonyTraits] = useState({ government: '', society: '', outcome: '', narrative: '' });
  const [finalScore, setFinalScore] = useState<number>(0);

  // Local Persistence
  const [runHistory, setRunHistory] = useState<RunRecord[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [newAchievementsThisRun, setNewAchievementsThisRun] = useState<string[]>([]);

  // Telemetry Stats
  const [gameStats, setGameStats] = useState<GameStats>({
    totalRuns: 0,
    victoryCount: 0,
    bestScore: 0,
    averageScore: 0,
    fastestVictory: Infinity,
    longestExpedition: 0,
    favoriteSeed: 0,
  });

  // Load telemetry and achievements from LocalStorage on mount
  useEffect(() => {
    const storedHistory = localStorage.getItem('pioneer_directive_history');
    const storedAchievements = localStorage.getItem('pioneer_directive_achievements');

    if (storedHistory) {
      try {
        const parsedHistory: RunRecord[] = JSON.parse(storedHistory);
        setRunHistory(parsedHistory);
        recalculateStats(parsedHistory);
      } catch (e) {
        console.error('Error parsing run history', e);
      }
    }

    if (storedAchievements) {
      try {
        const unlockedIds: string[] = JSON.parse(storedAchievements);
        setAchievements((prev) =>
          prev.map((ach) =>
            unlockedIds.includes(ach.id) ? { ...ach, unlocked: true, unlockedAt: new Date().toLocaleDateString() } : ach
          )
        );
      } catch (e) {
        console.error('Error parsing achievements', e);
      }
    }
  }, []);

  // Compute local metrics from past records
  const recalculateStats = (history: RunRecord[]) => {
    if (history.length === 0) return;

    const totalRuns = history.length;
    const victories = history.filter((r) => r.victory);
    const victoryCount = victories.length;
    const bestScore = Math.max(...history.map((r) => r.finalScore), 0);
    const averageScore = Math.floor(history.reduce((sum, r) => sum + r.finalScore, 0) / totalRuns);

    const fastestVictory = victories.length > 0
      ? Math.min(...victories.map((r) => r.turnCount))
      : Infinity;

    const longestExpedition = Math.max(...history.map((r) => r.turnCount), 0);

    // Compute favorite seed (most common)
    const seedCounts: Record<number, number> = {};
    let favoriteSeed = history[0]?.seed || 0;
    let maxCount = 0;
    history.forEach((r) => {
      seedCounts[r.seed] = (seedCounts[r.seed] || 0) + 1;
      if (seedCounts[r.seed] > maxCount) {
        maxCount = seedCounts[r.seed];
        favoriteSeed = r.seed;
      }
    });

    setGameStats({
      totalRuns,
      victoryCount,
      bestScore,
      averageScore,
      fastestVictory,
      longestExpedition,
      favoriteSeed,
    });
  };

  // Start a new expedition
  const handleStartGame = (selectedLoadout: StartingLoadout, selectedSeed: number) => {
    setLoadout(selectedLoadout);
    setSeed(selectedSeed);
    setTurnCount(1);
    setSystemIndex(1);

    // Calculate starting resources based on loadout bonuses
    const startRes = { ...BASE_RESOURCES };
    Object.entries(selectedLoadout.bonusResources).forEach(([key, val]) => {
      const k = key as keyof Resources;
      startRes[k] = (startRes[k] || 0) + (val || 0);
    });

    setResources(startRes);
    setActiveModifiers([]);
    setNewAchievementsThisRun([]);
    setIsVictory(false);

    // Seeded sequence setup
    generateTurnContent(selectedSeed, 1, 1, selectedLoadout.id);
    setGameState('playing');
  };

  // Generate deterministic event and planet for the current turn
  const generateTurnContent = (currentSeed: number, turn: number, systemIdx: number, loadoutId: string) => {
    // 1. Generate Planet
    const planetRNG = createRNG(currentSeed * 73 + turn * 97);
    const generatedPlanet = generatePlanet(planetRNG, systemIdx);
    setCurrentPlanet(generatedPlanet);

    // 2. Select Event deterministically from seed and turn count to avoid duplication
    const globalRNG = createRNG(currentSeed);
    const shuffledEvents = globalRNG.shuffle([...GAME_EVENTS]);
    const eventIdx = (turn - 1) % shuffledEvents.length;
    setCurrentEvent(shuffledEvents[eventIdx]);
  };

  // Triggered when an event choice is resolved
  const handleChoiceSelected = (choice: EventChoice) => {
    // 1. Apply costs/rewards, scaling with loadout perks
    setResources((prev) => {
      const next = { ...prev };
      
      const cost = choice.cost || {};
      const reward = choice.reward || {};

      // Apply costs
      Object.entries(cost).forEach(([key, val]) => {
        const k = key as keyof Resources;
        next[k] = Math.max(0, (next[k] || 0) - (val || 0));
      });

      // Apply rewards, modifying with specific loadout traits
      Object.entries(reward).forEach(([key, val]) => {
        const k = key as keyof Resources;
        let finalVal = val || 0;

        // TACTICAL DISCIPLINE (Military Escort: Halves hull or morale damage)
        if (loadout?.id === 'military_escort' && finalVal < 0 && (k === 'hull' || k === 'morale')) {
          finalVal = Math.floor(finalVal / 2);
        }

        // ANOMALY MATRIX (Research Vessel: Doubles Science rewards)
        if (loadout?.id === 'research_vessel' && finalVal > 0 && k === 'science') {
          finalVal = finalVal * 2;
        }

        // CIVILIAN POPULACE (Generation Ship: Doubles morale boosts)
        if (loadout?.id === 'generation_ship' && finalVal > 0 && k === 'morale') {
          finalVal = finalVal * 2;
        }

        next[k] = Math.max(0, (next[k] || 0) + finalVal);
      });

      return next;
    });

    // 2. Add modifier if any
    if (choice.modifierAdded) {
      setActiveModifiers((prev) => [...prev, choice.modifierAdded as ActiveModifier]);
    }
  };

  // Upkeep consumption and transitioning to Scanning phase
  const handleCompleteEventPhase = () => {
    // 1. Process upkeep
    const isGenerationShip = loadout?.id === 'generation_ship';
    const upkeepSupplies = isGenerationShip ? 4 : 2;
    const upkeepFuel = 1;

    setResources((prev) => {
      const next = { ...prev };
      
      // Deduct standard fuel upkeep
      next.fuel = Math.max(0, next.fuel - upkeepFuel);

      // Deduct supplies upkeep
      if (next.supplies >= upkeepSupplies) {
        next.supplies -= upkeepSupplies;
      } else {
        // Starving penalty: reduce morale rapidly
        next.supplies = 0;
        next.morale = Math.max(0, next.morale - 15);
      }

      // 2. Process active modifiers (effects and duration decrement)
      const expiredModIds: string[] = [];
      
      setActiveModifiers((currentMods) => {
        return currentMods.map((mod) => {
          // Apply per-turn ticks
          Object.entries(mod.effects).forEach(([key, val]) => {
            const k = key as keyof Resources;
            next[k] = Math.max(0, (next[k] || 0) + (val || 0));
          });

          // Decrement duration
          if (mod.duration > 0) {
            const nextDuration = mod.duration - 1;
            if (nextDuration === 0) {
              expiredModIds.push(mod.id);
            }
            return { ...mod, duration: nextDuration };
          }
          return mod;
        }).filter((mod) => mod.duration !== 0);
      });

      // 3. Increment score slightly for surviving another turn
      next.score += 50;

      return next;
    });

    // Check Immediate Defeat conditions
    setTimeout(() => {
      setResources((currentRes) => {
        if (currentRes.crew <= 0 || currentRes.hull <= 0 || currentRes.morale <= 0 || (currentRes.fuel <= 0 && currentRes.supplies <= 0)) {
          triggerDefeat(currentRes);
        } else {
          setGameState('scanning');
        }
        return currentRes;
      });
    }, 10);
  };

  // Upgrades current planet scan level
  const handleScanPlanet = (targetLevel: number) => {
    const isExplorer = loadout?.id === 'explorer';
    const costSupplies = targetLevel === 1 ? (isExplorer ? 1 : 2) : (isExplorer ? 2 : 4);
    const costScience = targetLevel === 1 ? (isExplorer ? 1 : 2) : (isExplorer ? 2 : 5);

    setResources((prev) => ({
      ...prev,
      supplies: Math.max(0, prev.supplies - costSupplies),
      science: Math.max(0, prev.science - costScience),
    }));

    setCurrentPlanet((prev) => {
      if (!prev) return null;
      return { ...prev, scanLevel: targetLevel };
    });
  };

  // Jump to next star system (burns fuel, triggers next turn)
  const handleJumpNextSystem = () => {
    setResources((prev) => ({
      ...prev,
      fuel: Math.max(0, prev.fuel - 10),
    }));

    const nextTurn = turnCount + 1;
    const nextSystem = systemIndex + 1;
    setTurnCount(nextTurn);
    setSystemIndex(nextSystem);

    generateTurnContent(seed, nextTurn, nextSystem, loadout?.id || 'explorer');
    setGameState('playing');
  };

  // Triggered when establishing a colony on the current candidate planet
  const handleEstablishColony = () => {
    if (!currentPlanet || !loadout) return;

    const runRNG = createRNG(seed * 2 + turnCount * 3);
    const colonyGenName = generateColonyName(runRNG, currentPlanet.name);
    const outcome = generateColonyOutcome(resources, currentPlanet, turnCount, loadout.id, runRNG);

    const score = calculateExpeditionScore(resources, currentPlanet.suitability, turnCount, true);

    setColonyName(colonyGenName);
    setColonyTraits(outcome);
    setFinalScore(score);
    setIsVictory(true);

    const record: RunRecord = {
      id: Math.random().toString(36).substr(2, 9),
      seed,
      date: new Date().toLocaleDateString(),
      turnCount,
      finalScore: score,
      colonyName: colonyGenName,
      colonyType: `${outcome.outcome} ${outcome.society} ${outcome.government}`,
      planetName: currentPlanet.name,
      planetSuitability: currentPlanet.suitability,
      loadoutName: loadout.name,
      outcomeText: outcome.narrative,
      victory: true,
    };

    saveRunRecord(record);
  };

  // Handle immediate mission failure
  const triggerDefeat = (lastRes: Resources) => {
    const score = calculateExpeditionScore(lastRes, 0, turnCount, false);
    setFinalScore(score);
    setIsVictory(false);

    const record: RunRecord = {
      id: Math.random().toString(36).substr(2, 9),
      seed,
      date: new Date().toLocaleDateString(),
      turnCount,
      finalScore: score,
      colonyName: 'N/A',
      colonyType: 'Destroyed / Lost in Space',
      planetName: currentPlanet?.name || 'Unknown Deep Space',
      planetSuitability: 0,
      loadoutName: loadout?.name || 'Explorer Expedition',
      outcomeText: 'Expedition flagship structural failure. All crew contact lost.',
      victory: false,
    };

    saveRunRecord(record);
  };

  // Commit record to history list and process achievements
  const saveRunRecord = (record: RunRecord) => {
    const updatedHistory = [record, ...runHistory];
    setRunHistory(updatedHistory);
    localStorage.setItem('pioneer_directive_history', JSON.stringify(updatedHistory));
    recalculateStats(updatedHistory);

    // Check achievement locks
    const activeAchievements = achievements.map((a) => a.id);
    const newlyUnlockedIds = checkAchievements(
      updatedHistory,
      record,
      resources,
      turnCount,
      currentPlanet,
      achievements.filter((a) => a.unlocked).map((a) => a.id)
    );

    if (newlyUnlockedIds.length > 0) {
      const unlockedNames: string[] = [];
      setAchievements((prev) =>
        prev.map((ach) => {
          if (newlyUnlockedIds.includes(ach.id)) {
            unlockedNames.push(ach.name);
            return { ...ach, unlocked: true, unlockedAt: new Date().toLocaleDateString() };
          }
          return ach;
        })
      );

      setNewAchievementsThisRun(unlockedNames);

      // Save unlocked IDs in LocalStorage
      const totalUnlockedIds = [
        ...achievements.filter((a) => a.unlocked).map((a) => a.id),
        ...newlyUnlockedIds,
      ];
      localStorage.setItem('pioneer_directive_achievements', JSON.stringify(totalUnlockedIds));
    }

    setGameState('ending');
  };

  // Custom Industrial fleet fabrication repair action
  const handleIndustrialFabrication = () => {
    if (resources.industry >= 10 && resources.hull < 100) {
      setResources((prev) => ({
        ...prev,
        industry: prev.industry - 10,
        hull: Math.min(100, prev.hull + 15),
      }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* 1. Setup / Fleet Selection Menu */}
      {gameState === 'setup' ? (
        <div className="flex-1 flex flex-col justify-center">
          <div className="mx-auto max-w-7xl text-center p-4 mt-6">
            <h1 className="font-mono text-3xl font-black tracking-widest text-cyan-400 flex items-center justify-center gap-3">
              <Globe className="h-8 w-8 text-cyan-400 animate-pulse" /> PIONEER DIRECTIVE
            </h1>
            <p className="font-mono text-xs text-slate-500 mt-2 uppercase tracking-widest">
              Extrasolar Colony Expedition Terminal / Standard protocol v2.4
            </p>
          </div>

          <LoadoutSelection
            onStartGame={handleStartGame}
            runHistory={runHistory}
            gameStats={gameStats}
            achievements={achievements}
          />
        </div>
      ) : (
        /* 2. Gameplay Area (playing, scanning, ending) */
        <div className="flex-1 flex flex-col">
          <DashboardHeader
            shipName={loadout?.id === 'generation_ship' ? 'Astraea Supercarrier' : 'Pioneer Pathfinder'}
            loadoutName={loadout?.name || ''}
            turnCount={turnCount}
            seed={seed}
            resources={resources}
            onReset={() => {
              if (window.confirm('Aborting the expedition will delete all current progress. Proceed?')) {
                setGameState('setup');
              }
            }}
          />

          <main className="flex-1 mx-auto max-w-7xl w-full grid grid-cols-1 gap-6 p-4 lg:grid-cols-12 items-start">
            
            {/* Center Area (8 Column unit): Current Event / Planet scan / Colony Report */}
            <div className="lg:col-span-8">
              {gameState === 'playing' && currentEvent && (
                <div className="flex flex-col gap-4">
                  <EventCardView
                    event={currentEvent}
                    resources={resources}
                    onChoiceSelected={handleChoiceSelected}
                  />
                  {/* Phase bridge button */}
                  <button
                    onClick={handleCompleteEventPhase}
                    className="flex items-center justify-center gap-1.5 rounded bg-slate-900 border border-slate-800 py-3 font-mono text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:border-slate-700 transition-all"
                  >
                    Transition to Sector Scanners
                  </button>
                </div>
              )}

              {gameState === 'scanning' && currentPlanet && (
                <PlanetScannerView
                  planet={currentPlanet}
                  resources={resources}
                  isExplorerLoadout={loadout?.id === 'explorer'}
                  onScan={handleScanPlanet}
                  onColonize={handleEstablishColony}
                  onJump={handleJumpNextSystem}
                />
              )}

              {gameState === 'ending' && (
                <ColonyReportView
                  isVictory={isVictory}
                  resources={resources}
                  planet={currentPlanet}
                  turnCount={turnCount}
                  colonyName={colonyName}
                  government={colonyTraits.government}
                  society={colonyTraits.society}
                  outcome={colonyTraits.outcome}
                  narrative={colonyTraits.narrative}
                  finalScore={finalScore}
                  newAchievements={newAchievementsThisRun}
                  seed={seed}
                  onRestart={() => setGameState('setup')}
                />
              )}
            </div>

            {/* Sidebar Area (4 Column unit): Resources + Active traits */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <ResourcePanel
                resources={resources}
                upkeepFuel={1}
                upkeepSupplies={loadout?.id === 'generation_ship' ? 4 : 2}
                activeModifiers={activeModifiers}
              />

              {/* Special Action: Industrial automated repairs */}
              {loadout?.id === 'industrial' && gameState !== 'ending' && (
                <div className="rounded border border-cyan-500/30 bg-cyan-950/5 p-4 font-mono text-xs">
                  <h3 className="font-bold text-cyan-400 mb-1">★ Automated Fabrication Perk</h3>
                  <p className="text-[11px] text-slate-400 leading-normal mb-3">
                    Your industrial drills and welding units allow direct structural repair. Spend 10 industry to repair 15 hull integrity.
                  </p>
                  <button
                    onClick={handleIndustrialFabrication}
                    disabled={resources.industry < 10 || resources.hull >= 100}
                    className={`w-full py-2 rounded text-center font-bold text-[10px] uppercase border transition-all ${
                      resources.industry >= 10 && resources.hull < 100
                        ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/40'
                        : 'border-slate-900 bg-slate-950 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    Repair Hull (+15)
                  </button>
                </div>
              )}
            </div>

          </main>
        </div>
      )}

      {/* Page Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 p-3 text-center font-mono text-[10px] text-slate-600">
        Pioneer Directive © 2026. Designed for AI-Augmented Strategy Demonstrations.
      </footer>
    </div>
  );
}
