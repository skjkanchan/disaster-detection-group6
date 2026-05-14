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

export type TileBbox = {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
};

export type ActiveTile = {
  id: string;
  bbox: TileBbox;
};

type MapContextValue = {
  command: MapCommand;
  pushRecords: (records: PropertyRecord[]) => void;
  clearRecords: () => void;
  activeTile: ActiveTile | null;
  setActiveTile: (tile: ActiveTile | null) => void;
};

const EMPTY: MapCommand = { records: [] };

const DEFAULT_CTX: MapContextValue = {
  command: EMPTY,
  pushRecords: () => {},
  clearRecords: () => {},
  activeTile: null,
  setActiveTile: () => {},
};

const MapContext = createContext<MapContextValue>(DEFAULT_CTX);

export function MapProvider({ children }: { children: ReactNode }) {
  const [command, setCommand] = useState<MapCommand>(EMPTY);
  const [activeTile, setActiveTileState] = useState<ActiveTile | null>(null);
  const pushRecords = useCallback((records: PropertyRecord[]) => setCommand({ records }), []);
  const clearRecords = useCallback(() => setCommand(EMPTY), []);
  const setActiveTile = useCallback((tile: ActiveTile | null) => setActiveTileState(tile), []);

  return (
    <MapContext.Provider value={{ command, pushRecords, clearRecords, activeTile, setActiveTile }}>
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  return useContext(MapContext);
}