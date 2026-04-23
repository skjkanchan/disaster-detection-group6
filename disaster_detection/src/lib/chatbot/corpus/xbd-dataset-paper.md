---
title: xBD — A Dataset for Assessing Building Damage from Satellite Imagery
source: Gupta et al., CVPR Workshop 2019 / xView2 Challenge
date: 2019-06-16
url: https://arxiv.org/abs/1911.09296
---

# xBD: A Dataset for Building Damage Assessment

The xBD dataset was released by the Defense Innovation Unit (DIU) and partners as the training corpus for the xView2 Challenge. It is the largest publicly available dataset for post-disaster building-damage classification from satellite imagery.

## Dataset Composition

- 850,000+ building polygons labeled with damage classes.
- 22,068 image tiles at 1024×1024 pixels, captured by the WorldView-02 and WorldView-03 satellites.
- Ground sample distance (GSD) is approximately 0.5 m (pan) and 2.0–2.4 m (multispectral).
- 19 disaster events covering hurricanes, wildfires, floods, earthquakes, volcanic eruptions, and tsunamis.
- Hurricane Matthew tiles focus on Haiti (Grand'Anse, Sud) and the southeastern United States.

## Damage Scale (Joint Damage Scale)

Each building is labeled with one of four ordinal damage classes:

1. **No damage** — Undisturbed; no visible deformation.
2. **Minor damage** — Visible roof element loss, partial burn, slight leaning.
3. **Major damage** — Major structural compromise; partial collapse or heavy roof damage.
4. **Destroyed** — Structure is scorched, collapsed, or completely demolished.

A fifth class, **un-classified**, is used when label annotators could not determine damage due to image quality, cloud cover, or sensor artefacts.

## Labeling Methodology

Labels were produced by trained human annotators following the Joint Damage Scale, with quality-control cross-checks against FEMA ground-truth inspector reports where available. Per-building annotations are stored as Well-Known Text (WKT) polygons in both geographic (lng, lat) and pixel (x, y) coordinates, co-registered between pre- and post-event image pairs.

## Relevance to This Dashboard

This project uses xBD-format labels for Hurricane Matthew and compares them against zero-shot Vision-Language Model predictions. The four-class damage scale drives the building overlay colors on the main map: green (no-damage), yellow (minor), orange (major), red (destroyed).
