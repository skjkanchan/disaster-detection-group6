# Geospatial API – Damage Predictions

## Endpoint
GET /api/damage-geojson

## Description
Returns model damage predictions formatted as a GeoJSON FeatureCollection for map visualization.

## Query Parameters

### bbox (optional)
Format:
minLon,minLat,maxLon,maxLat

Example:
?bbox=-77.96,34.21,-77.93,34.24

Returns only predictions within the bounding box.

### limit (optional)
Maximum number of features returned.
Default: 5000

## Response Format
GeoJSON FeatureCollection.

Each feature contains:
- geometry: Point [lon, lat]
- properties:
  - damage_class
  - severity_rank
  - confidence
  - raw_label
  - explanation (optional)
  - timestamp (optional)

## Notes
- Coordinates follow GeoJSON standard: [longitude, latitude]
- Damage labels are normalized to:
  no_damage, minor, major, destroyed, unknown