"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapContext } from "./MapContext";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const DAMAGE_COLORS: Record<string, string> = {
  destroyed: "#ef4444",
  major: "#f97316",
  minor: "#eab308",
  "no damage": "#22c55e",
  no_damage: "#22c55e",
};

const SOURCE_ID = "chatbot-results-source";
const LAYER_GLOW = "chatbot-results-glow";
const LAYER_FILL = "chatbot-results-fill";

export default function DamageMap({
  imagery,
  showHeatmap = true,
}: {
  imagery: "pre" | "post" | "none";
  showHeatmap?: boolean;
}) {
  const { command } = useMapContext();
  const [tileCount, setTileCount] = useState(0);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  // ─── Map init ───────────────────────────────────────────────────────────────
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
        // Kick off all three fetches in parallel so cold-start latency is not compounded
        const [metaRes, buildingsRes, vlmRes] = await Promise.all([
          fetch("/api/matthew-metadata").catch(() => null),
          fetch("/api/matthew-buildings").catch(() => null),
          fetch("/data/all_predictions.json").catch(() => null),
        ]);

        if (!metaRes || !metaRes.ok) {
          console.error("Failed to load map boundaries metadata.");
          return;
        }
        const metadataList = await metaRes.json();

        if (!Array.isArray(metadataList)) return;

        setTileCount(metadataList.length);

        const bounds = new mapboxgl.LngLatBounds();

        metadataList.forEach((meta: any) => {
          const { id, coordinates } = meta;
          coordinates.forEach(([lng, lat]: [number, number]) => bounds.extend([lng, lat]));

          map.addSource(`matthew-pre-${id}`, {
            type: "image",
            url: `/api/aws-image?id=${id}&type=pre`,
            coordinates,
          });
          map.addSource(`matthew-post-${id}`, {
            type: "image",
            url: `/api/aws-image?id=${id}&type=post`,
            coordinates,
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
          const ring = [...coordinates, coordinates[0]];
          return {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [ring] },
            properties: { id },
          };
        });

        map.addSource("matthew-bounds-source", {
          type: "geojson",
          data: { type: "FeatureCollection", features: features as any },
        });
        map.addLayer({
          id: "matthew-bounds-layer",
          type: "line",
          source: "matthew-bounds-source",
          paint: {
            "line-color": "#a855f7",
            "line-width": 2,
            "line-dasharray": [2, 2],
            "line-opacity": 0.8,
          },
          layout: { visibility: "visible" },
        });

        (map as any)._matthewLayerIds = metadataList.map((m: any) => m.id);
        map.fire("idle");

        // Buildings and predictions were already fetched in parallel above
        try {
          const buildingsGeojson = buildingsRes?.ok ? await buildingsRes.json() : null;
          const vlmJson = vlmRes?.ok ? await vlmRes.json() : null;

          if (!buildingsGeojson?.features || !map.getStyle()) return;

          const SUBTYPE_MAP: Record<string, string> = {
            "no damage": "no-damage",
            no_damage: "no-damage",
            minor: "minor-damage",
            major: "major-damage",
            destroyed: "destroyed",
          };

          // Map VLM predictions by UID
          const vlmMap = new Map();
          if (Array.isArray(vlmJson)) {
            vlmJson.forEach((pred: any) => {
              if (pred.building_uid && pred.damage_label) {
                const subtype = SUBTYPE_MAP[pred.damage_label.toLowerCase()] ?? "un-classified";
                vlmMap.set(pred.building_uid, subtype);
              }
            });
          }

          // Override Ground Truth subtype with VLM predicted subtype if available
          const joinedFeatures = buildingsGeojson.features.map((feature: any) => {
            const uid = feature.properties?.uid;
            if (uid && vlmMap.has(uid)) {
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  subtype: vlmMap.get(uid),
                },
              };
            }
            return feature;
          });

          const finalGeojson = {
            type: "FeatureCollection" as const,
            features: joinedFeatures,
          };

          map.addSource("matthew-buildings-source", {
            type: "geojson",
            data: finalGeojson as any,
          });
          map.addLayer({
            id: "matthew-buildings-fill",
            type: "fill",
            source: "matthew-buildings-source",
            paint: {
              "fill-color": [
                "match", ["get", "subtype"],
                "no-damage", "#22c55e",
                "minor-damage", "#eab308",
                "major-damage", "#f97316",
                "destroyed", "#ef4444",
                "#a1a1aa",
              ],
              "fill-opacity": 0.5,
            },
            layout: { visibility: (map as any)._heatmapVisible !== false ? "visible" : "none" },
          });
          map.addLayer({
            id: "matthew-buildings-outline",
            type: "line",
            source: "matthew-buildings-source",
            paint: {
              "line-color": [
                "match", ["get", "subtype"],
                "no-damage", "#15803d",
                "minor-damage", "#a16207",
                "major-damage", "#c2410c",
                "destroyed", "#b91c1c",
                "#52525b",
              ],
              "line-width": 1.5,
              "line-opacity": 0.9,
            },
            layout: { visibility: (map as any)._heatmapVisible !== false ? "visible" : "none" },
          });
        } catch (err) {
          console.error("Failed to load building footprints", err);
        }
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

  // ─── Imagery / heatmap toggle ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    (map as any)._heatmapVisible = showHeatmap;

    const updateLayers = () => {
      const ids = (map as any)._matthewLayerIds || [];
      ids.forEach((id: string) => {
        const preLayerId = `matthew-pre-layer-${id}`;
        const postLayerId = `matthew-post-layer-${id}`;
        if (map.getLayer(preLayerId))
          map.setLayoutProperty(preLayerId, "visibility", imagery === "pre" ? "visible" : "none");
        if (map.getLayer(postLayerId))
          map.setLayoutProperty(postLayerId, "visibility", imagery === "post" ? "visible" : "none");
      });
      if (map.getLayer("matthew-bounds-layer"))
        map.setLayoutProperty("matthew-bounds-layer", "visibility", "visible");
      if (map.getLayer("matthew-buildings-fill"))
        map.setLayoutProperty("matthew-buildings-fill", "visibility", showHeatmap ? "visible" : "none");
      if (map.getLayer("matthew-buildings-outline"))
        map.setLayoutProperty("matthew-buildings-outline", "visibility", showHeatmap ? "visible" : "none");
    };

    if (map.isStyleLoaded() && (map as any)._matthewLayerIds) {
      updateLayers();
    } else {
      map.once("idle", updateLayers);
    }
  }, [imagery, showHeatmap]);

  // ─── Chatbot overlay ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      // Clean up previous overlay
      if (map.getLayer(LAYER_FILL)) map.removeLayer(LAYER_FILL);
      if (map.getLayer(LAYER_GLOW)) map.removeLayer(LAYER_GLOW);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);

      if (command.records.length === 0) return;

      // Build GeoJSON from chatbot records
      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: command.records.map((r) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [r.lon, r.lat] },
          properties: {
            id: r.id,
            label: r.damage_label,
            confidence: r.confidence,
            address: r.address ?? r.street ?? r.id,
            color: DAMAGE_COLORS[r.damage_label?.toLowerCase()] ?? "#6b7280",
          },
        })),
      };

      map.addSource(SOURCE_ID, { type: "geojson", data: geojson });

      // Outer glow ring
      map.addLayer({
        id: LAYER_GLOW,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": 16,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.2,
          "circle-stroke-width": 2,
          "circle-stroke-color": ["get", "color"],
          "circle-stroke-opacity": 0.6,
        },
      });

      // Inner filled dot
      map.addLayer({
        id: LAYER_FILL,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": 8,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.95,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Click popup
      map.on("click", LAYER_FILL, (e) => {
        const props = e.features?.[0]?.properties;
        if (!props) return;
        new mapboxgl.Popup({ offset: 14 })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family:system-ui,sans-serif;min-width:170px;padding:2px 0">
              <div style="font-weight:700;font-size:13px;margin-bottom:5px;color:#111">${props.address}</div>
              <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#444">
                <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${props.color};flex-shrink:0"></span>
                <span style="text-transform:capitalize">${props.label}</span>
                <span style="color:#888">·</span>
                <span>${(props.confidence * 100).toFixed(0)}% confidence</span>
              </div>
            </div>
          `)
          .addTo(map);
      });

      map.on("mouseenter", LAYER_FILL, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", LAYER_FILL, () => {
        map.getCanvas().style.cursor = "";
      });

      // Zoom to fit all returned records
      if (command.records.length === 1) {
        map.flyTo({ center: [command.records[0].lon, command.records[0].lat], zoom: 17, duration: 1400, essential: true });
      } else {
        const bounds = new mapboxgl.LngLatBounds();
        command.records.forEach((r) => bounds.extend([r.lon, r.lat]));
        map.fitBounds(bounds, { padding: 60, duration: 1400, maxZoom: 16 });
      }
    };

    if (map.isStyleLoaded() && (map as any)._matthewLayerIds) {
      apply();
    } else {
      map.once("idle", apply);
    }
  }, [command]);

  return (
    <div className="relative w-full h-[75vh] min-h-[600px] rounded-xl overflow-hidden border border-zinc-200 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full" />
      {tileCount > 0 && imagery !== "none" && (
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur px-3 py-2 rounded-lg border border-zinc-200 shadow-md text-xs font-bold text-zinc-700 flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          Rendering {tileCount * 2} Satellite Images ({tileCount} Locations)
        </div>
      )}
    </div>
  );
}


// "use client";

// import { useEffect, useRef, useState } from "react";
// import mapboxgl from "mapbox-gl";
// import "mapbox-gl/dist/mapbox-gl.css";

// mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

// export default function DamageMap({
//     imagery,
//     showHeatmap = true,
// }: {
//     imagery: "pre" | "post" | "none"
//     showHeatmap?: boolean
// }) {
//     const [tileCount, setTileCount] = useState(0);
//     const mapContainerRef = useRef<HTMLDivElement | null>(null);
//     const mapRef = useRef<mapboxgl.Map | null>(null);

//     useEffect(() => {
//         if (!mapContainerRef.current || mapRef.current) return;

//         const map = new mapboxgl.Map({
//             container: mapContainerRef.current,
//             style: "mapbox://styles/mapbox/satellite-v9",
//             center: [-73.7646, 18.1912],
//             zoom: 16.5,
//             maxZoom: 18,
//         });



//         map.addControl(new mapboxgl.NavigationControl(), "top-right");

//         map.on("load", async () => {
//             try {
//                 const [res, buildRes] = await Promise.all([
//                     fetch("/api/matthew-metadata").catch(err => null),
//                     fetch("/api/matthew-buildings").catch(err => null)
//                 ]);
                
//                 if (!res || !res.ok) {
//                     console.error("Failed to load map boundaries metadata.");
//                     return;
//                 }
//                 const metadataList = await res.json();
                
//                 let buildingsGeojson = null;
//                 if (buildRes && buildRes.ok) {
//                     buildingsGeojson = await buildRes.json();
//                 }

//                 if (!Array.isArray(metadataList)) return;
                
//                 setTileCount(metadataList.length);

//                 // Expand bounds iteratively using metadataList coordinates
//                 const bounds = new mapboxgl.LngLatBounds();

//                 metadataList.forEach((meta) => {
//                     const { id, coordinates } = meta;
                    
//                     // Coordinates: [ [tlLng, tlLat], [trLng, trLat], [brLng, brLat], [blLng, blLat] ]
//                     coordinates.forEach(([lng, lat]: [number, number]) => bounds.extend([lng, lat]));

//                     map.addSource(`matthew-pre-${id}`, {
//                         type: "image",
//                         url: `/api/local-image?id=${id}&type=pre`,
//                         coordinates: coordinates,
//                     });

//                     map.addSource(`matthew-post-${id}`, {
//                         type: "image",
//                         url: `/api/local-image?id=${id}&type=post`,
//                         coordinates: coordinates,
//                     });

//                     map.addLayer({
//                         id: `matthew-pre-layer-${id}`,
//                         type: "raster",
//                         source: `matthew-pre-${id}`,
//                         layout: { visibility: "none" },
//                     });

//                     map.addLayer({
//                         id: `matthew-post-layer-${id}`,
//                         type: "raster",
//                         source: `matthew-post-${id}`,
//                         layout: { visibility: "none" },
//                     });
//                 });

//                 const features = metadataList.map((meta: any) => {
//                     const { id, coordinates } = meta;
//                     // close the ring for polygon
//                     const ring = [...coordinates, coordinates[0]];
//                     return {
//                         type: "Feature",
//                         geometry: {
//                             type: "Polygon",
//                             coordinates: [ring]
//                         },
//                         properties: { id }
//                     };
//                 });

//                 map.addSource("matthew-bounds-source", {
//                     type: "geojson",
//                     data: {
//                         type: "FeatureCollection",
//                         features: features as any
//                     }
//                 });

//                 map.addLayer({
//                     id: "matthew-bounds-layer",
//                     type: "line",
//                     source: "matthew-bounds-source",
//                     paint: {
//                         "line-color": "#a855f7", // strong purple color to stand out from red/yellow/green
//                         "line-width": 2,
//                         "line-dasharray": [2, 2],
//                         "line-opacity": 0.8
//                     },
//                     layout: { visibility: "none" }
//                 });

//                 if (buildingsGeojson && buildingsGeojson.features) {
//                     map.addSource("matthew-buildings-source", {
//                         type: "geojson",
//                         data: buildingsGeojson
//                     });

//                     map.addLayer({
//                         id: "matthew-buildings-fill",
//                         type: "fill",
//                         source: "matthew-buildings-source",
//                         paint: {
//                             "fill-color": [
//                                 "match",
//                                 ["get", "subtype"],
//                                 "no-damage", "#22c55e",
//                                 "minor-damage", "#eab308",
//                                 "major-damage", "#f97316",
//                                 "destroyed", "#ef4444",
//                                 /* default */ "#a1a1aa"
//                             ],
//                             "fill-opacity": 0.5
//                         },
//                         layout: { visibility: "none" }
//                     });

//                     map.addLayer({
//                         id: "matthew-buildings-outline",
//                         type: "line",
//                         source: "matthew-buildings-source",
//                         paint: {
//                             "line-color": [
//                                 "match",
//                                 ["get", "subtype"],
//                                 "no-damage", "#15803d",
//                                 "minor-damage", "#a16207",
//                                 "major-damage", "#c2410c",
//                                 "destroyed", "#b91c1c",
//                                 /* default */ "#52525b"
//                             ],
//                             "line-width": 1.5,
//                             "line-opacity": 0.9
//                         },
//                         layout: { visibility: "none" }
//                     });
//                 }
                
//                 // Keep the IDs saved off map object hack for updating visibility easily later
//                 (map as any)._matthewLayerIds = metadataList.map((m: any) => m.id);

//                 // Option: Fit to actual dataset bounds, not just center
//                 // map.fitBounds(bounds, { padding: 40 });
                
//                 // Re-run the imagery toggle after load to apply initial state
//                 map.fire("idle");
//             } catch (err) {
//                 console.error("Failed to load metadata list", err);
//             }
//         });

//         mapRef.current = map;

//         return () => {
//             map.remove();
//             mapRef.current = null;
//         };
//     }, []);

//     useEffect(() => {
//         const map = mapRef.current;
//         if (!map) return;

//         const updateLayers = () => {
//             const ids = (map as any)._matthewLayerIds || [];
//             ids.forEach((id: string) => {
//                 const preLayerId = `matthew-pre-layer-${id}`;
//                 const postLayerId = `matthew-post-layer-${id}`;
                
//                 if (map.getLayer(preLayerId)) {
//                     map.setLayoutProperty(preLayerId, "visibility", imagery === "pre" ? "visible" : "none");
//                 }
//                 if (map.getLayer(postLayerId)) {
//                     map.setLayoutProperty(postLayerId, "visibility", imagery === "post" ? "visible" : "none");
//                 }
//             });

//             if (map.getLayer("matthew-bounds-layer")) {
//                 map.setLayoutProperty("matthew-bounds-layer", "visibility", imagery !== "none" ? "visible" : "none");
//             }
//             if (map.getLayer("matthew-buildings-fill")) {
//                 map.setLayoutProperty("matthew-buildings-fill", "visibility", showHeatmap ? "visible" : "none");
//             }
//             if (map.getLayer("matthew-buildings-outline")) {
//                 map.setLayoutProperty("matthew-buildings-outline", "visibility", showHeatmap ? "visible" : "none");
//             }
//         };

//         if (map.isStyleLoaded() && (map as any)._matthewLayerIds) {
//             updateLayers();
//         } else {
//             map.once("idle", updateLayers);
//         }
//     }, [imagery, showHeatmap]);

//     return (
//         <div className="relative w-full h-[75vh] min-h-[600px] rounded-xl overflow-hidden border border-zinc-200 shadow-inner">
//             <div ref={mapContainerRef} className="w-full h-full" />
//             {tileCount > 0 && imagery !== "none" && (
//                 <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur px-3 py-2 rounded-lg border border-zinc-200 shadow-md text-xs font-bold text-zinc-700 flex items-center gap-2">
//                     <span className="flex h-2.5 w-2.5 relative">
//                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
//                       <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
//                     </span>
//                     Rendering {tileCount * 2} Satellite Images ({tileCount} Locations)
//                 </div>
//             )}
//         </div>
//     );
// }
