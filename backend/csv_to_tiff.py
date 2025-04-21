import rasterio
import numpy as np
import pandas as pd
from rasterio.enums import Resampling

# File paths
csv_path = "D:/project 2/Model prediction/Apr 2024/predicted_suitability_apr_2024.csv"  # Path to CSV
reference_tiff = "D:/project 2/Model prediction/Apr 2024/raster_wp_apr.tif"  # Reference TIFF for metadata
output_tiff = "D:/project 2/Model prediction/Apr 2024/predicted_suitability_apr_2024.tif"  # Output TIFF

# Step 1: Read Predicted CSV
df = pd.read_csv(csv_path)

# Check for value range (Debugging)
print(f"Min: {df['Predicted_Suitability'].min()}, Max: {df['Predicted_Suitability'].max()}")

# Clip values to 1-5 range (assuming 1 to 5 are valid classes)
df["Predicted_Suitability"] = df["Predicted_Suitability"].clip(1, 5).astype(np.int32)

# Step 2: Open Reference TIFF for Shape and Metadata
with rasterio.open(reference_tiff) as ref_src:
    ref_meta = ref_src.meta.copy()  # Copy metadata
    ref_shape = ref_src.shape  # Get (rows, cols)
    ref_transform = ref_src.transform  # Get spatial transform
    ref_crs = ref_src.crs  # Get CRS
    ref_nodata = ref_src.nodata  # NoData value of reference TIFF

# Step 3: Convert Prediction to 2D Raster
try:
    predicted_suitability = df["Predicted_Suitability"].values.reshape(ref_shape)
except ValueError as e:
    print("Error in reshaping! Check CSV size matching with raster dimensions.")
    raise e

# Step 4: Apply Mask (if any NoData values in the reference raster)
masked_suitability = np.where(ref_nodata != ref_nodata, predicted_suitability, ref_nodata)

# Step 5: Save as New TIFF with Correct Settings
ref_meta.update({
    "dtype": "int32",  # Ensure correct data type
    "count": 1,  # Single-band raster
    "compress": "lzw",  # Apply compression (optional)
    "nodata": ref_nodata  # Define NoData value
})

# Write the final prediction raster as a TIFF
with rasterio.open(output_tiff, "w", **ref_meta) as dst:
    dst.write(masked_suitability, 1)  # Write data to band 1

print("Predicted suitability map saved successfully!")
