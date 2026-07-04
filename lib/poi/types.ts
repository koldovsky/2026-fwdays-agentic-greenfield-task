export type PoiPlace = {
  id: string;
  lat: number;
  lon: number;
  name: string;
};

/** @deprecated Use PoiPlace */
export type FuelStation = PoiPlace;

export type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
};

export type OverpassResponse = {
  elements?: OverpassElement[];
};
