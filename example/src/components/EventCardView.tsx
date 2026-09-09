import React, { useState } from 'react';
import { HelpCircle, ChevronRight, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { GameEvent, EventChoice, Resources } from '../types';

interface EventCardViewProps {
  event: GameEvent;
  resources: Resources;
  onChoiceSelected: (choice: EventChoice) => void;
}

export const EventCardView: React.FC<EventCardViewProps> = ({
  event,
  resources,
  onChoiceSelected,
}) => {
  const [selectedChoice, setSelectedChoice] = useState<EventChoice | null>(null);

  const checkRequirement = (choice: EventChoice): { met: boolean; msg?: string } => {
    if (!choice.requirement) return { met: true };
    const { resource, value, failMessage } = choice.requirement;
    const currentVal = resources[resource];
    if (currentVal < value) {
      return { met: false, msg: failMessage || `Requires ${value} ${resource}` };
    }
    return { met: true };
  };

  const handleChoiceClick = (choice: EventChoice) => {
    const { met } = checkRequirement(choice);
    if (!met) return;
    setSelectedChoice(choice);
  };

  const handleConfirmResult = () => {
    if (selectedChoice) {
      onChoiceSelected(selectedChoice);
      setSelectedChoice(null); // Reset for next turn
    }
  };

  // Render Outcome State within the Event Card
  if (selectedChoice) {
    const cost = selectedChoice.cost || {};
    const reward = selectedChoice.reward || {};
    const modifier = selectedChoice.modifierAdded;

    return (
      <div className="flex flex-col gap-6 rounded border border-cyan-400/80 bg-slate-950 p-6 shadow-xl shadow-cyan-950/20">
        {/* Outcome Header */}
        <div className="flex items-center gap-2 border-b border-cyan-950 pb-3">
          <CheckCircle className="h-5 w-5 text-cyan-400 animate-pulse" />
          <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-cyan-400">
            Consequence Resolved
          </h3>
        </div>

        {/* Narrative Outcome */}
        <p className="font-mono text-xs leading-relaxed text-slate-300">
          {selectedChoice.rewardText}
        </p>

        {/* Resource Ledger */}
        <div className="flex flex-col gap-2 rounded bg-slate-900/60 p-4 border border-slate-900">
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-1">
            Resource Adjustments
          </p>

          <div className="flex flex-wrap gap-3">
            {/* Display Costs */}
            {Object.entries(cost).map(([key, val]) => (
              <div
                key={key}
                className="flex items-center gap-1.5 rounded border border-rose-950 bg-rose-950/20 px-2.5 py-1 font-mono text-xs text-rose-400"
              >
                <span>{key.toUpperCase()}:</span>
                <span className="font-bold">-{val}</span>
              </div>
            ))}

            {/* Display Rewards */}
            {Object.entries(reward).map(([key, val]) => {
              const numVal = Number(val);
              if (numVal === 0) return null;
              const isPositive = numVal > 0;
              const color = isPositive ? 'text-emerald-400 border-emerald-950 bg-emerald-950/20' : 'text-rose-400 border-rose-950 bg-rose-950/20';
              const sign = isPositive ? '+' : '';
              return (
                <div
                  key={key}
                  className={`flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-xs ${color}`}
                >
                  <span>{key.toUpperCase()}:</span>
                  <span className="font-bold">{sign}{numVal}</span>
                </div>
              );
            })}

            {/* If no cost or reward */}
            {Object.keys(cost).length === 0 && Object.keys(reward).length === 0 && (
              <p className="font-mono text-[11px] text-slate-500 italic">No resources adjusted.</p>
            )}
          </div>
        </div>

        {/* Active Modifier warning if added */}
        {modifier && (
          <div className="rounded border border-amber-950 bg-amber-950/10 p-3 font-mono text-xs text-amber-300 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
            <div>
              <p className="font-bold">New Flight Modifier: {modifier.name}</p>
              <p className="text-[10px] opacity-80 mt-0.5">{modifier.description}</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleConfirmResult}
          className="flex items-center justify-center gap-1.5 rounded bg-cyan-500 py-3 font-mono text-xs font-bold uppercase tracking-wider text-slate-950 hover:bg-cyan-400 active:scale-[0.99] transition-all"
        >
          Acknowledge & Sync Scanners <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded border border-slate-800 bg-slate-950 p-6 shadow-md">
      {/* Category header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
        <span className="rounded bg-slate-900 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-400 border border-slate-800">
          {event.category}
        </span>
        <HelpCircle className="h-4 w-4 text-slate-600" />
      </div>

      {/* Scenario */}
      <div className="flex flex-col gap-2">
        <h3 className="font-mono text-base font-bold text-white">{event.title}</h3>
        <p className="font-mono text-xs leading-relaxed text-slate-400">{event.description}</p>
      </div>

      {/* Choices list */}
      <div className="flex flex-col gap-3 pt-2">
        {event.choices.map((choice, index) => {
          const req = checkRequirement(choice);
          const cost = choice.cost || {};
          const reward = choice.reward || {};

          return (
            <button
              key={index}
              onClick={() => handleChoiceClick(choice)}
              disabled={!req.met}
              className={`group flex flex-col text-left rounded border p-3.5 transition-all ${
                req.met
                  ? 'border-slate-800 bg-slate-900/50 hover:border-cyan-900 hover:bg-cyan-950/5 cursor-pointer'
                  : 'border-slate-950 bg-slate-950/20 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <span className="font-mono text-xs font-bold text-white group-hover:text-cyan-400 transition-colors leading-relaxed">
                  {choice.text}
                </span>
                {!req.met && (
                  <span className="flex items-center gap-1 shrink-0 rounded bg-rose-950/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-rose-400 border border-rose-900/40">
                    <AlertCircle className="h-2.5 w-2.5" /> Blocked
                  </span>
                )}
              </div>

              {/* Requirement fail messages */}
              {!req.met && req.msg && (
                <p className="font-mono text-[10px] text-rose-400/80 mb-2 italic">
                  {req.msg}
                </p>
              )}

              {/* Resource previews if met */}
              {req.met && (Object.keys(cost).length > 0 || Object.keys(reward).length > 0) && (
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {/* Costs */}
                  {Object.entries(cost).map(([key, val]) => (
                    <span
                      key={key}
                      className="rounded bg-rose-950/10 px-1.5 py-0.5 font-mono text-[9px] text-rose-400 border border-rose-950/20"
                    >
                      -{val} {key.toUpperCase()}
                    </span>
                  ))}
                  {/* Rewards preview (only scientific discovery or general rewards) */}
                  {Object.entries(reward).map(([key, val]) => {
                    const numVal = Number(val);
                    if (numVal === 0) return null;
                    const isPositive = numVal > 0;
                    const color = isPositive ? 'text-emerald-400 border-emerald-950/20' : 'text-rose-400 border-rose-950/20';
                    const sign = isPositive ? '+' : '';
                    return (
                      <span
                        key={key}
                        className={`rounded bg-slate-950/80 px-1.5 py-0.5 font-mono text-[9px] border ${color}`}
                      >
                        {sign}{numVal} {key.toUpperCase()}
                      </span>
                    );
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
