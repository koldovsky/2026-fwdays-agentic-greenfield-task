export type GeocodedPlace = {
  id: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
};

export type RouteConfig = {
  start: GeocodedPlace | null;
  end: GeocodedPlace | null;
  restKm: number;
  dayKm: number;
};
