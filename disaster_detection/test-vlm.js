const fs = require('fs');
const path = require('path');
const resultsDir = path.join(process.cwd(), "public", "data", "results");
const files = fs.readdirSync(resultsDir).filter(f => f.endsWith(".json"));
const raw = fs.readFileSync(path.join(resultsDir, files[0]), "utf8");
console.log("File:", files[0]);
console.log("Keys:", Object.keys(JSON.parse(raw)[0]));
