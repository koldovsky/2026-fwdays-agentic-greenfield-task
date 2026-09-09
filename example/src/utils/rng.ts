// Seedable Pseudo-Random Number Generator using Mulberry32
export interface RNG {
  next: () => number; // Returns float 0..1
  range: (min: number, max: number) => number; // Returns integer in [min, max]
  floatRange: (min: number, max: number) => number; // Returns float in [min, max)
  choice: <T>(arr: T[]) => T; // Returns a random element from an array
  sample: <T>(arr: T[], count: number) => T[]; // Returns unique random elements
  shuffle: <T>(arr: T[]) => T[]; // Returns shuffled copy of an array
}

export function createRNG(seed: number): RNG {
  let h = seed | 0;
  
  // Mulberry32 generator
  const next = () => {
    h = (h + 0x6d2b79f5) | 0;
    let imul = Math.imul(h ^ (h >>> 15), 1 | h);
    imul = (imul + Math.imul(imul ^ (imul >>> 7), 61 | imul)) ^ imul;
    return ((imul ^ (imul >>> 14)) >>> 0) / 4294967296;
  };

  const range = (min: number, max: number): number => {
    return Math.floor(next() * (max - min + 1)) + min;
  };

  const floatRange = (min: number, max: number): number => {
    return next() * (max - min) + min;
  };

  const choice = <T>(arr: T[]): T => {
    const idx = Math.floor(next() * arr.length);
    return arr[idx];
  };

  const sample = <T>(arr: T[], count: number): T[] => {
    const copy = [...arr];
    const result: T[] = [];
    const actualCount = Math.min(count, arr.length);
    for (let i = 0; i < actualCount; i++) {
      const idx = Math.floor(next() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  };

  const shuffle = <T>(arr: T[]): T[] => {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  return {
    next,
    range,
    floatRange,
    choice,
    sample,
    shuffle,
  };
}

// Generate a random numeric seed
export function generateRandomSeed(): number {
  return Math.floor(Math.random() * 900000) + 100000; // 6-digit seed
}
