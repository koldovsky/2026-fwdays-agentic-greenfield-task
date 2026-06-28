"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface ForecastBgData {
  weatherCode: number | null;
  sunrise: string | null;
  sunset: string | null;
}

interface ForecastBgContextValue extends ForecastBgData {
  setBgData: (data: ForecastBgData) => void;
}

const ForecastBgContext = createContext<ForecastBgContextValue>({
  weatherCode: null,
  sunrise: null,
  sunset: null,
  setBgData: () => undefined,
});

export function ForecastBgProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ForecastBgData>({
    weatherCode: null,
    sunrise: null,
    sunset: null,
  });

  const setBgData = useCallback((data: ForecastBgData) => {
    setState(data);
  }, []);

  return (
    <ForecastBgContext.Provider value={{ ...state, setBgData }}>
      {children}
    </ForecastBgContext.Provider>
  );
}

export function useForecastBg() {
  return useContext(ForecastBgContext);
}
