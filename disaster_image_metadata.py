#!/usr/bin/env python3
"""
Disaster Image Metadata Extractor
Extracts GPS, disaster context, and pixel-level stats from an image file.
Usage: python disaster_image_metadata.py <image_path>
"""

import sys
import os
import json
import numpy as np
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS


DISASTER_KEYWORDS = [
    "flood", "fire", "earthquake", "hurricane", "tornado", "tsunami",
    "wildfire", "storm", "cyclone", "landslide", "avalanche", "drought",
    "explosion", "collapse", "damage", "disaster", "emergency", "rescue",
]


def get_gps_info(image_path):
    with Image.open(image_path) as img:
        exif_data = img._getexif() if hasattr(img, "_getexif") else None
    if not exif_data:
        return None
    gps_raw = None
    for tag_id, value in exif_data.items():
        if TAGS.get(tag_id) == "GPSInfo":
            gps_raw = {GPSTAGS.get(t, t): v for t, v in value.items()}
            break
    if not gps_raw:
        return None
    def to_decimal(dms, ref):
        d, m, s = float(dms[0]), float(dms[1]), float(dms[2])
        decimal = d + m / 60 + s / 3600
        return round(-decimal if ref in ("S", "W") else decimal, 6)
    gps = {}
    if "GPSLatitude" in gps_raw and "GPSLatitudeRef" in gps_raw:
        gps["latitude"] = to_decimal(gps_raw["GPSLatitude"], gps_raw["GPSLatitudeRef"])
    if "GPSLongitude" in gps_raw and "GPSLongitudeRef" in gps_raw:
        gps["longitude"] = to_decimal(gps_raw["GPSLongitude"], gps_raw["GPSLongitudeRef"])
    if "GPSAltitude" in gps_raw:
        gps["altitude_meters"] = round(float(gps_raw["GPSAltitude"]), 2)
    return gps or None


def get_disaster_context(image_path):
    filename = os.path.basename(image_path).lower()
    return [kw for kw in DISASTER_KEYWORDS if kw in filename]


def get_pixel_stats(image_path):
    with Image.open(image_path) as img:
        width, height = img.size
        img_rgb = img.convert("RGB")

    pixels = np.array(img_rgb, dtype=np.float32)
    r, g, b = pixels[:, :, 0], pixels[:, :, 1], pixels[:, :, 2]

    # Mean brightness (average of all channels)
    brightness = float(np.mean(pixels))

    # Per-channel stats
    channel_stats = {
        "red":   {"mean": round(float(np.mean(r)), 2), "std": round(float(np.std(r)), 2)},
        "green": {"mean": round(float(np.mean(g)), 2), "std": round(float(np.std(g)), 2)},
        "blue":  {"mean": round(float(np.mean(b)), 2), "std": round(float(np.std(b)), 2)},
    }

    # Green ratio — high = healthy vegetation, low = possible damage/burn/flood
    green_ratio = round(float(np.mean(g)) / (float(np.mean(r)) + 1e-5), 4)

    # Dark pixel ratio — high ratio may indicate burn scars, flooding, or debris
    dark_threshold = 50
    dark_pixel_ratio = round(float(np.mean(pixels < dark_threshold)), 4)

    # Contrast std deviation — indicates structural complexity
    overall_std = round(float(np.std(pixels)), 2)

    # Damage hints based on simple heuristics
    hints = []
    if brightness < 80:
        hints.append("Low brightness — possible burn scars, flooding, or heavy shadow")
    if dark_pixel_ratio > 0.2:
        hints.append("High dark pixel ratio — possible debris, flooding, or burned areas")
    if green_ratio < 0.9:
        hints.append("Low green ratio — reduced vegetation, possible damage or defoliation")
    if overall_std > 60:
        hints.append("High contrast variation — structural complexity or mixed damage")
    if not hints:
        hints.append("No strong damage indicators detected from pixel stats alone")

    return {
        "dimensions": {"width": width, "height": height, "megapixels": round((width * height) / 1_000_000, 2)},
        "mean_brightness": round(brightness, 2),
        "channel_stats": channel_stats,
        "green_ratio": green_ratio,
        "dark_pixel_ratio": dark_pixel_ratio,
        "contrast_std": overall_std,
        "damage_hints": hints,
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: python disaster_image_metadata.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]

    if not os.path.exists(image_path):
        print(f"Error: File not found: {image_path}")
        sys.exit(1)

    gps = get_gps_info(image_path)
    keywords = get_disaster_context(image_path)
    pixel_stats = get_pixel_stats(image_path)

    result = {
        "gps": gps or "No GPS data found",
        "disaster_keywords": keywords or "No disaster keywords found in filename",
        "pixel_stats": pixel_stats,
    }

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()