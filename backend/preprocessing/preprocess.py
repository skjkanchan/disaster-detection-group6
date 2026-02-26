# preprocess.py
# Basic image preprocessing: load, resize, normalize

from PIL import Image
import numpy as np
import os
from pathlib import Path

TARGET_SIZE = (512, 512)

def load_image(path):
    """Load image and convert to RGB."""
    return Image.open(path).convert("RGB")

def resize_image(image, target_size=TARGET_SIZE):
    """Resize image to target dimensions."""
    return image.resize(target_size)

def normalize_image(image):
    """Normalize pixel values to 0-1 range."""
    image_array = np.array(image) / 255.0
    return image_array

def preprocess_image(image_path, target_size=TARGET_SIZE):
    """
    Basic preprocessing pipeline for a single image.
    
    Args:
        image_path: Path to the image file
        target_size: Tuple (width, height) for resizing
    
    Returns:
        Preprocessed image as numpy array
    """
    image = load_image(image_path)
    image = resize_image(image, target_size)
    image = normalize_image(image)
    return image

def get_matthew_images(image_dir):
    """
    Get all image files containing 'matthew' in the filename.
    
    Args:
        image_dir: Path to the directory containing images
    
    Returns:
        List of image file paths
    """
    image_dir = Path(image_dir)
    if not image_dir.exists():
        raise FileNotFoundError(f"Directory {image_dir} does not exist.")
    
    image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff'}
    matthew_images = [
        str(img_path) for img_path in image_dir.iterdir()
        if img_path.suffix.lower() in image_extensions and 'matthew' in img_path.name.lower()
    ]
    
    return sorted(matthew_images)

def preprocess_matthew_images(image_dir, output_dir=None, target_size=(512, 512)):
    """
    Preprocess all images containing 'matthew' from the directory.
    
    Args:
        image_dir: Path to the directory containing images
        output_dir: Optional path to save processed images as .npz
        target_size: Target size for images (default: 512x512)
    
    Returns:
        Dictionary with filenames and their preprocessed arrays
    """
    matthew_images = get_matthew_images(image_dir)
    
    if not matthew_images:
        raise ValueError(f"No images containing 'matthew' found in {image_dir}")
    
    processed_images = {}
    
    for img_path in matthew_images:
        try:
            image_array = preprocess_image(img_path, target_size)
            filename = os.path.basename(img_path)
            processed_images[filename] = image_array
            print(f"✓ {filename}")
            
        except Exception as e:
            print(f"✗ Error: {os.path.basename(img_path)} - {str(e)}")
    
    # Save if output directory specified
    if output_dir:
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        npz_file = output_path / 'matthew_preprocessed.npz'
        np.savez(npz_file, **processed_images)
        print(f"\n✓ Saved {len(processed_images)} images to {npz_file}")
    
    return processed_images