import os
import numpy as np
import pandas as pd
import rasterio
from rasterio.warp import reproject, Resampling
from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename
import joblib
import uuid
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

UPLOAD_FOLDER = 'uploaded_files'
MODEL_FOLDER = 'model'

OUTPUT_FOLDER = 'output'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'tif', 'tiff'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def resample_raster(input_path, ref_transform, ref_crs, ref_shape):
    with rasterio.open(input_path) as src:
        resampled_data = np.empty(ref_shape, dtype=src.dtypes[0])
        reproject(
            source=rasterio.band(src, 1),
            destination=resampled_data,
            src_transform=src.transform,
            src_crs=src.crs,
            dst_transform=ref_transform,
            dst_crs=ref_crs,
            resampling=Resampling.bilinear
        )
        return resampled_data

@app.route('/upload', methods=['POST'])
def upload_files():
    uploaded_files = request.files.getlist('files[]')
    selected_month = request.form.get("month")

    if not selected_month:
        return jsonify({'error': 'Month is required'}), 400

    # Check if the selected month is February or March
    if selected_month in ["February", "March"]:
        selected_month = "June"  # Use June model and reference for February and March

    model_filename = f"{selected_month}_RF_model_2014.pkl"
    REFERENCE_TIFF_PATH = f'reference/raster_{selected_month}.tif'
    model_path = os.path.join(MODEL_FOLDER, model_filename)

    if not os.path.exists(model_path):
        return jsonify({'error': f'Model for "{selected_month}" not found.'}), 400

    if len(uploaded_files) != 5:
        return jsonify({'error': 'Exactly 5 TIFF files must be uploaded.'}), 400

    saved_paths = []
    for file in uploaded_files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            saved_paths.append(filepath)

    # Load reference raster
    with rasterio.open(REFERENCE_TIFF_PATH) as ref_src:
        ref_transform = ref_src.transform
        ref_crs = ref_src.crs
        ref_shape = ref_src.shape
        ref_meta = ref_src.meta.copy()

    # Resample and flatten each raster
    resampled_data = {}
    param_names = ['Wave_Power', 'Bathymetry', 'Distance_to_Shore', 'Chlorophyll', 'Salinity']

    for i, path in enumerate(saved_paths):
        resampled = resample_raster(path, ref_transform, ref_crs, ref_shape)
        resampled_data[param_names[i]] = resampled.flatten()

    df = pd.DataFrame(resampled_data)

    # Load model and predict
    model = joblib.load(model_path)
    df['Predicted_Suitability'] = model.predict(df[param_names]).clip(1, 5).astype(np.int32)

    try:
        prediction_2d = df["Predicted_Suitability"].values.reshape(ref_shape)
    except ValueError as e:
        return jsonify({'error': f'Reshaping error: {str(e)}'}), 500

    ref_meta.update({
        'dtype': 'int32',
        'count': 1,
        'compress': 'lzw',
        'nodata': 0
    })

    output_file_name = f"output_prediction_{uuid.uuid4().hex}.tif"
    output_filepath = os.path.join(OUTPUT_FOLDER, output_file_name)

    with rasterio.open(output_filepath, 'w', **ref_meta) as dst:
        dst.write(prediction_2d, 1)

    return send_file(output_filepath, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)