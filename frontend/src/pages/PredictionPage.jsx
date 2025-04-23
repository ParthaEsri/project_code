"use client";

import { useState } from "react";

function PredictionPage() {
  const [files, setFiles] = useState({
    wave: null,
    distance: null,
    salinity: null,
    bathymetry: null,
    chlorophyll: null,
  });

  const [month, setMonth] = useState("January");
  const [status, setStatus] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  const handleFileChange = (e, key) => {
    const file = e.target.files[0];
    if (file && !file.name.endsWith(".tif") && !file.name.endsWith(".tiff")) {
      alert("Only TIFF files are allowed.");
      return;
    }

    setFiles((prev) => ({
      ...prev,
      [key]: file,
    }));
  };

  const handleSubmit = async () => {
    const allSelected = Object.values(files).every((f) => f !== null);
    if (!allSelected) {
      alert("Please upload all 5 required TIFF files.");
      return;
    }

    const formData = new FormData();
    Object.entries(files).forEach(([key, file]) => {
      formData.append("files[]", file);
    });
    formData.append("month", month);

    setStatus("Uploading and processing...");
    try {
      const response = await fetch("http://localhost:3000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        setStatus("Error: " + errorData.error);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("Success! Download ready.");
    } catch (error) {
      setStatus("Server error: " + error.message);
    }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = "predicted_suitability.tif";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="prediction-page intro-page">
      <div className="container">
        <h1 className="page-title">Wave Energy Prediction</h1>

        <div className="card">
          <h2>Wave Energy Prediction Input</h2>

          <div className="month-dropdown">
            <label>Select Month:</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {[
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {["wave", "distance", "salinity", "bathymetry", "chlorophyll"].map(
            (key, index) => (
              <div key={index} className="file-input-group">
                <label>{`${index + 1}. ${
                  key.charAt(0).toUpperCase() + key.slice(1)
                }:`}</label>
                <div className="file-input-container">
                  <input
                    type="file"
                    accept=".tif,.tiff"
                    onChange={(e) => handleFileChange(e, key)}
                  />
                  {files[key] && <span className="file-check">✓</span>}
                </div>
              </div>
            )
          )}

          <div>
            <button onClick={handleSubmit} className="btn-primary">
              Process Files
            </button>

            {status && (
              <div
                className={`status-message ${
                  status.includes("Success") ? "status-success" : "status-error"
                }`}
              >
                {status}
              </div>
            )}

            {downloadUrl && (
              <button onClick={handleDownload} className="btn-download">
                Download Predicted TIFF
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PredictionPage;
