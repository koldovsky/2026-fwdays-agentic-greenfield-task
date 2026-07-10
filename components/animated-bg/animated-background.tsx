"use client";

import { useEffect, useRef, useState } from "react";
import type { CityLocation } from "@/lib/city-search/geocoding";
import type { BackgroundEffect, BackgroundVisual } from "@/lib/animated-bg/background-visual";
import { defaultBackgroundVisual } from "@/lib/animated-bg/background-visual";
import { backgroundVisualFromForecast } from "@/lib/animated-bg/resolve-from-forecast";
import { fetchForecast } from "@/lib/forecast/forecast-client";

type AnimatedBackgroundProps = {
  location: CityLocation | null;
};

type Particle = {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
};

const PARTICLE_LIMIT = 36;

export function AnimatedBackground({ location }: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visual, setVisual] = useState<BackgroundVisual>(() =>
    defaultBackgroundVisual(false),
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);

    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncVisual = async () => {
      const now = new Date();

      if (!location) {
        if (!cancelled) {
          setVisual(defaultBackgroundVisual(reducedMotion));
        }
        return;
      }

      try {
        const forecast = await fetchForecast(location);

        if (!cancelled) {
          setVisual(
            backgroundVisualFromForecast(forecast, location, now, reducedMotion),
          );
        }
      } catch {
        if (!cancelled) {
          setVisual(defaultBackgroundVisual(reducedMotion));
        }
      }
    };

    void syncVisual();
    const intervalId = window.setInterval(() => {
      void syncVisual();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [location, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !visual.animate || visual.effect === "none") {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    let frameId = 0;
    const particles = createParticles(visual.effect, canvas);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.globalAlpha = visual.effect === "stars" ? 0.55 : 0.35;

      for (const particle of particles) {
        drawParticle(context, particle, visual.effect, canvas.width, canvas.height);
        advanceParticle(particle, visual.effect, canvas.width, canvas.height);
      }

      frameId = window.requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, [visual]);

  return (
    <div className={visual.layerClassName} aria-hidden>
      <div
        className="absolute inset-0 transition-[background] duration-700 ease-out dark:opacity-100"
        style={{ background: visual.gradient }}
      />
      {visual.animate && visual.effect !== "none" ? (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      ) : null}
    </div>
  );
}

function createParticles(effect: BackgroundEffect, canvas: HTMLCanvasElement): Particle[] {
  const width = canvas.width || window.innerWidth;
  const height = canvas.height || window.innerHeight;
  const count =
    effect === "stars" ? 24 : effect === "snow" ? 30 : effect === "rain" ? 36 : 18;

  return Array.from({ length: Math.min(count, PARTICLE_LIMIT) }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: effect === "stars" ? 1.2 + Math.random() * 1.4 : 1 + Math.random() * 2.5,
    speed: 0.6 + Math.random() * 1.4,
    drift: -0.4 + Math.random() * 0.8,
  }));
}

function drawParticle(
  context: CanvasRenderingContext2D,
  particle: Particle,
  effect: BackgroundEffect,
  width: number,
  height: number,
) {
  if (effect === "rain") {
    context.strokeStyle = "rgba(148, 163, 184, 0.8)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(particle.x, particle.y);
    context.lineTo(particle.x - 2, particle.y + 10 + particle.size * 2);
    context.stroke();
    return;
  }

  if (effect === "snow") {
    context.fillStyle = "rgba(226, 232, 240, 0.9)";
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fill();
    return;
  }

  context.fillStyle =
    effect === "stars" ? "rgba(232, 237, 244, 0.9)" : "rgba(255, 255, 255, 0.45)";
  context.beginPath();
  context.ellipse(
    particle.x,
    particle.y,
    24 + particle.size * 8,
    10 + particle.size * 3,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();

  void width;
  void height;
}

function advanceParticle(
  particle: Particle,
  effect: BackgroundEffect,
  width: number,
  height: number,
) {
  if (effect === "rain") {
    particle.y += 8 + particle.speed * 4;
    particle.x += particle.drift;
  } else if (effect === "snow") {
    particle.y += 1 + particle.speed;
    particle.x += particle.drift * 0.6;
  } else if (effect === "stars") {
    particle.y += Math.sin(particle.x * 0.01) * 0.02;
  } else {
    particle.x += 0.08 + particle.speed * 0.05;
    particle.y += particle.drift * 0.03;
  }

  if (particle.y > height + 12) {
    particle.y = -12;
    particle.x = Math.random() * width;
  }

  if (particle.x > width + 40) {
    particle.x = -40;
  }

  if (particle.x < -40) {
    particle.x = width + 40;
  }
}
