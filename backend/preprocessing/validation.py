# Do both image paths exist?
# Can they be opened?
# Are they valid image files?
# Do dimensions match?
# Are they empty/corrupted?


# validation.py

import os
from PIL import Image

def validate_file_exists(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"{path} does not exist.")

def validate_image_readable(path):
    try:
        Image.open(path).verify()
    except Exception:
        raise ValueError(f"{path} is not a valid image.")

def validate_pair(before_path, after_path):
    validate_file_exists(before_path)
    validate_file_exists(after_path)
    validate_image_readable(before_path)
    validate_image_readable(after_path)