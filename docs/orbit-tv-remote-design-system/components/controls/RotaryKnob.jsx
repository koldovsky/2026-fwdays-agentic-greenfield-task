import React from 'react';

/**
 * RotaryKnob — a memoryless relative rotary encoder. Neumorphic raised
 * housing with an inset centre well that hosts a caller-supplied action
 * (e.g. a mute IconButton). Each 15° of accumulated rotation fires one
 * `onStep('up' | 'down')` — the knob holds no absolute value.
 */
const DETENT_DEG = 15;
const DETENT_RAD = (DETENT_DEG * Math.PI) / 180;
// Fire on inclusive boundary crossings — a gesture that lands exactly at
// the detent (rare in physical use, ordinary in synthetic tests) should
// still emit rather than getting swallowed by one ULP of atan2 error.
const DETENT_EPS = 1e-9;

function shortestAngleDelta(prev, curr) {
  let d = curr - prev;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

export function RotaryKnob({ size = 200, disabled = false, center, onStep }) {
  const [indicatorRad, setIndicatorRad] = React.useState(-Math.PI / 2);
  const [focused, setFocused] = React.useState(false);
  const pointerRef = React.useRef({ id: null, lastAngle: 0, accumulator: 0 });

  const emitSteps = React.useCallback((direction, count = 1) => {
    if (disabled || !onStep) return;
    for (let i = 0; i < count; i += 1) onStep(direction);
  }, [disabled, onStep]);

  const centreOf = (el) => {
    const rect = el.getBoundingClientRect();
    return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
  };

  const handlePointerDown = (e) => {
    if (disabled) return;
    if (pointerRef.current.id !== null) return;
    const { cx, cy } = centreOf(e.currentTarget);
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
    pointerRef.current = { id: e.pointerId, lastAngle: angle, accumulator: 0 };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* Some browsers (or jsdom) may reject capture — safe to ignore. */
    }
    setIndicatorRad(angle);
  };

  const handlePointerMove = (e) => {
    const ptr = pointerRef.current;
    if (ptr.id === null || ptr.id !== e.pointerId) return;
    const { cx, cy } = centreOf(e.currentTarget);
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
    const delta = shortestAngleDelta(ptr.lastAngle, angle);
    ptr.lastAngle = angle;
    ptr.accumulator += delta;
    while (ptr.accumulator >= DETENT_RAD - DETENT_EPS) {
      ptr.accumulator -= DETENT_RAD;
      emitSteps('up');
    }
    while (ptr.accumulator <= -(DETENT_RAD - DETENT_EPS)) {
      ptr.accumulator += DETENT_RAD;
      emitSteps('down');
    }
    setIndicatorRad(angle);
  };

  const handlePointerEnd = (e) => {
    const ptr = pointerRef.current;
    if (ptr.id === null || ptr.id !== e.pointerId) return;
    pointerRef.current = { id: null, lastAngle: 0, accumulator: 0 };
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* Fine to ignore — capture may already be released. */
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.target !== e.currentTarget) return;
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        e.preventDefault();
        emitSteps('up');
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        e.preventDefault();
        emitSteps('down');
        break;
      case 'PageUp':
        e.preventDefault();
        emitSteps('up', 3);
        break;
      case 'PageDown':
        e.preventDefault();
        emitSteps('down', 3);
        break;
      default:
        break;
    }
  };

  const wellSize = Math.round(size * 0.42);
  const dotSize = Math.max(6, Math.round(size * 0.035));
  const dotRadius = size / 2 - Math.max(dotSize, Math.round(size * 0.08));

  return (
    <div
      role="slider"
      aria-orientation="vertical"
      aria-label="Volume"
      aria-valuetext="Relative volume control"
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--base-100)',
        boxShadow: 'var(--nm-raised-lg)',
        touchAction: 'none',
        userSelect: 'none',
        outline: focused && !disabled ? '2px solid var(--accent)' : 'none',
        outlineOffset: 4,
        opacity: disabled ? 0.55 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        display: 'grid',
        placeItems: 'center',
        cursor: disabled ? 'not-allowed' : 'grab',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          background: 'var(--accent)',
          transform: `translate(-50%, -50%) rotate(${indicatorRad + Math.PI / 2}rad) translateY(-${dotRadius}px)`,
          transformOrigin: 'center',
          pointerEvents: 'none',
        }}
      />
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        style={{
          width: wellSize,
          height: wellSize,
          borderRadius: '50%',
          background: 'var(--base-100)',
          boxShadow: 'var(--nm-inset-md)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {center}
      </div>
    </div>
  );
}
