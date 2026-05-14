import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { GET as getMetadata } from "../matthew-metadata/route";

const IMAGE_SIZE = 1024;

const SUBTYPE_MAP: Record<string, string> = {
  "no damage": "no-damage",
  no_damage: "no-damage",
  minor: "minor-damage",
  major: "major-damage",
  destroyed: "destroyed",
};

function pixelToGeo(
  px: number,
  py: number,
  corners: number[][]
): [number, number] {
  const u = px / IMAGE_SIZE;
  const v = py / IMAGE_SIZE;
  const [tl, tr, br, bl] = corners;
  const lng =
    tl[0] * (1 - u) * (1 - v) +
    tr[0] * u * (1 - v) +
    br[0] * u * v +
    bl[0] * (1 - u) * v;
  const lat =
    tl[1] * (1 - u) * (1 - v) +
    tr[1] * u * (1 - v) +
    br[1] * u * v +
    bl[1] * (1 - u) * v;
  return [lng, lat];
}

export async function GET() {
  try {
    const metaRes = await getMetadata();
    const metadataList: Array<{ id: string; coordinates: number[][] }> =
      await metaRes.json();

    const metaById: Record<string, number[][]> = {};
    for (const m of metadataList) {
      metaById[m.id] = m.coordinates;
    }

    const allPredsRaw = await fs.readFile(path.join(process.cwd(), "public", "data", "all_predictions.json"), "utf8");
    const preds = JSON.parse(allPredsRaw);

    type GeoFeature = {
      type: "Feature";
      geometry: { type: "Polygon"; coordinates: [number, number][][] };
      properties: { subtype: string; uid: string };
    };
    const features: GeoFeature[] = [];

    for (const pred of preds) {
      if (!pred.damage_label) continue;
      const subtype = SUBTYPE_MAP[pred.damage_label?.toLowerCase()] ?? "un-classified";
      
      features.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [] }, // empty geometry, will be joined with matthew-buildings
        properties: { subtype, uid: pred.building_uid },
      });
    }

    return NextResponse.json({ type: "FeatureCollection", features });
  } catch (error) {
    console.error("VLM predictions error:", error);
    return NextResponse.json(
      { type: "FeatureCollection", features: [] },
      { status: 500 }
    );
  }
}
