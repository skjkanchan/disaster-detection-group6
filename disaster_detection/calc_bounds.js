const fs = require('fs');

const jsonFile = '/Users/adarshgoura/Downloads/train 2/labels/hurricane-matthew_00000085_post_disaster.json';
const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

let points = [];

for (let i = 0; i < data.features.lng_lat.length; i++) {
    const lngLatWkt = data.features.lng_lat[i].wkt;
    const xyWkt = data.features.xy[i].wkt;
    
    // Parse wkt POLYGON ((lng lat, lng lat ...))
    const lngLats = lngLatWkt.replace('POLYGON ((', '').replace('))', '').split(', ').map(p => {
        const [lng, lat] = p.split(' ').map(Number);
        return { lng, lat };
    });
    
    const xys = xyWkt.replace('POLYGON ((', '').replace('))', '').split(', ').map(p => {
        const [x, y] = p.split(' ').map(Number);
        return { x, y };
    });
    
    for(let j = 0; j < lngLats.length; j++) {
        points.push({
            lng: lngLats[j].lng,
            lat: lngLats[j].lat,
            x: xys[j].x,
            y: xys[j].y
        });
    }
}

// Simple linear regression since it's a small area
let sumX = 0, sumY = 0, sumLng = 0, sumLat = 0;
let sumXX = 0, sumYY = 0, sumXLng = 0, sumYLat = 0;

for (let p of points) {
    sumX += p.x; sumY += p.y;
    sumLng += p.lng; sumLat += p.lat;
    sumXX += p.x * p.x; sumYY += p.y * p.y;
    sumXLng += p.x * p.lng; sumYLat += p.y * p.lat;
}

const n = points.length;
const m_lng = (n * sumXLng - sumX * sumLng) / (n * sumXX - sumX * sumX);
const b_lng = (sumLng - m_lng * sumX) / n;

const m_lat = (n * sumYLat - sumY * sumLat) / (n * sumYY - sumY * sumY);
const b_lat = (sumLat - m_lat * sumY) / n;

const width = data.metadata.width;
const height = data.metadata.height;

// Corners: top-left (0,0), top-right (width,0), bottom-right (width,height), bottom-left (0,height)
const tl = [b_lng, b_lat]; // x=0, y=0
const tr = [m_lng * width + b_lng, b_lat]; // x=width, y=0
const br = [m_lng * width + b_lng, m_lat * height + b_lat]; // x=width, y=height
const bl = [b_lng, m_lat * height + b_lat]; // x=0, y=height

console.log(JSON.stringify([tl, tr, br, bl]));
