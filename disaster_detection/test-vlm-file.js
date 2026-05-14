const fs = require('fs');
const raw = fs.readFileSync('public/data/results/00000010.json', 'utf8');
const data = JSON.parse(raw);
console.log(data[0].source_full_image_name);
console.log(data[0].damage_label);
