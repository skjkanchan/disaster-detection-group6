"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type PropertyRecord = {
  id: string;
  lat: number;
  lon: number;
  damage_label: string;
  confidence: number;
  explanation?: string;
  address?: string;
  street?: string;
  region?: string;
};

export type MapCommand = {
  records: PropertyRecord[];
};

type MapContextValue = {
  command: MapCommand;
  pushRecords: (records: PropertyRecord[]) => void;
  clearRecords: () => void;
};

const EMPTY: MapCommand = { records: [] };
const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({ children }: { children: ReactNode }) {
  const [command, setCommand] = useState<MapCommand>(EMPTY);
  const pushRecords = useCallback((records: PropertyRecord[]) => setCommand({ records }), []);
  const clearRecords = useCallback(() => setCommand(EMPTY), []);

  return (
    <MapContext.Provider value={{ command, pushRecords, clearRecords }}>
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error("useMapContext must be used inside <MapProvider>");
  return ctx;
}