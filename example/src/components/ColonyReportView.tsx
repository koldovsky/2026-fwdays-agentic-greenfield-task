import React, { useState } from 'react';
import { Award, Share2, RefreshCw, Home, Compass, ShieldAlert, HeartPulse, Sparkles, CheckCircle2 } from 'lucide-react';
import { Resources, Planet } from '../types';

interface ColonyReportViewProps {
  isVictory: boolean;
  resources: Resources;
  planet: Planet | null;
  turnCount: number;
  colonyName: string;
  government: string;
  society: string;
  outcome: string;
  narrative: string;
  finalScore: number;
  newAchievements: string[];
  seed: number;
  onRestart: () => void;
}

export const ColonyReportView: React.FC<ColonyReportViewProps> = ({
  isVictory,
  resources,
  planet,
  turnCount,
  colonyName,
  government,
  society,
  outcome,
  narrative,
  finalScore,
  newAchievements,
  seed,
  onRestart,
}) => {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const text = `Pioneer Directive Expedition completed!\n\nColony: ${colonyName}\nResult: ${outcome} ${society} ${government}\nScore: ${finalScore} pts\nFounded on Turn ${turnCount} with SEED: ${seed}\n\nCan you beat my colony score? Play at ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreBreakdown = () => {
    if (!isVictory) {
      return [
        { label: 'Defeat Consolidation Base', value: turnCount * 50 },
        { label: 'Science Data Scavenged', value: resources.science * 2 },
        { label: 'Industrial Metallurgy Salvaged', value: resources.industry * 2 },
      ];
    }

    return [
      { label: 'Directive Settlement Base', value: 2000 },
      { label: `Planet Suitability Bonus (${planet?.suitability || 0}%)`, value: (planet?.suitability || 0) * 50 },
      { label: `Crew Preservation (${resources.crew} survivors)`, value: resources.crew * 100 },
      { label: `Supplies Surplus (${resources.supplies} units)`, value: resources.supplies * 10 },
      { label: `Remaining Fuel Reserves (${resources.fuel} units)`, value: resources.fuel * 8 },
      { label: `Hull Structural Safety (${resources.hull}% remaining)`, value: resources.hull * 10 },
      { label: `Sector Reputation Rating (${resources.reputation} rep)`, value: resources.reputation * 15 },
      { label: `Chronometer Efficiency Bonus (Turn ${turnCount})`, value: Math.max(0, (50 - turnCount) * 40) },
    ];
  };

  const breakdown = getScoreBreakdown();

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className={`rounded border p-6 bg-slate-950 shadow-2xl flex flex-col gap-6 ${
        isVictory ? 'border-emerald-500/50 shadow-emerald-950/10' : 'border-rose-500/50 shadow-rose-950/10'
      }`}>
        
        {/* Banner header */}
        <div className="text-center flex flex-col items-center border-b border-slate-900 pb-5">
          <div className={`mb-3 flex h-16 w-16 items-center justify-center rounded-full border ${
            isVictory ? 'border-emerald-500 bg-emerald-950/30 text-emerald-400' : 'border-rose-500 bg-rose-950/30 text-rose-400'
          }`}>
            {isVictory ? <Home className="h-8 w-8 animate-bounce" /> : <ShieldAlert className="h-8 w-8 text-rose-500" />}
          </div>
          
          <h1 className="font-mono text-xs font-bold uppercase tracking-widest text-slate-500">
            Directive Resolution Record
          </h1>
          
          <h2 className={`font-mono text-2xl font-black mt-1 ${isVictory ? 'text-emerald-400' : 'text-rose-500'}`}>
            {isVictory ? 'MISSION ACCOMPLISHED' : 'FLEET CONTACT LOST'}
          </h2>
          
          {isVictory && (
            <p className="font-mono text-sm font-semibold text-white mt-1">
              {colonyName}
            </p>
          )}
        </div>

        {/* Narrative / Ending Box */}
        <div className="rounded border border-slate-900 bg-slate-900/40 p-5 font-mono text-xs text-slate-300 leading-relaxed max-h-[300px] overflow-y-auto">
          {isVictory ? (
            <div className="whitespace-pre-line">{narrative}</div>
          ) : (
            <div>
              <p className="font-bold text-rose-400 mb-2">Emergency Log Entry #999-E:</p>
              <p className="mb-3">
                The expedition ship has met a catastrophic failure on turn {turnCount}. Systems went dark in deep space coordinates after resources collapsed.
              </p>
              <p className="text-slate-500">
                Primary failure vectors identified:
                {resources.crew <= 0 && <span className="block mt-1 text-rose-400">● Crew population fully depleted. Life support system registered 0 vital signs.</span>}
                {resources.hull <= 0 && <span className="block mt-1 text-rose-400">● Hull integrity critical structure failure. Kinetic explosion of engineering bay.</span>}
                {resources.morale <= 0 && <span className="block mt-1 text-rose-400">● Fleet morale reached absolute zero. Complete mutiny of civil and military command.</span>}
                {resources.fuel <= 0 && resources.supplies <= 0 && <span className="block mt-1 text-rose-400">● Fuel and Food depleted. Ship drifted lifelessly into stellar gravity wells.</span>}
              </p>
              <p className="mt-4 italic text-slate-400">
                Command headquarters has archived the scientific data retrieved by remote array relays. A second probe fleet is recommended.
              </p>
            </div>
          )}
        </div>

        {/* Score Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Column: Metrics and Traits */}
          <div className="rounded border border-slate-900 bg-slate-900/20 p-4 font-mono text-xs flex flex-col gap-4">
            <h3 className="font-bold uppercase tracking-wider text-cyan-400 border-b border-slate-900 pb-1.5 flex items-center gap-1.5">
              <Compass className="h-4 w-4" /> Settlement Parameters
            </h3>

            {isVictory ? (
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Governance Type</span>
                  <span className="font-bold text-white text-right">{government}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Societal Axioms</span>
                  <span className="font-bold text-cyan-400 text-right">{society}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stability Outcome</span>
                  <span className="font-bold text-amber-400 text-right">{outcome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Planet Name</span>
                  <span className="font-bold text-slate-300 text-right">{planet?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Planet Suitability</span>
                  <span className="font-bold text-emerald-400 text-right">{planet?.suitability}%</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 text-slate-500 italic">
                <p>Telemetry recorded prior to impact:</p>
                <div className="flex justify-between font-normal text-slate-400 mt-1">
                  <span>Science Accumulation</span>
                  <span>{resources.science} units</span>
                </div>
                <div className="flex justify-between font-normal text-slate-400">
                  <span>Industry Materials</span>
                  <span>{resources.industry} units</span>
                </div>
                <div className="flex justify-between font-normal text-slate-400">
                  <span>Expedition Duration</span>
                  <span>{turnCount} Jumps</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Score Ledger */}
          <div className="rounded border border-slate-900 bg-slate-900/20 p-4 font-mono text-xs flex flex-col gap-3">
            <h3 className="font-bold uppercase tracking-wider text-cyan-400 border-b border-slate-900 pb-1.5 flex items-center gap-1.5">
              <Award className="h-4 w-4 text-cyan-400" /> Score Reconciliation Ledger
            </h3>

            <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
              {breakdown.map((item, idx) => (
                <div key={idx} className="flex justify-between border-b border-slate-900 pb-1">
                  <span className="text-slate-500 text-[11px]">{item.label}</span>
                  <span className="font-semibold text-slate-300">+{item.value}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-2.5 mt-auto">
              <span className="text-sm font-bold uppercase text-white">Final Score</span>
              <span className="text-xl font-black text-amber-400">{finalScore}</span>
            </div>
          </div>
        </div>

        {/* Newly Unlocked Achievements Toast Panel */}
        {newAchievements.length > 0 && (
          <div className="rounded border border-cyan-500 bg-cyan-950/10 p-4 font-mono text-xs text-white">
            <h4 className="font-bold text-cyan-400 flex items-center gap-1.5 mb-2">
              <Sparkles className="h-4 w-4 animate-pulse text-cyan-400" /> Telemetry Badges Unlocked!
            </h4>
            <div className="flex flex-col gap-2">
              {newAchievements.map((badge, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="font-semibold">{badge}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footers sharing buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 border-t border-slate-900 pt-5 mt-2">
          <div className="text-left font-mono text-[10px] text-slate-500 flex-1">
            Replay seed code <span className="text-slate-400 font-bold">#{seed}</span> anytime.
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={handleShare}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded border border-slate-800 bg-slate-900/60 px-5 py-2.5 font-mono text-xs font-semibold text-white hover:bg-slate-900 hover:text-cyan-400 transition-colors"
            >
              <Share2 className="h-4 w-4" /> {copied ? 'Copied Details!' : 'Copy Seed Summary'}
            </button>
            <button
              onClick={onRestart}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded bg-cyan-500 px-6 py-2.5 font-mono text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> New Expedition
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
