"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { MapAction } from "@/lib/chatbot/types";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function DamageMap({
    imagery,
    showHeatmap = true,
    focus = null,
    onClearFocus,
}: {
    imagery: "pre" | "post" | "none"
    showHeatmap?: boolean
    focus?: MapAction | null
    onClearFocus?: () => void
}) {
    const [tileCount, setTileCount] = useState(0);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: "mapbox://styles/mapbox/satellite-v9",
            center: [-73.7646, 18.1912],
            zoom: 16.5,
            maxZoom: 18,
        });



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

    // React to chatbot-driven focus: pan/zoom to bbox and filter the buildings
    // layers to the requested UIDs and/or damage subtypes.
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const applyFocus = () => {
            const hasFill = !!map.getLayer("matthew-buildings-fill");
            const hasOutline = !!map.getLayer("matthew-buildings-outline");

            if (!focus) {
                if (hasFill) map.setFilter("matthew-buildings-fill", null);
                if (hasOutline) map.setFilter("matthew-buildings-outline", null);
                return;
            }

            const clauses: any[] = ["all"];
            if (focus.buildingUids && focus.buildingUids.length > 0) {
                clauses.push(["in", ["get", "uid"], ["literal", focus.buildingUids]]);
            }
            if (focus.damageFilter && focus.damageFilter.length > 0) {
                clauses.push(["in", ["get", "subtype"], ["literal", focus.damageFilter]]);
            }
            const filterExpr = clauses.length > 1 ? clauses : null;

            if (hasFill) map.setFilter("matthew-buildings-fill", filterExpr as any);
            if (hasOutline) map.setFilter("matthew-buildings-outline", filterExpr as any);

            if (focus.bbox) {
                const [w, s, e, n] = focus.bbox;
                try {
                    map.fitBounds(
                        [
                            [w, s],
                            [e, n],
                        ],
                        { padding: 60, duration: 800, maxZoom: 18 }
                    );
                } catch {
                    // ignore invalid bbox
                }
            }
        };

        if (map.isStyleLoaded() && (map as any)._matthewLayerIds) {
            applyFocus();
        } else {
            map.once("idle", applyFocus);
        }
    }, [focus]);

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
            {focus && (
                <div className="absolute top-4 left-4 z-10 bg-indigo-600/95 text-white px-3 py-2 rounded-lg shadow-md text-xs font-bold flex items-center gap-2">
                    <span>Chatbot focus active</span>
                    {onClearFocus && (
                        <button
                            type="button"
                            onClick={onClearFocus}
                            className="rounded bg-white/20 hover:bg-white/30 px-2 py-0.5 text-[11px] font-semibold"
                        >
                            Clear
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
