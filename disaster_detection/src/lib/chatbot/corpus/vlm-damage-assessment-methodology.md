---
title: Vision-Language Models for Post-Disaster Building Damage Assessment
source: UT Dallas Senior Capstone (Group 6) — Internal Methodology Note
date: 2025-11-01
url: internal
---

# VLM Pipeline — Methodology

## Motivation

Traditional post-disaster damage assessment is manual, slow, and cost-prohibitive at scale. FEMA inspectors typically reach affected neighborhoods days or weeks after landfall, which delays individual assistance payments and public-assistance obligations. Vision-Language Models (VLMs) offer zero-shot or few-shot classification of satellite imagery, enabling rapid triage of millions of structures within hours of post-event imagery availability.

## Pipeline

1. **Tile pairing** — Pre-disaster and post-disaster xBD tiles (1024×1024 px) are registered to the same geographic footprint and paired by tile id (e.g. `hurricane-matthew_00000011`).
2. **Building crops** — The xBD building polygons are rasterized and used to crop per-building image patches from both the pre and post tiles. Crops are stored in `cropped-pre-disaster-images/` and `cropped-post-disaster-images/`.
3. **VLM prompt** — For each building, the VLM receives both the pre and post crops side-by-side with a carefully crafted prompt asking it to classify damage into one of {no-damage, minor-damage, major-damage, destroyed, un-classified} and return a short natural-language explanation.
4. **Aggregation** — Per-building classifications are written back to the xBD JSON structure and served to the dashboard via the `/api/matthew-buildings` endpoint as a GeoJSON FeatureCollection.
5. **Optional SAM step** — The Segment Anything Model (SAM) can be used to refine building masks when the xBD polygons are coarse or stale.

## Evaluation

The VLM output is evaluated against the xBD ground-truth labels using a per-class confusion matrix and macro-averaged precision, recall, and F1. The evaluation tab in the dashboard displays these metrics alongside per-class counts. On the Hurricane Matthew subset, the VLM tends to over-predict minor-damage and under-predict major-damage relative to ground truth, which is consistent with prior xView2 baselines that struggle to distinguish mid-tier damage classes from overhead imagery alone.

## Limitations

- Zero-shot VLM accuracy on destroyed vs. major-damage remains imperfect; roof-only views cannot capture interior structural compromise.
- Oblique angles, cloud cover, and shadows reduce confidence; these cases are mapped to `un-classified`.
- The pipeline currently operates on a single disaster; domain shift to wildfires or floods would require prompt re-engineering.
