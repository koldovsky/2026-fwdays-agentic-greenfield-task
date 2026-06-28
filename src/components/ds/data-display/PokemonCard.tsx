import React from "react";
import { Card } from "./Card";
import { TypeBadge, type PokemonType } from "./TypeBadge";

export function artworkUrl(id: number | string): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

export interface PokemonCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "id"> {
  id?: number | string;
  name?: string;
  types?: PokemonType[];
  image?: string;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function PokemonCard({
  id,
  name,
  types = [],
  image,
  href,
  onClick,
  className = "",
  ...rest
}: PokemonCardProps): React.ReactElement {
  const dex = id != null ? `#${String(id).padStart(4, "0")}` : null;
  const src = image || (id != null ? artworkUrl(id) : null);
  return (
    <Card
      interactive
      href={href}
      onClick={onClick}
      className={["ds-pokecard", className].filter(Boolean).join(" ")}
      {...rest}
    >
      <div className="ds-pokecard__media">
        {dex ? <span className="ds-pokecard__num">{dex}</span> : null}
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ds-pokecard__img" src={src} alt={name || "Pokémon"} loading="lazy" />
        ) : null}
      </div>
      <div className="ds-pokecard__body">
        <div className="ds-pokecard__name">{name}</div>
        <div className="ds-pokecard__types">
          {types.map((t) => <TypeBadge key={t} type={t} />)}
        </div>
      </div>
    </Card>
  );
}
