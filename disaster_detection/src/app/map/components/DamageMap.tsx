"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function DamageMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/satellite-v9",
      center: [-79.0045, 34.6205], // center near the Matthew dummy data
      zoom: 15,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", async () => {
      const res = await fetch("/api/damage-geojson");
      const data = await res.json();

        map.addSource("damage-areas", {
        type: "geojson",
        data,
        });

        map.addLayer({
        id: "damage-fills",
        type: "fill",
        source: "damage-areas",
        paint: {
            "fill-color": [
            "match",
            ["get", "damage_class"],
            "no_damage", "#4ade80",
            "minor", "#fde047",
            "major", "#fb923c",
            "destroyed", "#ef4444",
            "#999999"
            ],
            "fill-opacity": 0.32
        }
        });


      // zoom map to the polygons
      const bounds = new mapboxgl.LngLatBounds();

      data.features.forEach((feature: any) => {
        const ring = feature.geometry.coordinates[0];
        ring.forEach((coord: [number, number]) => {
          bounds.extend(coord);
        });
      });

      map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={mapContainerRef} className="h-screen w-full" />;
}