import os
import csv
import logging
from PIL import Image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

TILE_SIZE = 512
OVERLAP   = 0

PRE_DISASTER_DIR  = "pre-disaster-images"
POST_DISASTER_DIR = "post-disaster-images"
CROPPED_PRE_DIR   = "cropped-pre-disaster-images"
CROPPED_POST_DIR  = "cropped-post-disaster-images"
MANIFEST_FILE     = "tile_pairs.csv"

VALID_EXTENSIONS = (".png", ".jpg", ".jpeg", ".tif", ".tiff")


def process_image(image_path: str, output_dir: str):
    ext = os.path.splitext(image_path)[1].lower()
    base_name = os.path.splitext(os.path.basename(image_path))[0]

    image = Image.open(image_path).convert("RGB")
    width, height = image.size
    logger.info(f"  Image size: {width}x{height}")

    out_folder = os.path.join(output_dir, base_name)
    os.makedirs(out_folder, exist_ok=True)

    step = TILE_SIZE - OVERLAP
    tiles = []

    y, row = 0, 0
    while y < height:
        x, col = 0, 0
        while x < width:
            x1, y1 = x, y
            x2 = min(x + TILE_SIZE, width)
            y2 = min(y + TILE_SIZE, height)

            tile = image.crop((x1, y1, x2, y2))

            if tile.size != (TILE_SIZE, TILE_SIZE):
                padded = Image.new("RGB", (TILE_SIZE, TILE_SIZE), (0, 0, 0))
                padded.paste(tile, (0, 0))
                tile = padded

            tile_name = f"tile_r{row:03d}_c{col:03d}{ext}"
            out_path = os.path.join(out_folder, tile_name)
            tile.save(out_path)
            tiles.append((tile_name, out_path))

            col += 1
            if x + TILE_SIZE >= width:
                break
            x += step

        row += 1
        if y + TILE_SIZE >= height:
            break
        y += step

    logger.info(f"  {len(tiles)} tiles saved to '{out_folder}'")
    return tiles


def process_all():
    # match by stripping _pre_disaster / _post_disaster from filenames
    pre_images  = {
        f.replace("_pre_disaster", ""): f
        for f in os.listdir(PRE_DISASTER_DIR)
        if f.lower().endswith(VALID_EXTENSIONS)
    }
    post_images = {
        f.replace("_post_disaster", ""): f
        for f in os.listdir(POST_DISASTER_DIR)
        if f.lower().endswith(VALID_EXTENSIONS)
    }

    matched   = sorted(set(pre_images) & set(post_images))
    pre_only  = set(pre_images)  - set(post_images)
    post_only = set(post_images) - set(pre_images)

    if pre_only:
        logger.warning(f"No post-disaster match for: {pre_only}")
    if post_only:
        logger.warning(f"No pre-disaster match for: {post_only}")

    if not matched:
        logger.error("No matched pairs found — check filenames in both folders")
        return

    logger.info(f"\n{len(matched)} matched image pairs found")

    os.makedirs(CROPPED_PRE_DIR,  exist_ok=True)
    os.makedirs(CROPPED_POST_DIR, exist_ok=True)

    manifest_rows = []

    for base_name in matched:
        logger.info(f"\nProcessing pair: {base_name}")

        pre_path  = os.path.join(PRE_DISASTER_DIR,  pre_images[base_name])
        post_path = os.path.join(POST_DISASTER_DIR, post_images[base_name])

        pre_tiles  = process_image(pre_path,  CROPPED_PRE_DIR)
        post_tiles = process_image(post_path, CROPPED_POST_DIR)

        for (tile_name, pre_tile_path), (_, post_tile_path) in zip(pre_tiles, post_tiles):
            manifest_rows.append({
                "image_name":    base_name,
                "tile":          tile_name,
                "pre_disaster":  pre_tile_path,
                "post_disaster": post_tile_path,
            })

    with open(MANIFEST_FILE, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["image_name", "tile", "pre_disaster", "post_disaster"])
        writer.writeheader()
        writer.writerows(manifest_rows)

    logger.info(f"\nManifest saved to '{MANIFEST_FILE}' — {len(manifest_rows)} tile pairs total")


if __name__ == "__main__":
    process_all()
