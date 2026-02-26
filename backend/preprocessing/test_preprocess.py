# test_preprocess.py
# Simple test for basic preprocessing

from preprocess import preprocess_matthew_images
import os

if __name__ == "__main__":
    # TODO: Replace these paths with your local paths
    image_dir = os.getenv("IMAGE_DIR", r"path/to/your/images")
    output_dir = os.getenv("OUTPUT_DIR", r"path/to/preprocessed/output")
    
    # Or manually set paths here:
    # image_dir = r"C:\Users\YourUsername\path\to\images"
    # output_dir = r"C:\Users\YourUsername\path\to\output"
    
    try:
        print("Preprocessing matthew images...\n")
        
        processed = preprocess_matthew_images(
            image_dir=image_dir,
            output_dir=output_dir,
            target_size=(512, 512)
        )
        
        print(f"\nDone! Processed {len(processed)} images")
        print(f"Shape: {list(processed.values())[0].shape}")
        print(f"Data type: {list(processed.values())[0].dtype}")
        
    except Exception as e:
        print(f"Error: {e}")
