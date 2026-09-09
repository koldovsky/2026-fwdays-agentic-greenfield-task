import React from 'react';
import { Shield, Award, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import { Resources } from '../types';

interface DashboardHeaderProps {
  shipName: string;
  loadoutName: string;
  turnCount: number;
  seed: number;
  resources: Resources;
  onReset: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  shipName,
  loadoutName,
  turnCount,
  seed,
  resources,
  onReset,
}) => {
  const getHullColor = (hull: number) => {
    if (hull <= 25) return 'text-rose-500 border-rose-900 bg-rose-950/20';
    if (hull <= 50) return 'text-amber-500 border-amber-900 bg-amber-950/20';
    return 'text-emerald-400 border-emerald-950 bg-emerald-950/10';
  };

  const getReputationLabel = (rep: number) => {
    if (rep >= 80) return { label: 'Honored', color: 'text-cyan-400' };
    if (rep >= 50) return { label: 'Trusted', color: 'text-blue-400' };
    if (rep >= 25) return { label: 'Neutral', color: 'text-slate-400' };
    return { label: 'Pirated/Outlaw', color: 'text-rose-500' };
  };

  const repInfo = getReputationLabel(resources.reputation);

  return (
    <header className="border-b border-slate-800 bg-slate-950 p-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left Side: Ship Name & Seed */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-xl font-bold tracking-tight text-white">
              {shipName} <span className="text-xs font-normal text-slate-500">[{loadoutName}]</span>
            </h1>
            <span className="flex items-center gap-1 rounded bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-cyan-400 border border-cyan-950">
              SEED: {seed}
            </span>
          </div>
          <p className="font-mono text-xs text-slate-400">
            Directive status: Exploring sector. Establish permanent settlement.
          </p>
        </div>

        {/* Center/Right: Key Metrics */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          {/* Turn Counter */}
          <div className="flex flex-col items-center border border-slate-800 bg-slate-900/50 px-4 py-2 rounded">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Turn</span>
            <span className="font-mono text-xl font-semibold text-cyan-400">{turnCount}</span>
          </div>

          {/* Hull Integrity */}
          <div className={`flex items-center gap-3 border px-4 py-2 rounded ${getHullColor(resources.hull)}`}>
            <Shield className="h-5 w-5" />
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-wider opacity-60">Hull Integrity</span>
              <span className="font-mono text-lg font-bold">{resources.hull}%</span>
            </div>
            {resources.hull <= 25 && (
              <AlertTriangle className="h-4 w-4 animate-pulse text-rose-500 ml-1" />
            )}
          </div>

          {/* Reputation */}
          <div className="flex items-center gap-3 border border-slate-800 bg-slate-900/50 px-4 py-2 rounded">
            <Users className="h-5 w-5 text-slate-400" />
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Reputation</span>
              <span className={`font-mono text-sm font-semibold ${repInfo.color}`}>{repInfo.label} ({resources.reputation})</span>
            </div>
          </div>

          {/* Expedition Score */}
          <div className="flex items-center gap-3 border border-slate-800 bg-slate-900/50 px-4 py-2 rounded">
            <Award className="h-5 w-5 text-amber-500" />
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Score</span>
              <span className="font-mono text-lg font-bold text-amber-400">{resources.score}</span>
            </div>
          </div>

          {/* Restart button */}
          <button
            onClick={onReset}
            className="flex items-center justify-center rounded border border-slate-800 p-2 text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
            title="Abortion of expedition / Restart"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
