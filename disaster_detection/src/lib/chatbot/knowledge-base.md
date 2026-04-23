# Disaster Damage Assessment — Knowledge Base

## Project Overview

This system is an AI-powered disaster damage assessment tool developed as a Senior Capstone project at The University of Texas at Dallas. It automates the analysis of pre- and post-disaster aerial/satellite imagery using Vision-Language Models (VLMs) to classify building damage, replacing slow and costly manual inspection.

## VLM Pipeline

The Vision-Language Model pipeline works as follows:
1. Pre-disaster and post-disaster satellite image tiles are paired for the same geographic location.
2. The VLM analyzes the pre-disaster tile to establish a baseline (building inventory, structural features).
3. The VLM then analyzes the post-disaster tile, comparing it against the baseline to identify structural changes.
4. Damage classifications are assigned to each building: no-damage, minor-damage, major-damage, or destroyed.
5. Optionally, the Segment Anything Model (SAM) is used to generate precise building boundary masks for more accurate per-building assessments.
6. The pipeline outputs structured damage labels with confidence scores for each detected building.

## Dataset

The system uses the xBD (xView Building Damage) dataset format, specifically Hurricane Matthew imagery. Key facts:
- Satellite imagery captured by WorldView-02 sensor on 2016-10-01.
- Each image tile is 1024x1024 pixels with a ground sample distance of approximately 2.38 meters.
- Building footprints are stored as WKT (Well-Known Text) polygons with latitude/longitude coordinates.
- Each building has a unique ID and a damage subtype classification.
- The dataset covers areas affected by Hurricane Matthew in Haiti and the southeastern United States.

## Damage Classification Levels

Buildings are classified into four damage levels:
- **No Damage**: Structure appears intact with no visible damage from aerial imagery.
- **Minor Damage**: Slight roof damage, missing shingles, or minor wind damage visible.
- **Major Damage**: Significant structural damage — large sections of roof missing, walls compromised.
- **Destroyed**: Structure is collapsed, uninhabitable, or completely demolished.
- **Un-classified**: Building detected but damage level could not be determined.

## Model Performance (VLM vs Ground Truth)

Comparison of VLM predictions against xBD JSON ground-truth labels:
- No Damage: VLM predicted 8,120 buildings vs 9,005 in ground truth
- Minor Damage: VLM predicted 2,430 buildings vs 2,012 in ground truth
- Major Damage: VLM predicted 1,420 buildings vs 1,650 in ground truth
- Destroyed: VLM predicted 1,390 buildings vs 1,272 in ground truth
- Total buildings analyzed: approximately 13,360

## Dashboard Capabilities

The geospatial dashboard provides:
- Satellite imagery overlays (pre-disaster and post-disaster) on a Mapbox base map.
- Building polygon overlays color-coded by damage level (green = no damage, yellow = minor, orange = major, red = destroyed).
- Heatmap visualization of damage distribution.
- Pre/post disaster imagery toggle for visual comparison.
- Damage distribution charts and percentage indicators.
- An interactive chatbot for querying damage data.
- Image upload functionality for new imagery analysis.

## Evaluation Approach

The evaluation module compares VLM-generated damage predictions against FEMA ground-truth labels from the xBD dataset to measure classification accuracy, precision, recall, and overall model reliability.

## Hurricane Matthew — Key Facts (for quick reference)

These short facts are mirrored from the curated external corpus (FEMA, UN OCHA, NOAA NHC, AP News) and can be cited directly when the external sources do not cover a very specific sub-question.

- **Formation**: Tropical wave off the African coast on September 22, 2016; named Tropical Storm Matthew on September 28.
- **Peak intensity**: Category 5 on October 1, 2016 with 165 mph (270 km/h) sustained winds and 934 mb central pressure — the southernmost Atlantic Category 5 on record (13.4°N).
- **Haiti landfall**: October 4, 2016 at about 11:00 UTC near Les Anglais, Tiburon Peninsula, as a Category 4 (145 mph / 230 km/h). Most powerful storm to strike Haiti since Cleo (1964).
- **Cuba landfall**: October 4, 2016 at about 24:00 UTC near Juaco, Guantánamo Province (Category 4).
- **Bahamas**: Passed directly over Nassau on October 6, 2016 as a Category 3.
- **U.S. landfall**: October 8, 2016 at about 15:00 UTC near McClellanville, South Carolina (Category 1, 75 mph).
- **Haiti casualties**: 546 confirmed deaths (Haitian government); humanitarian estimates around 1,000+. About 175,500 displaced, 2.1 million affected, 1.4 million (including 592,000 children) needing immediate assistance; 200,000+ homes damaged or destroyed.
- **U.S. casualties**: At least 49 deaths across Florida, Georgia, South Carolina, and North Carolina. North Carolina alone: 28 deaths, 100,000+ homes/businesses damaged.
- **U.S. evacuations**: 2.2+ million residents placed under mandatory evacuation; peak power outages exceeded 2.2 million customers.
- **Economic damage**: ~$10 billion USD in the United States; ~$16.47 billion worldwide (2016 USD).
- **FEMA declarations**: DR-4283 (FL), DR-4285 (GA), DR-4286 (SC), DR-4287 (NC) — all in October 2016.
- **Follow-on health**: Cholera outbreak in southern Haiti, 3,400+ suspected new cases in the month after landfall; $120 million international appeal.
