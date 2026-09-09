import React, { useState } from 'react';
import { Play, Sparkles, Award, History, Info, ChevronRight, HelpCircle, BookOpen } from 'lucide-react';
import { STARTING_LOADOUTS } from '../data/gameContent';
import { StartingLoadout, RunRecord, GameStats, Achievement } from '../types';
import { generateRandomSeed } from '../utils/rng';

interface LoadoutSelectionProps {
  onStartGame: (loadout: StartingLoadout, seed: number) => void;
  runHistory: RunRecord[];
  gameStats: GameStats;
  achievements: Achievement[];
}

export const LoadoutSelection: React.FC<LoadoutSelectionProps> = ({
  onStartGame,
  runHistory,
  gameStats,
  achievements,
}) => {
  const [selectedLoadout, setSelectedLoadout] = useState<StartingLoadout>(STARTING_LOADOUTS[0]);
  const [seed, setSeed] = useState<number>(generateRandomSeed());
  const [customSeedInput, setCustomSeedInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'launch' | 'history' | 'achievements'>('launch');

  const handleRandomSeed = () => {
    const s = generateRandomSeed();
    setSeed(s);
    setCustomSeedInput('');
  };

  const handleSeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // Numeric only
    setCustomSeedInput(val);
    if (val) {
      setSeed(parseInt(val, 10));
    }
  };

  const handleLaunch = () => {
    const finalSeed = customSeedInput ? parseInt(customSeedInput, 10) : seed;
    onStartGame(selectedLoadout, finalSeed);
  };

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-4 lg:grid-cols-12">
      {/* LEFT COLUMN: 8 Units width - Launch settings or history */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 p-1 rounded">
          <button
            onClick={() => setActiveTab('launch')}
            className={`flex flex-1 items-center justify-center gap-2 py-2.5 font-mono text-xs font-bold uppercase tracking-wider rounded transition-all ${
              activeTab === 'launch'
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-900/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Play className="h-4 w-4" /> Launch Expedition
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-1 items-center justify-center gap-2 py-2.5 font-mono text-xs font-bold uppercase tracking-wider rounded transition-all ${
              activeTab === 'history'
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-900/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="h-4 w-4" /> Run Log ({runHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`flex flex-1 items-center justify-center gap-2 py-2.5 font-mono text-xs font-bold uppercase tracking-wider rounded transition-all ${
              activeTab === 'achievements'
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-900/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="h-4 w-4" /> Achievements ({unlockedCount}/{achievements.length})
          </button>
        </div>

        {/* TAB 1: Launch Configuration */}
        {activeTab === 'launch' && (
          <div className="flex flex-col gap-6">
            {/* Step 1: Seed Entry */}
            <div className="rounded border border-slate-800 bg-slate-950 p-5">
              <h2 className="mb-4 font-mono text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" /> 1. Configure Gravity Seed
              </h2>
              <p className="font-mono text-xs text-slate-400 mb-4 leading-relaxed">
                The numeric seed initializes the quantum coordinates of the stellar sector, governing all stars, events, anomalies, and planetary properties. Enter any number or roll a randomized cosmic seed.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={customSeedInput || seed.toString()}
                    onChange={handleSeedChange}
                    maxLength={9}
                    placeholder="Enter Custom Seed..."
                    className="w-full rounded border border-slate-800 bg-slate-900 py-2.5 pl-3 pr-10 font-mono text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <span className="absolute right-3 top-2.5 font-mono text-[10px] text-slate-500 select-none uppercase">
                    Seed
                  </span>
                </div>
                <button
                  onClick={handleRandomSeed}
                  className="rounded border border-cyan-950 bg-cyan-950/20 px-4 py-2.5 font-mono text-xs font-bold text-cyan-400 hover:bg-cyan-950/40 transition-all"
                >
                  Generate Random
                </button>
              </div>
            </div>

            {/* Step 2: Choose Loadout */}
            <div className="rounded border border-slate-800 bg-slate-950 p-5">
              <h2 className="mb-4 font-mono text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-cyan-400" /> 2. Commission Colony Fleet Loadout
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {STARTING_LOADOUTS.map((loadout) => (
                  <button
                    key={loadout.id}
                    onClick={() => setSelectedLoadout(loadout)}
                    className={`flex flex-col text-left rounded border p-4 transition-all ${
                      selectedLoadout.id === loadout.id
                        ? 'border-cyan-400 bg-cyan-950/10 shadow-lg shadow-cyan-950/20'
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-bold text-white">{loadout.name}</span>
                      {selectedLoadout.id === loadout.id && (
                        <span className="rounded bg-cyan-950 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan-400 border border-cyan-800/50">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[11px] leading-relaxed text-slate-400 flex-1 mb-3">
                      {loadout.description}
                    </p>

                    {/* Resources modifications display */}
                    <div className="mb-3 flex flex-wrap gap-x-2 gap-y-1 rounded bg-slate-950/50 p-2 font-mono text-[10px] border border-slate-900">
                      {Object.entries(loadout.bonusResources).map(([key, val]) => {
                        const sign = val > 0 ? '+' : '';
                        const color = val > 0 ? 'text-emerald-400' : 'text-rose-400';
                        return (
                          <span key={key} className={color}>
                            {key.toUpperCase()}: {sign}
                            {val}
                          </span>
                        );
                      })}
                    </div>

                    {/* Trait indicator */}
                    <div className="border-t border-slate-800/80 pt-2 flex items-start gap-1.5 font-mono text-[11px]">
                      <span className="text-amber-400 font-bold">★ {loadout.trait}:</span>
                      <span className="text-slate-400 text-[10px]">{loadout.traitDescription}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Launch Action */}
            <button
              onClick={handleLaunch}
              className="flex items-center justify-center gap-2 rounded bg-cyan-500 py-3.5 font-mono text-sm font-extrabold uppercase tracking-widest text-slate-950 shadow-lg shadow-cyan-950/30 hover:bg-cyan-400 active:scale-[0.99] transition-all"
            >
              <Play className="h-4 w-4 fill-slate-950" /> Launch Directive
            </button>
          </div>
        )}

        {/* TAB 2: Run Log history */}
        {activeTab === 'history' && (
          <div className="rounded border border-slate-800 bg-slate-950 p-5">
            <h2 className="mb-4 font-mono text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <History className="h-4 w-4" /> Seed Expedition Records
            </h2>

            {runHistory.length === 0 ? (
              <div className="rounded border border-dashed border-slate-800 py-12 text-center">
                <HelpCircle className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                <p className="font-mono text-xs text-slate-500 leading-relaxed">
                  No completed runs in telemetry bank yet. <br />
                  Launch your first star expedition and build a thriving colony!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
                {runHistory.map((run) => (
                  <div
                    key={run.id}
                    className="flex flex-col gap-3 rounded border border-slate-800 bg-slate-900/40 p-4 font-mono text-xs hover:bg-slate-900/60 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                            run.victory
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30'
                              : 'bg-rose-950/40 text-rose-400 border border-rose-900/30'
                          }`}
                        >
                          {run.victory ? 'COLONY ESTABLISHED' : 'SHATTERED'}
                        </span>
                        <span className="text-slate-400 text-[10px]">Turn {run.turnCount}</span>
                      </div>
                      <span className="text-slate-500 text-[10px]">{run.date}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 md:grid-cols-4">
                      <div>
                        <p className="text-[10px] uppercase text-slate-500 mb-0.5">Colony Entity</p>
                        <p className="font-bold text-white leading-tight">{run.colonyName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-500 mb-0.5">Planet Found</p>
                        <p className="text-cyan-400 leading-tight">
                          {run.planetName} ({run.planetSuitability}% suitability)
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-500 mb-0.5">Commissioned Fleet</p>
                        <p className="text-slate-400 leading-tight">{run.loadoutName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase text-slate-500 mb-0.5">Final Score</p>
                        <p className="font-bold text-amber-400 text-sm leading-tight">{run.finalScore}</p>
                      </div>
                    </div>

                    <div className="rounded bg-slate-950 p-2.5 text-[10px] leading-relaxed text-slate-400 border border-slate-900">
                      {run.outcomeText}
                    </div>

                    <div className="flex items-center justify-end gap-2 text-[10px]">
                      <span className="text-slate-500">SEED: {run.seed}</span>
                      <button
                        onClick={() => {
                          const l = STARTING_LOADOUTS.find((lo) => lo.name === run.loadoutName) || STARTING_LOADOUTS[0];
                          onStartGame(l, run.seed);
                        }}
                        className="flex items-center gap-1 border border-cyan-950 bg-cyan-950/10 px-2 py-0.5 rounded text-cyan-400 hover:bg-cyan-950/30 transition-all"
                      >
                        Replay Seed <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Achievements List */}
        {activeTab === 'achievements' && (
          <div className="rounded border border-slate-800 bg-slate-950 p-5">
            <h2 className="mb-4 font-mono text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Award className="h-4 w-4" /> Pioneer Directive Badges
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`flex items-start gap-3.5 rounded border p-4 font-mono text-xs ${
                    achievement.unlocked
                      ? 'border-cyan-950/60 bg-cyan-950/10 shadow-inner'
                      : 'border-slate-900 bg-slate-900/10 opacity-60'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                      achievement.unlocked
                        ? 'border-cyan-500 bg-cyan-950 text-cyan-400'
                        : 'border-slate-800 bg-slate-950 text-slate-600'
                    }`}
                  >
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-bold ${achievement.unlocked ? 'text-white' : 'text-slate-500'}`}>
                        {achievement.name}
                      </span>
                      {achievement.unlocked && (
                        <span className="rounded bg-cyan-950 px-1.5 py-0.2 font-mono text-[8px] uppercase tracking-wider text-cyan-400 border border-cyan-800/30">
                          Unlocked
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">{achievement.description}</p>
                    {achievement.unlockedAt && (
                      <p className="text-[9px] text-slate-500">Unlocked: {achievement.unlockedAt}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: 4 Units width - Stats / Tutorial Panel */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        {/* Run Telemetry Summary stats */}
        <div className="rounded border border-slate-800 bg-slate-950 p-4">
          <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
            Telemetry Bank
          </h2>
          <div className="flex flex-col gap-3 font-mono text-xs">
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span className="text-slate-500">Expeditions Logged</span>
              <span className="font-bold text-white">{gameStats.totalRuns}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span className="text-slate-500">Colonies Formed</span>
              <span className="font-bold text-emerald-400">{gameStats.victoryCount}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span className="text-slate-500">Peak Suitability Score</span>
              <span className="font-bold text-amber-400">{gameStats.bestScore}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span className="text-slate-500">Average Score</span>
              <span className="font-bold text-slate-300">{gameStats.averageScore}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span className="text-slate-500">Fastest Settlement</span>
              <span className="font-bold text-white">
                {gameStats.fastestVictory === Infinity ? 'N/A' : `${gameStats.fastestVictory} turns`}
              </span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-slate-500">Longest Journey</span>
              <span className="font-bold text-white">
                {gameStats.longestExpedition === 0 ? 'N/A' : `${gameStats.longestExpedition} turns`}
              </span>
            </div>
          </div>
        </div>

        {/* Tutorial / Mission Manual */}
        <div className="rounded border border-slate-800 bg-slate-950 p-4">
          <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
            Directive Mission Manual
          </h2>
          <div className="flex flex-col gap-3 font-mono text-[11px] leading-relaxed text-slate-400">
            <p>
              Your mission is to guide your flagship through deep space to find a hospitable extrasolar world and establish a self-sustaining colony.
            </p>
            <div className="border-l-2 border-cyan-500 pl-2 text-slate-300">
              <p className="font-bold text-cyan-400 mb-0.5">Resources & Upkeep</p>
              Every turn consumes <span className="text-amber-400">Fuel</span> and <span className="text-amber-400">Supplies</span>. If supplies run out, morale drops rapidly. If Crew or Hull hits 0, the mission fails immediately.
            </div>
            <div className="border-l-2 border-cyan-500 pl-2 text-slate-300">
              <p className="font-bold text-cyan-400 mb-0.5">The Jump Loop</p>
              Resolve random encounters on each turn, then review the scanned candidate planet of the local star system. You can land to colonize, or jump to the next sector (burning fuel) to find a better planet.
            </div>
            <div className="border-l-2 border-cyan-500 pl-2 text-slate-300">
              <p className="font-bold text-cyan-400 mb-0.5">Colony Outcome</p>
              Your final score and the colony traits (Government, Society, Outcome) are procedurally computed from your ending resources, remaining crew, and planet quality. Aim for a <span className="text-emerald-400 font-bold">Legendary Prosperous Technocracy</span>!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
