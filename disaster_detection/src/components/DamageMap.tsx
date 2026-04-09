"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function DamageMap({
    imagery,
    showHeatmap = true,
    captureRef,
    onTileSelect
}: {
    imagery: "pre" | "post" | "none"
    showHeatmap?: boolean
    captureRef?: React.MutableRefObject<(() => string | null) | null>
    onTileSelect?: (id: string | null) => void
}) {
    const [tileCount, setTileCount] = useState(0);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const onTileSelectRef = useRef(onTileSelect);

    useEffect(() => {
        onTileSelectRef.current = onTileSelect;
    }, [onTileSelect]);

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: "mapbox://styles/mapbox/satellite-v9",
            center: [-73.7646, 18.1912],
            zoom: 16.5,
            maxZoom: 18,
            preserveDrawingBuffer: true,
        });

        if (captureRef) {
            captureRef.current = () => {
                if (!mapRef.current) return null;
                return mapRef.current.getCanvas().toDataURL("image/jpeg", 0.6);
            };
        }



        map.addControl(new mapboxgl.NavigationControl(), "top-right");

        map.on("load", async () => {
            try {
                const [res, buildRes] = await Promise.all([
                    fetch("/api/matthew-metadata").catch(err => null),
                    fetch("/api/matthew-buildings").catch(err => null)
                ]);
                
                if (!res || !res.ok) {
                    console.error("Failed to load map boundaries metadata.");
                    return;
                }
                const metadataList = await res.json();
                
                let buildingsGeojson = null;
                if (buildRes && buildRes.ok) {
                    buildingsGeojson = await buildRes.json();
                }

                if (!Array.isArray(metadataList)) return;
                
                setTileCount(metadataList.length);

                // Expand bounds iteratively using metadataList coordinates
                const bounds = new mapboxgl.LngLatBounds();

                metadataList.forEach((meta) => {
                    const { id, coordinates } = meta;
                    
                    // Coordinates: [ [tlLng, tlLat], [trLng, trLat], [brLng, brLat], [blLng, blLat] ]
                    coordinates.forEach(([lng, lat]: [number, number]) => bounds.extend([lng, lat]));

                    map.addSource(`matthew-pre-${id}`, {
                        type: "image",
                        url: `/api/local-image?id=${id}&type=pre`,
                        coordinates: coordinates,
                    });

                    map.addSource(`matthew-post-${id}`, {
                        type: "image",
                        url: `/api/local-image?id=${id}&type=post`,
                        coordinates: coordinates,
                    });

                    map.addLayer({
                        id: `matthew-pre-layer-${id}`,
                        type: "raster",
                        source: `matthew-pre-${id}`,
                        layout: { visibility: "none" },
                    });

                    map.addLayer({
                        id: `matthew-post-layer-${id}`,
                        type: "raster",
                        source: `matthew-post-${id}`,
                        layout: { visibility: "none" },
                    });
                });

                const features = metadataList.map((meta: any) => {
                    const { id, coordinates } = meta;
                    // close the ring for polygon
                    const ring = [...coordinates, coordinates[0]];
                    return {
                        type: "Feature",
                        id,
                        geometry: {
                            type: "Polygon",
                            coordinates: [ring]
                        },
                        properties: { id }
                    };
                });

                map.addSource("matthew-bounds-source", {
                    type: "geojson",
                    data: {
                        type: "FeatureCollection",
                        features: features as any
                    }
                });

                map.addLayer({
                    id: "matthew-bounds-layer",
                    type: "line",
                    source: "matthew-bounds-source",
                    paint: {
                        "line-color": "#a855f7", // strong purple color to stand out from red/yellow/green
                        "line-width": 2,
                        "line-dasharray": [2, 2],
                        "line-opacity": 0.8
                    },
                    layout: { visibility: "none" }
                });

                map.addLayer({
                    id: "matthew-bounds-fill-interactive",
                    type: "fill",
                    source: "matthew-bounds-source",
                    paint: {
                        "fill-color": "#a855f7",
                        "fill-opacity": [
                            "case",
                            ["boolean", ["feature-state", "selected"], false],
                            0.2,
                            0.0
                        ]
                    },
                    layout: { visibility: "none" }
                });

                let activeTileId: string | null = null;
                map.on('click', 'matthew-bounds-fill-interactive', (e) => {
                    if (e.features && e.features.length > 0) {
                        const feature = e.features[0];
                        const newId = feature.id as string;
                        
                        // Toggle logic
                        if (activeTileId === newId) {
                            map.setFeatureState({ source: 'matthew-bounds-source', id: activeTileId }, { selected: false });
                            activeTileId = null;
                            if (onTileSelectRef.current) onTileSelectRef.current(null);
                        } else {
                            if (activeTileId) {
                                map.setFeatureState({ source: 'matthew-bounds-source', id: activeTileId }, { selected: false });
                            }
                            activeTileId = newId;
                            map.setFeatureState({ source: 'matthew-bounds-source', id: activeTileId }, { selected: true });
                            if (onTileSelectRef.current) onTileSelectRef.current(newId);
                        }
                    }
                });

                map.on('mouseenter', 'matthew-bounds-fill-interactive', () => {
                    map.getCanvas().style.cursor = 'pointer';
                });
                map.on('mouseleave', 'matthew-bounds-fill-interactive', () => {
                    map.getCanvas().style.cursor = '';
                });

                if (buildingsGeojson && buildingsGeojson.features) {
                    map.addSource("matthew-buildings-source", {
                        type: "geojson",
                        data: buildingsGeojson
                    });

                    map.addLayer({
                        id: "matthew-buildings-fill",
                        type: "fill",
                        source: "matthew-buildings-source",
                        paint: {
                            "fill-color": [
                                "match",
                                ["get", "subtype"],
                                "no-damage", "#22c55e",
                                "minor-damage", "#eab308",
                                "major-damage", "#f97316",
                                "destroyed", "#ef4444",
                                /* default */ "#a1a1aa"
                            ],
                            "fill-opacity": 0.5
                        },
                        layout: { visibility: "none" }
                    });

                    map.addLayer({
                        id: "matthew-buildings-outline",
                        type: "line",
                        source: "matthew-buildings-source",
                        paint: {
                            "line-color": [
                                "match",
                                ["get", "subtype"],
                                "no-damage", "#15803d",
                                "minor-damage", "#a16207",
                                "major-damage", "#c2410c",
                                "destroyed", "#b91c1c",
                                /* default */ "#52525b"
                            ],
                            "line-width": 1.5,
                            "line-opacity": 0.9
                        },
                        layout: { visibility: "none" }
                    });
                }
                
                // Keep the IDs saved off map object hack for updating visibility easily later
                (map as any)._matthewLayerIds = metadataList.map((m: any) => m.id);

                // Option: Fit to actual dataset bounds, not just center
                // map.fitBounds(bounds, { padding: 40 });
                
                // Re-run the imagery toggle after load to apply initial state
                map.fire("idle");
            } catch (err) {
                console.error("Failed to load metadata list", err);
            }
        });

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const updateLayers = () => {
            const ids = (map as any)._matthewLayerIds || [];
            ids.forEach((id: string) => {
                const preLayerId = `matthew-pre-layer-${id}`;
                const postLayerId = `matthew-post-layer-${id}`;
                
                if (map.getLayer(preLayerId)) {
                    map.setLayoutProperty(preLayerId, "visibility", imagery === "pre" ? "visible" : "none");
                }
                if (map.getLayer(postLayerId)) {
                    map.setLayoutProperty(postLayerId, "visibility", imagery === "post" ? "visible" : "none");
                }
            });

            if (map.getLayer("matthew-bounds-layer")) {
                map.setLayoutProperty("matthew-bounds-layer", "visibility", imagery !== "none" ? "visible" : "none");
            }
            if (map.getLayer("matthew-bounds-fill-interactive")) {
                map.setLayoutProperty("matthew-bounds-fill-interactive", "visibility", imagery !== "none" ? "visible" : "none");
            }
            if (map.getLayer("matthew-buildings-fill")) {
                map.setLayoutProperty("matthew-buildings-fill", "visibility", showHeatmap ? "visible" : "none");
            }
            if (map.getLayer("matthew-buildings-outline")) {
                map.setLayoutProperty("matthew-buildings-outline", "visibility", showHeatmap ? "visible" : "none");
            }
        };

        if (map.isStyleLoaded() && (map as any)._matthewLayerIds) {
            updateLayers();
        } else {
            map.once("idle", updateLayers);
        }
    }, [imagery, showHeatmap]);

    return (
        <div className="relative w-full h-[75vh] min-h-[600px] rounded-xl overflow-hidden border border-zinc-200 shadow-inner">
            <div ref={mapContainerRef} className="w-full h-full" />
            {tileCount > 0 && imagery !== "none" && (
                <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur px-3 py-2 rounded-lg border border-zinc-200 shadow-md text-xs font-bold text-zinc-700 flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    Rendering {tileCount * 2} Satellite Images ({tileCount} Locations)
                </div>
            )}
        </div>
    );
}
