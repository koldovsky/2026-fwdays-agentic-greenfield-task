import { notFound } from "next/navigation";
import { TypeBadge, Badge, StatBar, artworkUrl } from "@/components/ds";
import type { PokemonType } from "@/components/ds";
import { fetchPokemonDetail, fetchPokemonSpecies } from "@/lib/pokemon";
import { strings } from "@/lib/i18n/en";

const STAT_KEYS: Array<keyof typeof strings.statLabels> = [
  "hp",
  "attack",
  "defense",
  "special-attack",
  "special-defense",
  "speed",
];

export default async function PokemonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pokemon, species] = await Promise.all([
    fetchPokemonDetail(id),
    fetchPokemonSpecies(id),
  ]);

  if (!pokemon || !species) notFound();

  const dex = `#${String(pokemon.id).padStart(4, "0")}`;
  const generationLabel =
    strings.generationNames[species.generation] ?? species.generation;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Back link */}
      <a
        href="/pokemon"
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-2) var(--space-3) var(--space-2) var(--space-2)",
          borderRadius: "var(--radius-control)",
          border: "1px solid transparent",
          color: "var(--text-secondary)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          fontWeight: "600",
          textDecoration: "none",
        }}
      >
        ← {strings.detail.backLink}
      </a>

      {/* Two-column grid: art + info */}
      <div className="pk-detail-grid">
        <style>{`
          .pk-detail-grid {
            display: grid;
            grid-template-columns: 440px 1fr;
            gap: var(--space-8);
            align-items: start;
          }
          @media (max-width: 1024px) {
            .pk-detail-grid { grid-template-columns: 1fr; }
            .pk-art-panel { position: static !important; max-width: 380px; }
          }
        `}</style>

        {/* Artwork panel */}
        <div
          className="pk-art-panel"
          style={{
            position: "sticky",
            top: "84px",
            aspectRatio: "1 / 1",
            background:
              "radial-gradient(120% 120% at 50% 22%, var(--surface-card) 0%, var(--surface-sunken) 100%)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-2xl)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          } as React.CSSProperties}
        >
          <span
            style={{
              position: "absolute",
              top: "var(--space-5)",
              left: "var(--space-5)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-md)",
              color: "var(--text-tertiary)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "0.02em",
            }}
          >
            {dex}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artworkUrl(pokemon.id)}
            alt={pokemon.name}
            style={{ width: "76%", height: "76%", objectFit: "contain" }}
          />
        </div>

        {/* Info panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {/* Header: genus, name, types, legendary badge */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
              }}
            >
              {species.genus}
            </div>
            <h1
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: "800",
                fontSize: "var(--text-5xl)",
                letterSpacing: "-0.03em",
                lineHeight: "1",
                color: "var(--text-primary)",
                textTransform: "capitalize",
                marginTop: "4px",
              }}
            >
              {pokemon.name}
            </h1>
            <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)", flexWrap: "wrap" }}>
              {pokemon.types.map((t) => (
                <TypeBadge key={t} type={t as PokemonType} size="lg" />
              ))}
              {species.isLegendary && (
                <Badge variant="legendary" size="lg">
                  {strings.detail.legendary}
                </Badge>
              )}
              {species.isMythical && (
                <Badge variant="legendary" size="lg">
                  {strings.detail.mythical}
                </Badge>
              )}
            </div>
          </div>

          {/* Flavor text */}
          <p
            style={{
              fontSize: "var(--text-md)",
              lineHeight: "1.6",
              color: "var(--text-secondary)",
              maxWidth: "56ch",
            }}
          >
            {species.flavorText}
          </p>

          {/* Base stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                fontWeight: "500",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
              }}
            >
              Base stats
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2-5)" }}>
              {STAT_KEYS.map((key) => (
                <StatBar
                  key={key}
                  label={strings.statLabels[key] ?? key}
                  value={pokemon.stats[key] ?? 0}
                  max={255}
                />
              ))}
            </div>
          </div>

          {/* Profile: height, weight, generation */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                fontWeight: "500",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
              }}
            >
              Profile
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "var(--space-3)",
              }}
            >
              {[
                { label: "Height", value: `${pokemon.height.toFixed(1)} m` },
                { label: "Weight", value: `${pokemon.weight.toFixed(1)} kg` },
                { label: "Generation", value: generationLabel },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-lg)",
                    padding: "var(--space-4)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-2)",
                    background: "var(--surface-card)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-2xs)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-lg)",
                      fontWeight: "500",
                      color: "var(--text-primary)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Abilities */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                fontWeight: "500",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
              }}
            >
              Abilities
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
              {pokemon.abilities.map((a) => (
                <span
                  key={a.name}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 14px",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-pill)",
                    background: "var(--surface-card)",
                    fontSize: "var(--text-sm)",
                    color: "var(--text-primary)",
                    textTransform: "capitalize",
                  }}
                >
                  {a.name}
                  {a.hidden && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "9.5px",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--text-tertiary)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-sm)",
                        padding: "1px 5px",
                      }}
                    >
                      {strings.detail.hiddenAbility}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
