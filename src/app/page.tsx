"use client";

import { useMemo, useState } from "react";
import { parseDay, findOverlaps, summarize, type Block } from "@/lib/parser";
import { formatTime } from "@/lib/time";

const SAMPLE = `# My day
8:30-9:00 planning
9:00-10:30 deep work
10:30-11:00 email
11:00-12:30 deep work
12:30-13:30 lunch
14:00-15:30 calls
15:30-17:00 deep work`;

const PX_PER_MIN = 1.15;

// Greedy lane packing so overlapping blocks don't hide each other.
function assignLanes(blocks: Block[]): number[] {
  const laneEnds: number[] = [];
  return blocks.map((b) => {
    const lane = laneEnds.findIndex((end) => end <= b.start);
    if (lane === -1) { laneEnds.push(b.end); return laneEnds.length - 1; }
    laneEnds[lane] = b.end;
    return lane;
  });
}

export default function Page() {
  const [text, setText] = useState(SAMPLE);
  const { blocks, errors } = useMemo(() => parseDay(text), [text]);

  const overlaps = useMemo(() => findOverlaps(blocks), [blocks]);
  const conflictSet = useMemo(() => {
    const s = new Set<Block>();
    overlaps.forEach(([a, b]) => { s.add(a); s.add(b); });
    return s;
  }, [overlaps]);

  const { totalFocusMinutes, gaps } = useMemo(() => summarize(blocks), [blocks]);
  const lanes = useMemo(() => assignLanes(blocks), [blocks]);

  const dayStart = blocks.length ? Math.floor(blocks[0].start / 60) * 60 : 0;
  const dayEnd = blocks.length ? Math.ceil(Math.max(...blocks.map((b) => b.end)) / 60) * 60 : 0;
  const height = (dayEnd - dayStart) * PX_PER_MIN;

  const ticks: number[] = [];
  for (let t = dayStart; t <= dayEnd; t += 60) ticks.push(t);

  const focusH = Math.floor(totalFocusMinutes / 60);
  const focusM = totalFocusMinutes % 60;

  return (
    <main className="wrap">
      <p className="eyebrow">Focus Blocks</p>
      <h1>Plan your day in a line.</h1>
      <p className="sub">
        Write your day like &ldquo;9:00-10:30 deep work&rdquo;. It appears as a timeline
        right away — with overlaps, gaps, and total focus time.
      </p>

      <div className="grid">
        <section>
          <p className="panel-label">Your day — as text</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            aria-label="Day plan as text"
          />
          {errors.length > 0 && (
            <div className="errors" role="alert">
              {errors.map((e, i) => (
                <p className="err" key={i}>
                  <b>line {e.line}:</b> {e.message}
                </p>
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="panel-label">Timeline</p>
          <div className="metrics">
            <div className="metric">
              <div className="n">{focusH > 0 ? `${focusH}h ` : ""}{focusM}m</div>
              <div className="k">Focus</div>
            </div>
            <div className="metric">
              <div className="n">{blocks.length}</div>
              <div className="k">Blocks</div>
            </div>
            <div className="metric">
              <div className={`n ${overlaps.length ? "warn" : ""}`}>{overlaps.length}</div>
              <div className="k">Overlaps</div>
            </div>
          </div>

          {blocks.length === 0 ? (
            <p className="empty">No blocks yet — start typing on the left.</p>
          ) : (
            <div className="ledger" style={{ height }}>
              {ticks.map((t) => (
                <div key={t} className="tick" style={{ top: (t - dayStart) * PX_PER_MIN }}>
                  {formatTime(t)}
                </div>
              ))}
              {gaps.map((g, i) => (
                <div
                  key={`gap-${i}`}
                  className="gap"
                  style={{ top: (g.start - dayStart) * PX_PER_MIN, height: (g.end - g.start) * PX_PER_MIN }}
                >
                  <span>gap {g.end - g.start}m</span>
                </div>
              ))}
              {blocks.map((b, i) => (
                <div
                  key={`b-${i}`}
                  className={`block ${conflictSet.has(b) ? "conflict" : ""}`}
                  style={{
                    top: (b.start - dayStart) * PX_PER_MIN,
                    height: (b.end - b.start) * PX_PER_MIN,
                    left: 10 + lanes[i] * 16,
                  }}
                >
                  <div className="bt">{formatTime(b.start)}–{formatTime(b.end)}</div>
                  <div className="bl">{b.label}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
