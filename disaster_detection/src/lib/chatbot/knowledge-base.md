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
