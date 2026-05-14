const fs = require('fs');
const path = require('path');

async function test() {
  const res = await fetch("http://localhost:3000/api/matthew-metadata");
  const metadataList = await res.json();
  const metaById = {};
  for (const m of metadataList) {
    metaById[m.id] = m.coordinates;
  }

  const resultsDir = path.join(process.cwd(), "public", "data", "results");
  const files = fs.readdirSync(resultsDir).filter(f => f.endsWith(".json") && !f.includes("("));

  let features = 0;
  for (const file of files) {
    const imageId = file.replace(/\.json$/, "").trim();
    const raw = fs.readFileSync(path.join(resultsDir, file), "utf8");
    const preds = JSON.parse(raw);
    
    if (!Array.isArray(preds)) continue;

    const corners = metaById[imageId];
    if (!corners) {
      // console.log("NO CORNERS FOR:", imageId);
      continue;
    }

    for (const pred of preds) {
      if (!pred.damage_label) continue;
      
      if (
        corners &&
        Array.isArray(pred.gt_full_image_pixel_polygon) &&
        pred.gt_full_image_pixel_polygon.length >= 3
      ) {
        features++;
      }
    }
  }
  console.log("Features:", features);
}
test();
