import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function GET() {
    try {
        const homeDir = os.homedir();
        const labelsDir = path.join(homeDir, 'Downloads', 'train 2', 'labels');
        
        if (!fs.existsSync(labelsDir)) {
            return NextResponse.json({ error: "Labels directory not found at " + labelsDir }, { status: 404 });
        }

        const files = fs.readdirSync(labelsDir);
        const matthewPreFiles = files.filter(f => f.startsWith('hurricane-matthew_') && f.endsWith('_pre_disaster.json'));

        const metadataList = [];

        for (const file of matthewPreFiles) {
            const idMatch = file.match(/hurricane-matthew_(\d+)_pre_disaster\.json/);
            if (!idMatch) continue;
            
            const id = idMatch[1];
            const filePath = path.join(labelsDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);

            if (!data.metadata || !data.features || !data.features.lng_lat || data.features.lng_lat.length === 0) continue;

            let points = [];
            for (let i = 0; i < data.features.lng_lat.length; i++) {
                const lngLatFeature = data.features.lng_lat[i];
                const xyFeature = data.features.xy[i];
                if (!lngLatFeature || !xyFeature) continue;
                
                const lngLatWkt = lngLatFeature.wkt;
                const xyWkt = xyFeature.wkt;
                
                try {
                    const lngLats = lngLatWkt.replace('POLYGON ((', '').replace('))', '').split(', ').map((p: string) => {
                        const [lng, lat] = p.split(' ').map(Number);
                        return { lng, lat };
                    });
                    
                    const xys = xyWkt.replace('POLYGON ((', '').replace('))', '').split(', ').map((p: string) => {
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
                } catch(e) {
                    continue;
                }
            }

            if (points.length < 2) continue;

            // Linear regression for corners
            let sumX = 0, sumY = 0, sumLng = 0, sumLat = 0;
            let sumXX = 0, sumYY = 0, sumXLng = 0, sumYLat = 0;

            for (let p of points) {
                sumX += p.x; sumY += p.y;
                sumLng += p.lng; sumLat += p.lat;
                sumXX += p.x * p.x; sumYY += p.y * p.y;
                sumXLng += p.x * p.lng; sumYLat += p.y * p.lat;
            }

            const n = points.length;
            const detX = (n * sumXX - sumX * sumX);
            const detY = (n * sumYY - sumY * sumY);
            
            if (detX === 0 || detY === 0) continue;

            const m_lng = (n * sumXLng - sumX * sumLng) / detX;
            const b_lng = (sumLng - m_lng * sumX) / n;

            const m_lat = (n * sumYLat - sumY * sumLat) / detY;
            const b_lat = (sumLat - m_lat * sumY) / n;

            const width = data.metadata.width;
            const height = data.metadata.height;

            // Mapbox expects coordinates in this order: [top-left, top-right, bottom-right, bottom-left]
            // Note: Images in this dataset usually have y=0 at the top, increasing downwards.
            // Lat usually increases upwards. So y=0 is max lat.
            // Mapbox coords for an image layer:
            // The coordinates array is formatted [top-left, top-right, bottom-right, bottom-left]
            const tl = [b_lng, b_lat]; // x=0, y=0 (top-left)
            const tr = [m_lng * width + b_lng, b_lat]; // x=width, y=0 (top-right)
            const br = [m_lng * width + b_lng, m_lat * height + b_lat]; // x=width, y=height (bottom-right)
            const bl = [b_lng, m_lat * height + b_lat]; // x=0, y=height (bottom-left)

            metadataList.push({
                id,
                coordinates: [tl, tr, br, bl]
            });
        }

        return NextResponse.json(metadataList);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
