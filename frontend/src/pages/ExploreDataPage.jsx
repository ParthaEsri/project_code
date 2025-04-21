"use client";

import { useState, useEffect } from "react";

function ExploreDataPage() {
  const [primarySelection, setPrimarySelection] = useState("2014");

  const [secondarySelection, setSecondarySelection] = useState("");

  const [tertiarySelection, setTertiarySelection] = useState("");

  const [imageData, setImageData] = useState(null);

  const [hasData, setHasData] = useState(true);

  const primaryOptions = ["2014", "2024"];

  const secondaryOptions = ["Month"]; // Removed "Season"

  const tertiaryOptions = {
    Month: [
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
    ],

    // Removed "Season" options
  };

  useEffect(() => {
    setSecondarySelection("");

    setTertiarySelection("");

    setImageData(null);

    setHasData(true);
  }, [primarySelection]);

  useEffect(() => {
    setTertiarySelection("");

    setImageData(null);

    setHasData(true);
  }, [secondarySelection]);

  useEffect(() => {
    if (primarySelection && secondarySelection && tertiarySelection) {
      const fileName = `${primarySelection}_${tertiarySelection}_${secondarySelection}.png`;

      const imagePath = `/images/${fileName}`;

      setImageData({
        title: `${tertiarySelection} ${secondarySelection} suitable sites (${primarySelection})`,

        description: `Wave power potential data for ${tertiarySelection} ${secondarySelection} of ${primarySelection}`,

        imageSrc: imagePath,

        altText: `Wave power data visualization for ${tertiarySelection} ${secondarySelection} ${primarySelection}`,
      });

      setHasData(true);
    }
  }, [primarySelection, secondarySelection, tertiarySelection]);

  return (
    <div className="explore-page intro-page">
      <div className="container">
        <h1 className="page-title">Explore Suitable Sites</h1>

        <div className="filter-container">
          <div className="dropdown-group">
            <div className="dropdown-wrapper">
              <label htmlFor="primary-select">Year:</label>
              <select
                id="primary-select"
                value={primarySelection}
                onChange={(e) => setPrimarySelection(e.target.value)}
                className="dropdown"
              >
                <option value="">Select...</option>

                {primaryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="dropdown-wrapper">
              <label htmlFor="secondary-select">View By:</label>
              <select
                id="secondary-select"
                value={secondarySelection}
                onChange={(e) => setSecondarySelection(e.target.value)}
                className="dropdown"
                disabled={!primarySelection}
              >
                <option value="">Select...</option>

                {secondaryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="dropdown-wrapper">
              <label htmlFor="tertiary-select">Period:</label>
              <select
                id="tertiary-select"
                value={tertiarySelection}
                onChange={(e) => setTertiarySelection(e.target.value)}
                className="dropdown"
                disabled={!secondarySelection}
              >
                <option value="">Select...</option>

                {secondarySelection &&
                  tertiaryOptions[secondarySelection]?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {!hasData && (
          <div className="no-data-message white_BG">
            <h3>No Data Available</h3>
            <p>
              No wave power data available for the selected {secondarySelection}
              .
            </p>
          </div>
        )}

        {hasData && imageData && (
          <div className="image-display-card">
            <h2 className="image-title">{imageData.title}</h2>
            <div className="image-container">
              <img
                src={imageData.imageSrc}
                alt={imageData.altText}
                className="data-image"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg";

                  setHasData(false);
                }}
              />
            </div>
            <p className="image-description">{imageData.description}</p>
          </div>
        )}

        {!imageData && hasData && primarySelection && secondarySelection && (
          <div className="selection-prompt white_BG">
            <p>Please complete your selection to view wave power data.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExploreDataPage;
