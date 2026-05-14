import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { parseBBox, predictionsToFeatureCollection, Prediction } from "@/app/utils/geojson";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const bboxParam = url.searchParams.get("bbox");
  const bbox = parseBBox(bboxParam);

  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 5000;
  if (limitParam && (Number.isNaN(limit) || limit <= 0)) {
    return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
  }
  if (bboxParam && !bbox) {
    return NextResponse.json({ error: "Invalid bbox. Use minLon,minLat,maxLon,maxLat" }, { status: 400 });
  }

  // Read all JSON files from /public/data/results/
  const resultsDir = path.join(process.cwd(), "public", "data", "results");
  
  try {
    const files = await fs.readdir(resultsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    // Read and parse all JSON files
    const allPredictions: Prediction[] = [];
    
    for (const file of jsonFiles) {
      const filePath = path.join(resultsDir, file);
      const raw = await fs.readFile(filePath, "utf8");
      const predictions = JSON.parse(raw) as Prediction[];
      allPredictions.push(...predictions);
    }

    const geojson = predictionsToFeatureCollection(allPredictions, bbox, limit);
    return NextResponse.json(geojson);
  } catch (error) {
    console.error("Error reading predictions:", error);
    return NextResponse.json(
      { error: "Failed to read predictions from data/results directory" },
      { status: 500 }
    );
  }
}




// import { NextResponse } from "next/server";
// import path from "path";
// import { promises as fs } from "fs";
// import { parseBBox, predictionsToFeatureCollection, Prediction } from "@/app/utils/geojson";

// export async function GET(req: Request) {
//   const url = new URL(req.url);

//   const bboxParam = url.searchParams.get("bbox");
//   const bbox = parseBBox(bboxParam);

//   const limitParam = url.searchParams.get("limit");
//   const limit = limitParam ? Number(limitParam) : 5000;
//   if (limitParam && (Number.isNaN(limit) || limit <= 0)) {
//     return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
//   }
//   if (bboxParam && !bbox) {
//     return NextResponse.json({ error: "Invalid bbox. Use minLon,minLat,maxLon,maxLat" }, { status: 400 });
//   }

//   // Reads from /public/data/dummy_predictions.json (public is alongside src)
//   const filePath = path.join(process.cwd(), "public", "data", "dummy_predictions.json");
//   const raw = await fs.readFile(filePath, "utf8");
//   const predictions = JSON.parse(raw) as Prediction[];

//   const geojson = predictionsToFeatureCollection(predictions, bbox, limit);
//   return NextResponse.json(geojson);
// }