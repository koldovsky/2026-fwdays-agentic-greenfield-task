import React from 'react';
import { Flame, Package, Users, Smile, Compass, Wrench, Info } from 'lucide-react';
import { Resources, ActiveModifier } from '../types';

interface ResourcePanelProps {
  resources: Resources;
  upkeepFuel: number;
  upkeepSupplies: number;
  activeModifiers: ActiveModifier[];
}

export const ResourcePanel: React.FC<ResourcePanelProps> = ({
  resources,
  upkeepFuel,
  upkeepSupplies,
  activeModifiers,
}) => {
  // Helpers to calculate visual progress out of 100 (while raw values can go higher)
  const getProgressWidth = (val: number, max: number = 100) => {
    return `${Math.max(0, Math.min(100, (val / max) * 100))}%`;
  };

  const getBarColor = (val: number, lowThreshold: number) => {
    if (val <= lowThreshold) return 'bg-rose-500 shadow-rose-950/40';
    if (val <= lowThreshold * 2) return 'bg-amber-500 shadow-amber-950/40';
    return 'bg-cyan-500 shadow-cyan-950/40';
  };

  // Sum up additional per-turn effects from active modifiers
  const modifierFuelEffect = activeModifiers.reduce((acc, mod) => acc + (mod.effects.fuel || 0), 0);
  const modifierSuppliesEffect = activeModifiers.reduce((acc, mod) => acc + (mod.effects.supplies || 0), 0);
  const modifierMoraleEffect = activeModifiers.reduce((acc, mod) => acc + (mod.effects.morale || 0), 0);
  const modifierCrewEffect = activeModifiers.reduce((acc, mod) => acc + (mod.effects.crew || 0), 0);
  const modifierScienceEffect = activeModifiers.reduce((acc, mod) => acc + (mod.effects.science || 0), 0);
  const modifierIndustryEffect = activeModifiers.reduce((acc, mod) => acc + (mod.effects.industry || 0), 0);

  const netFuel = -upkeepFuel + modifierFuelEffect;
  const netSupplies = -upkeepSupplies + modifierSuppliesEffect;

  const renderNetChange = (net: number) => {
    if (net === 0) return null;
    const sign = net > 0 ? '+' : '';
    const color = net > 0 ? 'text-emerald-400' : 'text-rose-400';
    return <span className={`font-mono text-xs ${color} ml-1.5`}>{sign}{net}/turn</span>;
  };

  const resourceItems = [
    {
      label: 'Fuel',
      value: resources.fuel,
      max: 100,
      colorClass: getBarColor(resources.fuel, 15),
      icon: <Flame className="h-4 w-4 text-orange-400" />,
      desc: 'Spent during sector jumps, orbital maneuvers, and heavy propulsion.',
      net: netFuel,
    },
    {
      label: 'Supplies',
      value: resources.supplies,
      max: 100,
      colorClass: getBarColor(resources.supplies, 15),
      icon: <Package className="h-4 w-4 text-amber-400" />,
      desc: 'Sustains the crew. Depleting supplies triggers extreme morale penalties.',
      net: netSupplies,
    },
    {
      label: 'Crew Population',
      value: resources.crew,
      max: 100, // starting loadouts vary
      colorClass: getBarColor(resources.crew, 10),
      icon: <Users className="h-4 w-4 text-blue-400" />,
      desc: 'Active officers, engineers, and scientists. If crew hits 0, the ship drifts lifelessly.',
      net: modifierCrewEffect,
    },
    {
      label: 'Crew Morale',
      value: resources.morale,
      max: 100,
      colorClass: getBarColor(resources.morale, 20),
      icon: <Smile className="h-4 w-4 text-pink-400" />,
      desc: 'Mental stability and motivation. High morale improves event outcomes; low morale causes mutiny.',
      net: modifierMoraleEffect,
    },
    {
      label: 'Science Data',
      value: resources.science,
      max: 150,
      colorClass: 'bg-indigo-500 shadow-indigo-950/40',
      icon: <Compass className="h-4 w-4 text-indigo-400" />,
      desc: 'Decipher alien mysteries and scan candidate planets with scientific precision.',
      net: modifierScienceEffect,
    },
    {
      label: 'Industrial Materials',
      value: resources.industry,
      max: 150,
      colorClass: 'bg-slate-400 shadow-slate-950/40',
      icon: <Wrench className="h-4 w-4 text-slate-400" />,
      desc: 'Materials for repairs, automated fabrication, and constructing colony bases.',
      net: modifierIndustryEffect,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Primary Resources */}
      <div className="rounded border border-slate-800 bg-slate-950 p-4">
        <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
          Ship Resources
        </h2>

        <div className="flex flex-col gap-4">
          {resourceItems.map((item, idx) => (
            <div key={idx} className="group relative flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span className="font-mono text-sm font-medium text-white">{item.label}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-mono text-sm font-bold text-white">{item.value}</span>
                  {renderNetChange(item.net)}
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="h-2 w-full rounded-full bg-slate-900 border border-slate-800/80 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${item.colorClass}`}
                  style={{ width: getProgressWidth(item.value, item.max) }}
                />
              </div>

              {/* Inline interactive helper/tooltip on focus/hover */}
              <p className="mt-1 hidden font-mono text-[10px] text-slate-500 group-hover:block transition-all">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Active Modifiers Panel */}
      <div className="rounded border border-slate-800 bg-slate-950 p-4">
        <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
          Flight System Modifiers
        </h2>

        {activeModifiers.length === 0 ? (
          <div className="flex items-center gap-2 text-slate-600">
            <Info className="h-4 w-4" />
            <p className="font-mono text-xs italic">No active anomalies or temporal modifiers.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeModifiers.map((mod) => (
              <div
                key={mod.id}
                className="rounded border border-cyan-950/50 bg-cyan-950/10 p-2.5 font-mono text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-cyan-400">{mod.name}</span>
                  <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-400">
                    {mod.duration === -1 ? 'Permanent' : `${mod.duration} turns left`}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed mb-1.5">
                  {mod.description}
                </p>
                {/* Modifier Effects list */}
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-[10px]">
                  {Object.entries(mod.effects).map(([key, val]) => {
                    const numVal = Number(val);
                    const sign = numVal > 0 ? '+' : '';
                    const color = numVal > 0 ? 'text-emerald-400' : 'text-rose-400';
                    return (
                      <span key={key} className={color}>
                        {key.toUpperCase()}: {sign}
                        {numVal}/turn
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
