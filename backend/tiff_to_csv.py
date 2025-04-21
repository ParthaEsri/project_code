import rasterio
import numpy as np
import pandas as pd
from rasterio.warp import calculate_default_transform, reproject, Resampling

# Function to resample a raster to match a reference raster
def resample_raster(input_path, ref_transform, ref_crs, ref_shape):
    with rasterio.open(input_path) as src:
        transform, width, height = calculate_default_transform(
            src.crs, ref_crs, src.width, src.height, *src.bounds
        )

        # Check if the source raster has NoData
        nodata_value = src.nodata

        # Create an array with the correct shape
        resampled_data = np.empty(ref_shape, dtype=src.dtypes[0])

        # Reproject the raster
        reproject(
            source=rasterio.band(src, 1),
            destination=resampled_data,
            src_transform=src.transform,
            src_crs=src.crs,
            dst_transform=ref_transform,
            dst_crs=ref_crs,
            resampling=Resampling.bilinear  # Bilinear interpolation
        )

        # Handle NoData values by assigning NaN where appropriate
        if nodata_value is not None:
            resampled_data[resampled_data == nodata_value] = np.nan  # Or use ref_nodata if you want to match reference raster's NoData

        return resampled_data

# Function to convert multiple rasters to CSV
def rasters_to_csv(parameter_paths, reference_raster_path, output_csv_path):
    # Open the reference raster to get the transformation, CRS, and shape
    with rasterio.open(reference_raster_path) as ref_src:
        ref_transform = ref_src.transform
        ref_crs = ref_src.crs
        ref_shape = ref_src.shape  # (height, width)

    # Create a dictionary to store resampled data
    data = {}

    # Resample all rasters
    for param_name, param_path in parameter_paths.items():
        resampled_data = resample_raster(param_path, ref_transform, ref_crs, ref_shape)
        
        # Ensure consistent data type (e.g., np.float32)
        resampled_data = resampled_data.astype(np.float32)
        
        data[param_name] = resampled_data.flatten()

    # Convert the data dictionary to a DataFrame
    df = pd.DataFrame(data)

    # Save the DataFrame as CSV
    df.to_csv(output_csv_path, index=False)

    print(f"CSV saved at {output_csv_path}")

# Define the paths for the parameter rasters
parameter_paths = {
    "Wave_Power": "D:/project 2/Model prediction/Apr 2024/raster_wp_apr.tif",
    "Bathymetry": "D:/project 2/Model prediction/Apr 2024/raster_bathy.tif",
    "Distance_to_Shore": "D:/project 2/Model prediction/Apr 2024/dist_reclass.tif",
    "Chlorophyll": "D:/project 2/Model prediction/Apr 2024/raster_feb24.tif",
    "Salinity": "D:/project 2/Model prediction/Apr 2024/raster_sal_april24.tif"
}

# Define the reference raster (Wave Power) to match
reference_raster_path = parameter_paths["Wave_Power"]

# Define the output CSV path
output_csv_path = "D:/project 2/Model prediction/Apr 2024/rasters_data.csv"

# Call the function to convert the rasters to CSV
rasters_to_csv(parameter_paths, reference_raster_path, output_csv_path)
