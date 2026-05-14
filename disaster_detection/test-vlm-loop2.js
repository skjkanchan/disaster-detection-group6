const fs = require('fs');
const path = require('path');

const resultsDir = path.join(process.cwd(), "public", "data", "results");
const raw = fs.readFileSync(path.join(resultsDir, "00000010.json"), "utf8");
const preds = JSON.parse(raw);

console.log(preds[0].gt_full_image_pixel_polygon);
console.log(preds[0].polygon);

