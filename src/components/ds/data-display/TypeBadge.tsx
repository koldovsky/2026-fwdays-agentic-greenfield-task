import React from "react";

export type PokemonType =
  | "normal" | "fire" | "water" | "electric" | "grass" | "ice"
  | "fighting" | "poison" | "ground" | "flying" | "psychic" | "bug"
  | "rock" | "ghost" | "dragon" | "dark" | "steel" | "fairy";

export const POKEMON_TYPES: PokemonType[] = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

export interface TypeBadgeProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "type"> {
  type: PokemonType;
  size?: "md" | "lg";
  dot?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export function TypeBadge({
  type,
  size = "md",
  dot = true,
  selectable = false,
  selected,
  onClick,
  className = "",
  ...rest
}: TypeBadgeProps): React.ReactElement {
  const t = String(type || "normal").toLowerCase();
  const style = {
    "--_bg": `var(--type-${t}-bg)`,
    "--_fg": `var(--type-${t}-text)`,
    "--_dot": `var(--type-${t})`,
  } as React.CSSProperties;
  const classes = [
    "ds-type",
    size === "lg" ? "ds-type--lg" : "",
    selectable ? "ds-type--selectable" : "",
    selectable && selected ? "ds-type--selected" : "",
    className,
  ].filter(Boolean).join(" ");

  const content = (
    <>
      {dot ? <span className="ds-type__dot" /> : null}
      {t}
    </>
  );

  if (selectable) {
    return (
      <button
        type="button"
        className={classes}
        style={style}
        aria-pressed={!!selected}
        onClick={onClick}
        {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={classes} style={style} {...rest}>
      {content}
    </span>
  );
}
