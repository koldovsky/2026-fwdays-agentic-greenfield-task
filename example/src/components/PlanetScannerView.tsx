import React from 'react';
import { Globe, Search, ArrowRight, Home, HelpCircle, ShieldAlert, Sparkles, AlertTriangle } from 'lucide-react';
import { Planet, Resources } from '../types';

interface PlanetScannerViewProps {
  planet: Planet;
  resources: Resources;
  isExplorerLoadout: boolean;
  onScan: (level: number) => void;
  onColonize: () => void;
  onJump: () => void;
}

export const PlanetScannerView: React.FC<PlanetScannerViewProps> = ({
  planet,
  resources,
  isExplorerLoadout,
  onScan,
  onColonize,
  onJump,
}) => {
  // Determine scan costs
  const scan1CostSupplies = isExplorerLoadout ? 1 : 2;
  const scan1CostScience = isExplorerLoadout ? 1 : 2;

  const scan2CostSupplies = isExplorerLoadout ? 2 : 4;
  const scan2CostScience = isExplorerLoadout ? 2 : 5;

  const canAffordScan1 = resources.supplies >= scan1CostSupplies && resources.science >= scan1CostScience;
  const canAffordScan2 = resources.supplies >= scan2CostSupplies && resources.science >= scan2CostScience;
  const canAffordJump = resources.fuel >= 10;

  // Visual cues for suitability
  const getSuitabilityStyle = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-400', border: 'border-emerald-950 bg-emerald-950/10', label: 'Prime Colony Site' };
    if (score >= 50) return { text: 'text-amber-400', border: 'border-amber-950 bg-amber-950/10', label: 'Marginal Habitat' };
    return { text: 'text-rose-400', border: 'border-rose-950 bg-rose-950/10', label: 'Extremely Hostile World' };
  };

  const suitabilityStyle = getSuitabilityStyle(planet.suitability);

  return (
    <div className="flex flex-col gap-6 rounded border border-slate-800 bg-slate-950 p-6 shadow-md">
      {/* Sector Orbit Scanner Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-3">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-cyan-400 animate-pulse" />
          <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
            Orbital Planet Analyzer
          </h3>
        </div>
        <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-500 border border-slate-800">
          OBJECT: {planet.name}
        </span>
      </div>

      {/* Grid Layout: Left Planetary Visual, Right attributes */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Planet Visual Holo Screen */}
        <div className="md:col-span-5 flex flex-col items-center justify-center rounded border border-slate-900 bg-slate-900/30 p-6 relative overflow-hidden group min-h-[220px]">
          {/* Orbital Circle Vectors */}
          <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
            <div className="h-44 w-44 rounded-full border border-dashed border-cyan-500 animate-[spin_40s_linear_infinite]" />
            <div className="absolute h-36 w-36 rounded-full border border-cyan-500 animate-[spin_20s_linear_infinite_reverse]" />
          </div>

          <Globe className="h-24 w-24 text-cyan-500/85 mb-3 group-hover:scale-105 transition-transform duration-500" />
          <p className="font-mono text-sm font-bold text-white tracking-wider">{planet.name}</p>

          <div className="mt-4 flex flex-col items-center">
            <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Suitability Index</span>
            <span className={`font-mono text-2xl font-black ${suitabilityStyle.text}`}>
              {planet.scanLevel === 0 ? '??%' : `${planet.suitability}%`}
            </span>
            <span className={`font-mono text-[10px] ${suitabilityStyle.text} mt-0.5 uppercase tracking-wide`}>
              {planet.scanLevel === 0 ? 'Awaiting Scan' : suitabilityStyle.label}
            </span>
          </div>
        </div>

        {/* Planet Attributes Form */}
        <div className="md:col-span-7 flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-900 pb-1">
            Spectrograph Telemetry Data
          </p>

          <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
            {/* Atmosphere */}
            <div className="rounded bg-slate-900/60 p-2 border border-slate-900">
              <span className="block text-[9px] text-slate-500 uppercase">Atmosphere</span>
              <span className="font-bold text-slate-200">
                {planet.scanLevel >= 1 ? planet.atmosphere : '??? [L1 Scan Required]'}
              </span>
            </div>

            {/* Gravity */}
            <div className="rounded bg-slate-900/60 p-2 border border-slate-900">
              <span className="block text-[9px] text-slate-500 uppercase">Gravity</span>
              <span className="font-bold text-slate-200">
                {planet.scanLevel >= 1 ? planet.gravity : '??? [L1 Scan Required]'}
              </span>
            </div>

            {/* Temperature */}
            <div className="rounded bg-slate-900/60 p-2 border border-slate-900">
              <span className="block text-[9px] text-slate-500 uppercase">Temperature</span>
              <span className="font-bold text-slate-200">
                {planet.scanLevel >= 2 ? planet.temperature : '??? [L2 Scan Required]'}
              </span>
            </div>

            {/* Water */}
            <div className="rounded bg-slate-900/60 p-2 border border-slate-900">
              <span className="block text-[9px] text-slate-500 uppercase">Water Density</span>
              <span className="font-bold text-slate-200">
                {planet.scanLevel >= 1 ? planet.water : '??? [L1 Scan Required]'}
              </span>
            </div>

            {/* Life */}
            <div className="rounded bg-slate-900/60 p-2 border border-slate-900">
              <span className="block text-[9px] text-slate-500 uppercase">Indigenous Life</span>
              <span className="font-bold text-slate-200">
                {planet.scanLevel >= 2 ? planet.life : '??? [L2 Scan Required]'}
              </span>
            </div>

            {/* Resources */}
            <div className="rounded bg-slate-900/60 p-2 border border-slate-900">
              <span className="block text-[9px] text-slate-500 uppercase">Mineral Wealth</span>
              <span className="font-bold text-slate-200">
                {planet.scanLevel >= 1 ? planet.resources : '??? [L1 Scan Required]'}
              </span>
            </div>
          </div>

          {/* Hazards Subpanel */}
          <div className="rounded border border-slate-900 bg-slate-950 p-2.5 font-mono text-xs">
            <span className="block text-[9px] text-slate-500 uppercase mb-1">Local Hazards</span>
            {planet.scanLevel >= 2 ? (
              planet.hazards.length === 0 ? (
                <span className="text-emerald-400 font-semibold">No dangerous anomalies detected. Safe for descent.</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {planet.hazards.map((h, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 rounded bg-rose-950/20 border border-rose-900/40 px-2 py-0.5 text-[10px] text-rose-400 font-bold"
                    >
                      <AlertTriangle className="h-3 w-3" /> {h}
                    </span>
                  ))}
                </div>
              )
            ) : (
              <span className="text-slate-500 italic">??? [L2 Scan required to identify biohazards/radiation]</span>
            )}
          </div>
        </div>
      </div>

      {/* Decisions Drawer Actions */}
      <div className="grid grid-cols-1 gap-3 border-t border-slate-900 pt-5 md:grid-cols-3">
        {/* Action 1: Deploy Scanners */}
        {planet.scanLevel < 2 ? (
          <button
            onClick={() => onScan(planet.scanLevel + 1)}
            disabled={planet.scanLevel === 0 ? !canAffordScan1 : !canAffordScan2}
            className={`flex flex-col items-center justify-center gap-1 rounded border p-3.5 font-mono text-xs font-bold transition-all ${
              (planet.scanLevel === 0 ? canAffordScan1 : canAffordScan2)
                ? 'border-cyan-800 bg-cyan-950/10 text-cyan-400 hover:bg-cyan-950/30'
                : 'border-slate-900 bg-slate-950 text-slate-600 opacity-50 cursor-not-allowed'
            }`}
          >
            <span className="flex items-center gap-1">
              <Search className="h-4 w-4" />
              {planet.scanLevel === 0 ? 'Deploy Orbital Scan (L1)' : 'Deploy Deep Spectrometry (L2)'}
            </span>
            <span className="text-[10px] font-normal opacity-80">
              Costs: {planet.scanLevel === 0 ? `${scan1CostSupplies} Supplies, ${scan1CostScience} Science` : `${scan2CostSupplies} Supplies, ${scan2CostScience} Science`}
            </span>
          </button>
        ) : (
          <div className="flex items-center justify-center rounded border border-emerald-950/50 bg-emerald-950/5 p-3 font-mono text-xs text-emerald-400 font-bold">
            <Sparkles className="h-4 w-4 text-emerald-400 mr-1.5 animate-pulse" /> Scanning Complete (L2)
          </div>
        )}

        {/* Action 2: Warp Jump to Next System */}
        <button
          onClick={onJump}
          disabled={!canAffordJump}
          className={`flex flex-col items-center justify-center gap-1 rounded border p-3.5 font-mono text-xs font-bold transition-all ${
            canAffordJump
              ? 'border-slate-800 bg-slate-900 hover:border-slate-700 text-white'
              : 'border-slate-900 bg-slate-950 text-slate-600 opacity-50 cursor-not-allowed'
          }`}
        >
          <span className="flex items-center gap-1">
            Warp to Next System <ArrowRight className="h-4 w-4" />
          </span>
          <span className="text-[10px] font-normal opacity-60">Costs: 10 Fuel</span>
        </button>

        {/* Action 3: Establish Colony */}
        <button
          onClick={onColonize}
          className="flex flex-col items-center justify-center gap-1 rounded bg-cyan-500 p-3.5 font-mono text-xs font-extrabold uppercase tracking-wide text-slate-950 hover:bg-cyan-400 active:scale-[0.99] transition-all"
        >
          <span className="flex items-center gap-1">
            <Home className="h-4 w-4 fill-slate-950" /> Establish Colony Here
          </span>
          <span className="text-[9px] font-normal uppercase opacity-85">
            Initiate Landing Protocols
          </span>
        </button>
      </div>
    </div>
  );
};
