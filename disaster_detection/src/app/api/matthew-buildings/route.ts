
export async function GET() {
  const res = await fetch(
    "https://qsa092foyk.execute-api.us-east-2.amazonaws.com/default/getMatthewBuildings"
  );
  const data = await res.json();
  return Response.json(data);
}


// import { NextResponse } from "next/server";
// import fs from "fs";
// import path from "path";
// import os from "os";

// function parseWKT(wkt: string) {
//     if (!wkt) return null;
//     const match = wkt.match(/\(\((.*?)\)\)/);
//     if (!match) return null;
//     const pointsStr = match[1];
//     if (!pointsStr) return null;

//     const points = pointsStr.split(",");
//     const coords = points.map((p) => {
//         const [lng, lat] = p.trim().split(/\s+/).map(Number);
//         return [lng, lat];
//     });

//     if (coords.length > 0 && (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1])) {
//         coords.push(coords[0]);
//     }

//     return [coords];
// }

// export async function GET() {
//     try {
//         const homeDir = os.homedir();
//         const labelsDir = path.join(homeDir, "Downloads", "train 2", "labels");

//         if (!fs.existsSync(labelsDir)) {
//             return NextResponse.json({ error: "Directory not found" }, { status: 404 });
//         }

//         const files = fs.readdirSync(labelsDir).filter(
//             (file) => file.startsWith("hurricane-matthew_") && file.endsWith("_post_disaster.json")
//         );

//         const features: any[] = [];

//         for (const file of files) {
//             const filePath = path.join(labelsDir, file);
//             let rawData;
//             try {
//                 rawData = fs.readFileSync(filePath, "utf-8");
//             } catch (err) {
//                 continue;
//             }

//             const parsed = JSON.parse(rawData);
//             if (parsed.features && parsed.features.lng_lat) {
//                 for (const item of parsed.features.lng_lat) {
//                     if (item.wkt) {
//                         const coords = parseWKT(item.wkt);
//                         if (coords && coords[0].length >= 4) {
//                             const subtype = item.properties?.subtype || "un-classified";
//                             features.push({
//                                 type: "Feature",
//                                 geometry: {
//                                     type: "Polygon",
//                                     coordinates: coords,
//                                 },
//                                 properties: {
//                                     subtype,
//                                 },
//                             });
//                         }
//                     }
//                 }
//             }
//         }

//         const geojson = {
//             type: "FeatureCollection",
//             features: features,
//         };

//         return NextResponse.json(geojson);
//     } catch (error) {
//         console.error("Error generating building mask geojson:", error);
//         return NextResponse.json({ error: "Error parsing geojson features" }, { status: 500 });
//     }
// }
