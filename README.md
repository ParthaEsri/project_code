# SchoolSite Locator — REST API Guide

> **Version:** 3.05 &nbsp;|&nbsp; **Platform:** ArcGIS Enterprise 11.5 &nbsp;|&nbsp; **Built by:** MGT Impact Solutions

---

This guide covers everything you need to call the SchoolSite Locator (SSL) API from scratch — what the endpoints do, exactly what to send, what you get back, and how to call it from a browser, Postman, cURL, and code. Real URLs and a real demo key are used throughout every example so you can run them immediately without changing anything.

---

## Table of Contents

1. [What this API does](#1-what-this-api-does)
2. [Base URL and demo credentials](#2-base-url-and-demo-credentials)
3. [How the API key system works](#3-how-the-api-key-system-works)
4. [Endpoint: locationQuery](#4-endpoint-locationquery)
   - [What it does](#what-it-does)
   - [Input parameters](#input-parameters)
   - [How the location JSON must look](#how-the-location-json-must-look)
   - [What comes back](#what-comes-back)
   - [Way 1 — ArcGIS REST Services Directory (browser, no tools)](#way-1--arcgis-rest-services-directory-browser-no-tools)
   - [Way 2 — cURL (terminal)](#way-2--curl-terminal)
   - [Way 3 — Postman](#way-3--postman-1)
   - [Way 4 — JavaScript in a web page](#way-4--javascript-in-a-web-page)
   - [Way 5 — Python automation script](#way-5--python-automation-script)
   - [Way 6 — Newman CLI (CI/CD pipeline)](#way-6--newman-cli-cicd-pipeline)
5. [Endpoint: addressQuery](#5-endpoint-addressquery)
   - [What it does](#what-it-does-1)
   - [Input parameters](#input-parameters-1)
   - [The geocoding chain explained](#the-geocoding-chain-explained)
   - [What comes back](#what-comes-back-1)
   - [Handling the ambiguous address response](#handling-the-ambiguous-address-response)
   - [Way 1 — ArcGIS REST Services Directory (browser)](#way-1--arcgis-rest-services-directory-browser)
   - [Way 2 — cURL (terminal)](#way-2--curl-terminal-1)
   - [Way 3 — Postman](#way-3--postman-2)
   - [Way 4 — JavaScript fetch](#way-4--javascript-fetch)
   - [Way 5 — Python batch script](#way-5--python-batch-script)
   - [Way 6 — Newman CLI](#way-6--newman-cli)
6. [Endpoint: properties (health check)](#6-endpoint-properties-health-check)
7. [Full Postman collection setup](#7-full-postman-collection-setup)
8. [Understanding the response structure](#8-understanding-the-response-structure)
9. [Common errors and what they mean](#9-common-errors-and-what-they-mean)
10. [Quick reference card](#10-quick-reference-card)

---

## 1. What this API does

The SSL API is a server-side extension (SOE) attached to an ArcGIS MapServer. You give it a location — either as GPS coordinates or a street address — and it tells you which schools serve that location. It does this by checking which attendance boundary polygon the location falls inside, then returning the school details for every school assigned to that boundary.

The API supports multiple school districts in one deployment. Each district is a separate group layer inside the map service. You tell the API which district to query by passing its name as the `districtID` parameter.

A single request can return up to four things:

- **schoolResults** — the schools assigned to that location (elementary, middle, high, and intermediate  schools)
- **geocodeResults** — the geocode match details (only when you send an address)
- **walkZoneResults** — walk zone data if your district has that layer configured
- **trusteeResults** — elected trustee information if your district has that layer configured

The last two are optional. If those layers are not in the map service, you still get a valid response — those keys just come back as empty objects.

---

## 2. Base URL and demo credentials


| Item | Value |
|------|-------|
| **Base URL** | `https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API` |
| **API Key** | `c17b5e11-172a-4e81-a79c-5af64f7f0e0b` |
| **District ID** | `demo` |
| **Geocoder URL** | `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates` |

**Note:** The demo key is scoped to the `demo` district only. If you pass a different `districtID` with this key, the request will be rejected.

---

## 3. How the API key system works

Before the API runs any GIS query, it validates your key. Here is the exact order it checks things:

```
1. Is the supplied key equal to the masterKey?
    1. YES - accepted immediately (bypasses all other checks)
    2. NO  - continue

2. Does a key entry exist where districtCode matches districtID AND key matches apiKey?
    1. NO  - rejected (logged as "Invalid key attempt")
    2. YES - continue

3. Is isActive = true on that entry?
    1. NO  - rejected (logged as "Inactive key")
    2. YES - continue

4. Does the entry have an expiresAt date, and has that date passed?
    1. YES - rejected (logged as "Expired key")
    2. NO  - ACCEPTED 

```

The key file lives at `{arcgis_directories}/ssl_api/ssl_apikeys.json` on the server[arcgisserver folder]. It is read once at startup and cached in memory, so if an admin updates the file, the SOE must be restarted for changes to take effect.

---

## 4. Endpoint: locationQuery

### What it does

This endpoint is for when you already have a coordinate — for example a user clicked a spot on a map, or you have GPS coordinates from a mobile device. You pass the longitude and latitude, and the API finds which attendance boundary polygon contains that point, then returns all assigned schools.

No geocoding happens here. It is the fastest of the two lookup endpoints.

### Input parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `apiKey` | ✅ Yes | string | Your API key |
| `districtID` | ✅ Yes | string | The district group layer name in the map service. Case-insensitive. |
| `location` | ✅ Yes | JSON string | An Esri point JSON object. See the format below. |
| `f` | ✅ Yes | string | Always send `json` |

### How the location JSON must look

The `location` parameter is a JSON object, not just a pair of numbers. It must follow the Esri point format and include a spatial reference. WGS84 (WKID 4326) is the standard — this is the same coordinate system used by Google Maps and GPS devices.

```json
{"x" : -9769758.268976063, "y" : 3596849.281245475,"spatialReference" : {"wkid" : 102100}}
```

`x` is **longitude** (east/west). `y` is **latitude** (north/south). This is the opposite of how most people think about it ("lat/long"), so pay attention to this. If you send them in the wrong order, your point will land somewhere in the ocean.

When you pass this in a form POST or URL, the entire object must be serialized to a string first:

```
location={"x" : -9769758.268976063, "y" : 3596849.281245475,"spatialReference" : {"wkid" : 102100}}
```

### What comes back

A successful response looks like this. The exact fields inside each school record depend on what fields your district has in their Schools layer — the example below shows typical fields.

```json
{
  "geocodeResults": {},
  "schoolResults": {
    "1042": [
      {
        "OBJECTID": "1042",
        "SCHL_CODE": "1042",
        "SCHOOL_NAME": "Lincoln Elementary School",
        "ADDRESS": "400 N Adams Street",
        "CITY": "Springfield",
        "STATE": "OR",
        "ZIP": "97401",
        "PHONE": "541-555-0110",
        "GRADES": "K-5",
        "PRINCIPAL": "Sarah Mitchell",
        "geometry": {
          "x": -118.2301,
          "y": 34.0487,
          "spatialReference": {
            "wkid": 4326
          }
        }
      }
    ],
    "2017": [
      {
        "SCHL_CODE": "2017",
        "SCHOOL_NAME": "Jefferson Middle School",
        "GRADES": "6-8",
        "geometry": { "x": -118.2415, "y": 34.0531 }
      }
    ],
    "3005": [
      {
        "SCHL_CODE": "3005",
        "SCHOOL_NAME": "Springfield High School",
        "GRADES": "9-12",
        "geometry": { "x": -118.2388, "y": 34.0562 }
      }
    ]
  },
  "walkZoneResults": {
    "5": {
      "WZ_CODE": "WZ-04",
      "DESCRIPTION": "Within 1 mile walking distance"
    }
  },
  "trusteeResults": {
    "TRUSTEE": "4",
    "TRUSTEE_NAME": "Jane Doe",
    "AREA": "Area 4 - Northside"
  }
}
```

`geocodeResults` is always empty for `locationQuery` because no geocoding happened. That key is only populated when you use `addressQuery`.

---

### Way 1 — ArcGIS REST Services Directory (browser, no tools)

This is the easiest way to test the API — no Postman, no terminal, nothing to install. Every ArcGIS SOE automatically gets a built-in web form you can access from any browser.

**Step 1.** Open this URL in your browser:

```
https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API
```

You will see the API root page listing the available operations.

**Step 2.** Click **locationQuery** in the Supported Operations list.

**Step 3.** You will see a web form with fields for each parameter. Fill them in:

- **apiKey:** `c17b5e11-172a-4e81-a79c-5af64f7f0e0b`
- **districtID:** `demo`
- **location:** `{"x":-118.2437,"y":34.0522,"spatialReference":{"wkid":4326}}`
- **f:** `json` (select from dropdown)

**Step 4.** Click **locationQuery (GET)** or **locationQuery (POST)**. The response JSON appears on the next page.

This method is great for quick checks and for GIS administrators who are not developers. No code required.

---

### Way 2 — cURL (terminal)

cURL is the most direct way to call an API from the command line. Works on Mac, Linux, and Windows (Git Bash or WSL).

**Basic call — copy and paste directly into your terminal:**

```bash
curl -X POST \
  "https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API/locationQuery" \
  --data-urlencode "apiKey=c17b5e11-172a-4e81-a79c-5af64f7f0e0b" \
  --data-urlencode "districtID=demo" \
  --data-urlencode 'location={"x" : -9769758.268976063, "y" : 3596849.281245475,"spatialReference" : {"wkid" : 102100}}' \
  --data-urlencode "f=json"
```

**Same call but saving the output to a file:**

```bash
curl -X POST \
  "https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API/locationQuery" \
  --data-urlencode "apiKey=c17b5e11-172a-4e81-a79c-5af64f7f0e0b" \
  --data-urlencode "districtID=demo" \
  --data-urlencode 'location={"x" : -9769758.268976063, "y" : 3596849.281245475,"spatialReference" : {"wkid" : 102100}}' \
  --data-urlencode "f=json" \
  -o school_result.json
```

**Pretty-print the JSON output (requires Python):**

```bash
curl -s -X POST \
  "https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API/locationQuery" \
  --data-urlencode "apiKey=c17b5e11-172a-4e81-a79c-5af64f7f0e0b" \
  --data-urlencode "districtID=demo" \
  --data-urlencode 'location={"x":-118.2437,"y":34.0522,"spatialReference":{"wkid":4326}}' \
  --data-urlencode "f=json" \
  | python3 -m json.tool
```

**On Windows (Command Prompt — note the different quoting):**

```cmd
curl -X POST ^
  "https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API/locationQuery" ^
  --data-urlencode "apiKey=c17b5e11-172a-4e81-a79c-5af64f7f0e0b" ^
  --data-urlencode "districtID=demo" ^
  --data-urlencode "location={\"x\":-118.2437,\"y\":34.0522,\"spatialReference\":{\"wkid\":4326}}" ^
  --data-urlencode "f=json"
```

---

### Way 3 — Postman

Postman is a GUI tool that lets you build, save, and share API requests without writing code. The full collection setup is in [Section 7](#7-full-postman-collection-setup). Here is the quick setup for just this request.

**Step 1.** Create a new request in Postman. Set the method to **POST**.

**Step 2.** Enter the URL:
```
https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API/locationQuery
```

**Step 3.** Go to the **Body** tab. Select **x-www-form-urlencoded**. Add these four rows:

| KEY | VALUE |
|-----|-------|
| `apiKey` | `c17b5e11-172a-4e81-a79c-5af64f7f0e0b` |
| `districtID` | `demo` |
| `location` | `{"x":-118.2437,"y":34.0522,"spatialReference":{"wkid":4326}}` |
| `f` | `json` |

**Step 4.** Click **Send**. The response appears in the lower panel.

**Adding a test script (optional but recommended):**

Go to the **Tests** tab and paste this. It runs automatically after every request and flags problems:

```javascript
pm.test("Request succeeded", () => pm.response.to.have.status(200));
pm.test("Response is valid JSON", () => pm.response.to.be.json);

const body = pm.response.json();

pm.test("schoolResults exists", () => {
  pm.expect(body).to.have.property("schoolResults");
});

pm.test("At least one school returned", () => {
  pm.expect(Object.keys(body.schoolResults).length).to.be.above(0);
});

pm.test("Schools have geometry", () => {
  Object.values(body.schoolResults).forEach(arr => {
    arr.forEach(school => pm.expect(school).to.have.property("geometry"));
  });
});

// Store school count for chaining
pm.environment.set("lastSchoolCount", Object.keys(body.schoolResults).length);
console.log("Schools found:", Object.keys(body.schoolResults).length);
```

---

### Way 4 — JavaScript in a web page

This is how you would call the API from a school district website or a parent portal. The function below is ready to drop into any web application.

```javascript
// ─── Configuration ────────────────────────────────────────────────────────────
const SSL_CONFIG = {
  baseUrl:    "https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API",
  apiKey:     "c17b5e11-172a-4e81-a79c-5af64f7f0e0b",
  districtID: "demo"
};

// ─── Main function ─────────────────────────────────────────────────────────────
async function findSchoolsByCoordinates(longitude, latitude) {
  const location = JSON.stringify({
    x: longitude,
    y: latitude,
    spatialReference: { wkid: 4326 }
  });

  const params = new URLSearchParams({
    apiKey:     SSL_CONFIG.apiKey,
    districtID: SSL_CONFIG.districtID,
    location:   location,
    f:          "json"
  });

  try {
    const response = await fetch(`${SSL_CONFIG.baseUrl}/locationQuery`, {
      method: "POST",
      body:   params
    });

    if (!response.ok) {
      throw new Error(`HTTP error — status: ${response.status}`);
    }

    const data = await response.json();

    // Check for an error object in the response body
    if (data.error) {
      throw new Error(`API error ${data.error.code}: ${data.error.message}`);
    }

    return data;

  } catch (err) {
    console.error("School lookup failed:", err.message);
    throw err;
  }
}

// ─── Usage example ─────────────────────────────────────────────────────────────
findSchoolsByCoordinates(-118.2437, 34.0522)
  .then(result => {
    console.log("=== Schools for this location ===");

    for (const [code, schoolArray] of Object.entries(result.schoolResults)) {
      const s = schoolArray[0];
      console.log(`\n[${code}] ${s.SCHOOL_NAME}`);
      console.log(`  Grades  : ${s.GRADES}`);
      console.log(`  Address : ${s.ADDRESS}, ${s.CITY}`);
      console.log(`  Phone   : ${s.PHONE}`);
      if (s.geometry) {
        console.log(`  Map pin : [${s.geometry.x}, ${s.geometry.y}]`);
      }
    }

    if (Object.keys(result.walkZoneResults).length > 0) {
      console.log("\n=== Walk Zone ===");
      console.log(result.walkZoneResults);
    }

    if (result.trusteeResults && result.trusteeResults.TRUSTEE_NAME) {
      console.log("\n=== Trustee ===");
      console.log(result.trusteeResults.TRUSTEE_NAME);
    }
  })
  .catch(err => {
    // Show a user-friendly message in your UI here
    console.error("Could not retrieve school information:", err.message);
  });
```

**Using the result to populate a page element:**

```javascript
findSchoolsByCoordinates(-118.2437, 34.0522).then(result => {
  const container = document.getElementById("school-results");
  container.innerHTML = "";

  for (const [code, schoolArray] of Object.entries(result.schoolResults)) {
    const s = schoolArray[0];
    const card = document.createElement("div");
    card.className = "school-card";
    card.innerHTML = `
      <h3>${s.SCHOOL_NAME}</h3>
      <p>Grades: ${s.GRADES}</p>
      <p>${s.ADDRESS}, ${s.CITY} ${s.ZIP}</p>
      <p>📞 ${s.PHONE}</p>
    `;
    container.appendChild(card);
  }
});
```

---

### Way 5 — Python automation script

Use this when you need to look up schools for a list of coordinates — for example processing a CSV of student addresses that have already been geocoded, or running nightly boundary checks.

```python
import requests
import json
import csv

# ─── Configuration ────────────────────────────────────────────────────────────
BASE_URL    = "https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API"
API_KEY     = "c17b5e11-172a-4e81-a79c-5af64f7f0e0b"
DISTRICT_ID = "demo"

# ─── Single lookup function ───────────────────────────────────────────────────
def find_schools_by_coordinates(longitude: float, latitude: float) -> dict:
    """
    Look up assigned schools for a given longitude/latitude point.

    Parameters
    ----------
    longitude : float
        X coordinate in WGS84 (e.g. -118.2437)
    latitude : float
        Y coordinate in WGS84 (e.g. 34.0522)

    Returns
    -------
    dict
        Full API response with schoolResults, walkZoneResults, trusteeResults
    """
    location_json = json.dumps({
        "x": longitude,
        "y": latitude,
        "spatialReference": {"wkid": 4326}
    })

    payload = {
        "apiKey":     API_KEY,
        "districtID": DISTRICT_ID,
        "location":   location_json,
        "f":          "json"
    }

    response = requests.post(
        f"{BASE_URL}/locationQuery",
        data=payload,
        timeout=15
    )
    response.raise_for_status()

    data = response.json()

    if "error" in data:
        raise ValueError(f"API error {data['error']['code']}: {data['error']['message']}")

    return data


# ─── Print results helper ─────────────────────────────────────────────────────
def print_school_results(data: dict):
    schools = data.get("schoolResults", {})
    if not schools:
        print("  No schools found for this location.")
        return

    for code, school_list in schools.items():
        s = school_list[0]
        print(f"  [{code}] {s.get('SCHOOL_NAME', 'Unknown')}")
        print(f"         Grades  : {s.get('GRADES', 'N/A')}")
        print(f"         Address : {s.get('ADDRESS', '')}, {s.get('CITY', '')}")


# ─── Single lookup ────────────────────────────────────────────────────────────
print("Looking up schools for a single coordinate...")
result = find_schools_by_coordinates(-118.2437, 34.0522)
print_school_results(result)


# ─── Batch lookup from a CSV file ─────────────────────────────────────────────
# Input CSV format:  student_id, longitude, latitude
# Output CSV format: student_id, elementary, middle, high

def batch_lookup(input_csv: str, output_csv: str):
    """Process a list of coordinates and write school assignments to a new CSV."""
    results = []

    with open(input_csv, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            student_id = row["student_id"]
            lng = float(row["longitude"])
            lat = float(row["latitude"])

            print(f"Processing student {student_id}...")

            try:
                data = find_schools_by_coordinates(lng, lat)
                schools = data.get("schoolResults", {})

                # Separate out by grade level using the GRADES field
                elementary = middle = high = ""
                for code, school_list in schools.items():
                    s = school_list[0]
                    grades = s.get("GRADES", "")
                    name   = s.get("SCHOOL_NAME", code)
                    if "K" in grades or "1" in grades:
                        elementary = name
                    elif "6" in grades or "7" in grades:
                        middle = name
                    elif "9" in grades or "10" in grades:
                        high = name

                results.append({
                    "student_id":  student_id,
                    "elementary":  elementary,
                    "middle":      middle,
                    "high":        high,
                    "error":       ""
                })

            except Exception as e:
                results.append({
                    "student_id":  student_id,
                    "elementary":  "",
                    "middle":      "",
                    "high":        "",
                    "error":       str(e)
                })

    with open(output_csv, "w", newline="") as f:
        fieldnames = ["student_id", "elementary", "middle", "high", "error"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    print(f"\nDone. Results written to {output_csv}")


# Uncomment to run batch mode:
# batch_lookup("students.csv", "school_assignments.csv")
```

---

### Way 6 — Newman CLI (CI/CD pipeline)

Newman is Postman's command-line runner. You export your Postman collection to a JSON file and run it automatically in a CI/CD pipeline (GitHub Actions, Jenkins, etc.) to verify the API is still working after every deployment.

**Step 1 — Install Newman:**

```bash
npm install -g newman
```

**Step 2 — Save this as `ssl_api_tests.json`:**

```json
{
  "info": {
    "name": "SSL API — locationQuery smoke test",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "locationQuery — demo district",
      "request": {
        "method": "POST",
        "url": "https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API/locationQuery",
        "body": {
          "mode": "urlencoded",
          "urlencoded": [
            { "key": "apiKey",     "value": "c17b5e11-172a-4e81-a79c-5af64f7f0e0b" },
            { "key": "districtID", "value": "demo" },
            { "key": "location",   "value": "{\"x\":-118.2437,\"y\":34.0522,\"spatialReference\":{\"wkid\":4326}}" },
            { "key": "f",          "value": "json" }
          ]
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "exec": [
              "pm.test('Status 200', () => pm.response.to.have.status(200));",
              "pm.test('Has schoolResults', () => {",
              "  const body = pm.response.json();",
              "  pm.expect(body).to.have.property('schoolResults');",
              "  pm.expect(Object.keys(body.schoolResults).length).to.be.above(0);",
              "});"
            ]
          }
        }
      ]
    }
  ]
}
```

**Step 3 — Run it:**

```bash
newman run ssl_api_tests.json
```

**Step 4 — Use in a GitHub Actions workflow:**

```yaml
name: SSL API Health Check

on:
  push:
    branches: [main]
  schedule:
    - cron: "0 8 * * 1-5"   # weekdays at 8am

jobs:
  api-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Newman
        run: npm install -g newman

      - name: Run SSL API tests
        run: newman run ssl_api_tests.json --reporters cli,junit --reporter-junit-export results.xml

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: newman-results
          path: results.xml
```

---

## 5. Endpoint: addressQuery

### What it does

This endpoint accepts a plain-text street address. The server converts it to coordinates (geocoding), then performs the same spatial lookup as `locationQuery`. Use this when a user types their home address into a form — you do not need to geocode it yourself first.

The geocoding happens in two stages internally. First, the server tries the district's own ArcGIS geocoder (you pass that URL as a parameter). If nothing comes back with a high enough confidence score, it automatically falls back to the Esri World Geocoder. You do not need to handle this fallback yourself.

### Input parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `apiKey` | ✅ Yes | string | Your API key |
| `districtID` | ✅ Yes | string | The district group layer name. Case-insensitive. |
| `address` | ✅ Yes | string | Full street address. Include city and state for best accuracy. |
| `restGeocodeService` | ✅ Yes | string | Full URL to the district's internal ArcGIS geocoder `findAddressCandidates` endpoint. The API tries this first before falling back to Esri World. |
| `f` | ✅ Yes | string | Always send `json` |

### The geocoding chain explained

When you call `addressQuery`, here is exactly what happens inside the server before any GIS query runs:

```
Your address string
        │
        ▼
┌────────────────────────────────────┐
│  Step 1: Try internal geocoder     │
│  (restGeocodeService parameter)    │
│  Threshold: score must be >= 80    │
└────────────────────────────────────┘
        │
  Score >= 80?
  ├─ YES ──────────────────────────────────────────────► Point found
  │                                                           │
  └─ NO                                                       │
        │                                                     │
        ▼                                                     │
┌────────────────────────────────────┐                       │
│  Step 2: Try Esri World Geocoder   │                       │
│  Threshold: score must be >= 85    │                       │
└────────────────────────────────────┘                       │
        │                                                     │
  Score >= 85?                                                │
  ├─ YES ──────────────────────────────────────────────► Point found
  │                                                           │
  └─ NO ─────────────────────────────────────────────► null (error returned)
                                                             │
                                                             ▼
                                               Ambiguity check runs on winner:
                                               Are top 2 scores within 5 points?
                                               ├─ YES → AMBIGUOUS_ADDRESS response
                                               └─ NO  → proceed to spatial query
```

The score thresholds differ between the two geocoders because the Esri World Geocoder has broader coverage and a slightly stricter threshold helps prevent false matches when querying outside the district's local area.

### What comes back

For a successful address lookup, the response is the same structure as `locationQuery` but `geocodeResults` is now populated:

```json
{
  "geocodeResults": {
    "matchedAddress": "742 Evergreen Terrace, Springfield, OR, 97401",
    "score": 94.72
  },
  "schoolResults": {
    "1042": [
      {
        "SCHL_CODE": "1042",
        "SCHOOL_NAME": "Lincoln Elementary School",
        "ADDRESS": "400 N Adams Street",
        "CITY": "Springfield",
        "GRADES": "K-5",
        "PHONE": "541-555-0110",
        "geometry": {
          "x": -118.2301,
          "y": 34.0487,
          "spatialReference": { "wkid": 4326 }
        }
      }
    ],
    "2017": [
      {
        "SCHL_CODE": "2017",
        "SCHOOL_NAME": "Jefferson Middle School",
        "GRADES": "6-8",
        "geometry": { "x": -118.2415, "y": 34.0531 }
      }
    ]
  },
  "walkZoneResults": {},
  "trusteeResults": {
    "TRUSTEE": "2",
    "TRUSTEE_NAME": "Robert Chen"
  }
}
```

Always check `geocodeResults.score` in your application. A score of 94 means a very confident match. A score just at the threshold (80–85) means the address was borderline — you might want to show the `matchedAddress` to the user so they can confirm it is the right location.

### Handling the ambiguous address response

When two geocode candidates score within 5 points of each other, the API does not guess. Instead it returns this structure — note it does **not** contain `schoolResults`:

```json
{
  "status": "AMBIGUOUS_ADDRESS",
  "message": "Multiple matching addresses found. Please be more specific.",
  "suggestedAddresses": [
    { "address": "742 Evergreen Terrace, Springfield, OR 97401" },
    { "address": "742 Evergreen Terrace, Springfield, MO 65802" }
  ]
}
```

Your application needs to detect this and show the suggestions to the user. Do not retry with the same address — ask the user to pick one of the suggestions or add more detail (city, state, ZIP code).

---

### Way 1 — ArcGIS REST Services Directory (browser)

**Step 1.** Navigate to:

```
https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API
```

**Step 2.** Click **addressQuery** in the operations list.

**Step 3.** Fill in the form:

- **apiKey:** `c17b5e11-172a-4e81-a79c-5af64f7f0e0b`
- **districtID:** `demo`
- **address:** `1600 Pennsylvania Ave NW, Washington, DC 20500`
- **restGeocodeService:** `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates`
- **f:** `json`

**Step 4.** Click **addressQuery (POST)**. Read the response on the next page.

---

### Way 2 — cURL (terminal)

```bash
curl -X POST \
  "https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API/addressQuery" \
  --data-urlencode "apiKey=c17b5e11-172a-4e81-a79c-5af64f7f0e0b" \
  --data-urlencode "districtID=demo" \
  --data-urlencode "address=742 Evergreen Terrace Springfield OR 97401" \
  --data-urlencode "restGeocodeService=https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates" \
  --data-urlencode "f=json"
```

**Pretty-printed output:**

```bash
curl -s -X POST \
  "https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API/addressQuery" \
  --data-urlencode "apiKey=c17b5e11-172a-4e81-a79c-5af64f7f0e0b" \
  --data-urlencode "districtID=demo" \
  --data-urlencode "address=742 Evergreen Terrace Springfield OR 97401" \
  --data-urlencode "restGeocodeService=https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates" \
  --data-urlencode "f=json" \
  | python3 -m json.tool
```

**Tip — URL encode the geocoder URL if your terminal complains about the `&` characters:**

```bash
GEOCODER="https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates"
ADDRESS="742 Evergreen Terrace Springfield OR 97401"

curl -X POST \
  "https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API/addressQuery" \
  --data-urlencode "apiKey=c17b5e11-172a-4e81-a79c-5af64f7f0e0b" \
  --data-urlencode "districtID=demo" \
  --data-urlencode "address=$ADDRESS" \
  --data-urlencode "restGeocodeService=$GEOCODER" \
  --data-urlencode "f=json"
```

---

### Way 3 — Postman

**Step 1.** Create a new POST request. URL:

```
https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API/addressQuery
```

**Step 2.** Body tab → **x-www-form-urlencoded**:

| KEY | VALUE |
|-----|-------|
| `apiKey` | `c17b5e11-172a-4e81-a79c-5af64f7f0e0b` |
| `districtID` | `demo` |
| `address` | `742 Evergreen Terrace Springfield OR 97401` |
| `restGeocodeService` | `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates` |
| `f` | `json` |

**Step 3.** Tests tab — paste this script to handle both normal results and the ambiguous address case:

```javascript
pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Valid JSON", () => pm.response.to.be.json);

const body = pm.response.json();

if (body.status === "AMBIGUOUS_ADDRESS") {
  // This is not a failure — it is expected behaviour when the address is vague
  pm.test("Ambiguous — suggestions returned", () => {
    pm.expect(body.suggestedAddresses).to.be.an("array");
    pm.expect(body.suggestedAddresses.length).to.be.above(0);
  });
  console.log("Address is ambiguous. Suggestions:");
  body.suggestedAddresses.forEach((s, i) => console.log(`  ${i + 1}. ${s.address}`));

} else {
  pm.test("Has schoolResults", () => pm.expect(body).to.have.property("schoolResults"));
  pm.test("Has geocodeResults", () => pm.expect(body).to.have.property("geocodeResults"));
  pm.test("Geocode score is reasonable", () => {
    pm.expect(body.geocodeResults.score).to.be.above(80);
  });
  pm.test("At least one school returned", () => {
    pm.expect(Object.keys(body.schoolResults).length).to.be.above(0);
  });

  // Log the match for easy reading in the Postman console
  console.log("Matched address:", body.geocodeResults.matchedAddress);
  console.log("Geocode score:", body.geocodeResults.score);
  console.log("Schools found:", Object.keys(body.schoolResults).length);

  // Save matched address as variable for use in subsequent requests
  pm.environment.set("lastMatchedAddress", body.geocodeResults.matchedAddress);
}
```

---

### Way 4 — JavaScript fetch

```javascript
// ─── Configuration ────────────────────────────────────────────────────────────
const SSL_CONFIG = {
  baseUrl:    "https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API",
  apiKey:     "c17b5e11-172a-4e81-a79c-5af64f7f0e0b",
  districtID: "demo",
  geocoderUrl:"https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates"
};

// ─── Main function ─────────────────────────────────────────────────────────────
async function findSchoolsByAddress(address) {
  const params = new URLSearchParams({
    apiKey:             SSL_CONFIG.apiKey,
    districtID:         SSL_CONFIG.districtID,
    address:            address,
    restGeocodeService: SSL_CONFIG.geocoderUrl,
    f:                  "json"
  });

  const response = await fetch(`${SSL_CONFIG.baseUrl}/addressQuery`, {
    method: "POST",
    body:   params
  });

  if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
  return response.json();
}

// ─── Usage with ambiguity handling ────────────────────────────────────────────
async function handleSchoolLookup(addressInput) {
  try {
    const data = await findSchoolsByAddress(addressInput);

    // Case 1: Ambiguous address — ask user to choose
    if (data.status === "AMBIGUOUS_ADDRESS") {
      console.log("We found more than one address matching what you typed.");
      console.log("Please pick the correct one:");
      data.suggestedAddresses.forEach((item, i) => {
        console.log(`  Option ${i + 1}: ${item.address}`);
      });

      // In a real app, show these options in a dropdown and recall
      // handleSchoolLookup() with the chosen address
      return;
    }

    // Case 2: Successful match
    const geo = data.geocodeResults;
    console.log(`Matched address: ${geo.matchedAddress}  (confidence: ${geo.score.toFixed(1)}%)`);

    console.log("\nYour assigned schools:");
    for (const [code, schoolArray] of Object.entries(data.schoolResults)) {
      const s = schoolArray[0];
      console.log(`\n  ${s.SCHOOL_NAME}  (${s.GRADES})`);
      console.log(`  ${s.ADDRESS}, ${s.CITY} ${s.ZIP || ""}`);
      console.log(`  Phone: ${s.PHONE || "N/A"}`);
    }

  } catch (err) {
    console.error("Lookup failed:", err.message);
  }
}

// Run it
handleSchoolLookup("742 Evergreen Terrace Springfield OR 97401");
```

---

### Way 5 — Python batch script

Use this when you have a list of addresses (from a spreadsheet, database, or enrollment form export) and need to process them all at once.

```python
import requests
import json
import csv
import time

# ─── Configuration ────────────────────────────────────────────────────────────
BASE_URL     = "https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API"
API_KEY      = "c17b5e11-172a-4e81-a79c-5af64f7f0e0b"
DISTRICT_ID  = "demo"
GEOCODER_URL = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates"

# ─── Single address lookup ────────────────────────────────────────────────────
def find_schools_by_address(address: str) -> dict:
    """
    Look up assigned schools for a street address.

    Parameters
    ----------
    address : str
        Full street address including city, state, and ZIP for best accuracy.
        Example: "742 Evergreen Terrace, Springfield, OR 97401"

    Returns
    -------
    dict
        API response. Check for 'status' == 'AMBIGUOUS_ADDRESS' before
        reading 'schoolResults'.
    """
    payload = {
        "apiKey":             API_KEY,
        "districtID":         DISTRICT_ID,
        "address":            address,
        "restGeocodeService": GEOCODER_URL,
        "f":                  "json"
    }

    response = requests.post(
        f"{BASE_URL}/addressQuery",
        data=payload,
        timeout=20
    )
    response.raise_for_status()
    return response.json()


# ─── Print one result ─────────────────────────────────────────────────────────
def print_result(address: str, data: dict):
    print(f"\nAddress: {address}")

    if data.get("status") == "AMBIGUOUS_ADDRESS":
        print("  ⚠ Ambiguous — did you mean:")
        for suggestion in data.get("suggestedAddresses", []):
            print(f"    → {suggestion.get('address', suggestion)}")
        return

    geo = data.get("geocodeResults", {})
    print(f"  Matched : {geo.get('matchedAddress', 'N/A')}")
    print(f"  Score   : {geo.get('score', 'N/A')}")

    schools = data.get("schoolResults", {})
    if not schools:
        print("  No schools found — location may be outside the district.")
        return

    for code, school_list in schools.items():
        s = school_list[0]
        print(f"  [{code}] {s.get('SCHOOL_NAME', 'N/A')}  ({s.get('GRADES', 'N/A')})")


# ─── Batch mode ───────────────────────────────────────────────────────────────
# Input CSV must have a column named "address"
# Output CSV adds: matched_address, score, schools (pipe-separated names), error

def batch_lookup_addresses(input_csv: str, output_csv: str):
    rows_out = []

    with open(input_csv, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            address = row.get("address", "").strip()
            if not address:
                continue

            print(f"Processing: {address}")

            try:
                data = find_schools_by_address(address)

                if data.get("status") == "AMBIGUOUS_ADDRESS":
                    suggestions = " | ".join(
                        s.get("address", "") for s in data.get("suggestedAddresses", [])
                    )
                    rows_out.append({**row,
                        "matched_address": "",
                        "score": "",
                        "schools": "",
                        "error": f"AMBIGUOUS: {suggestions}"
                    })
                else:
                    geo = data.get("geocodeResults", {})
                    school_names = " | ".join(
                        sl[0].get("SCHOOL_NAME", code)
                        for code, sl in data.get("schoolResults", {}).items()
                    )
                    rows_out.append({**row,
                        "matched_address": geo.get("matchedAddress", ""),
                        "score":           geo.get("score", ""),
                        "schools":         school_names,
                        "error":           ""
                    })

            except Exception as e:
                rows_out.append({**row,
                    "matched_address": "",
                    "score":           "",
                    "schools":         "",
                    "error":           str(e)
                })

            time.sleep(0.3)   # be polite — don't hammer the server

    if rows_out:
        with open(output_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=rows_out[0].keys())
            writer.writeheader()
            writer.writerows(rows_out)
        print(f"\nDone. Written to {output_csv}")


# ─── Quick single test ────────────────────────────────────────────────────────
if __name__ == "__main__":
    result = find_schools_by_address("742 Evergreen Terrace Springfield OR 97401")
    print_result("742 Evergreen Terrace Springfield OR 97401", result)

    # To run batch mode, create a CSV with an "address" column and call:
    # batch_lookup_addresses("input.csv", "output.csv")
```

---

### Way 6 — Newman CLI

```bash
# Create the collection file
cat > ssl_addressquery_test.json << 'EOF'
{
  "info": {
    "name": "SSL API — addressQuery smoke test",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "addressQuery — normal address",
      "request": {
        "method": "POST",
        "url": "https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API/addressQuery",
        "body": {
          "mode": "urlencoded",
          "urlencoded": [
            { "key": "apiKey",             "value": "c17b5e11-172a-4e81-a79c-5af64f7f0e0b" },
            { "key": "districtID",         "value": "demo" },
            { "key": "address",            "value": "742 Evergreen Terrace Springfield OR 97401" },
            { "key": "restGeocodeService", "value": "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates" },
            { "key": "f",                  "value": "json" }
          ]
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "exec": [
              "pm.test('Status 200', () => pm.response.to.have.status(200));",
              "const body = pm.response.json();",
              "const isAmbiguous = body.status === 'AMBIGUOUS_ADDRESS';",
              "pm.test('Response is valid (school result or ambiguous)', () => {",
              "  pm.expect(isAmbiguous || body.schoolResults).to.exist;",
              "});"
            ]
          }
        }
      ]
    }
  ]
}
EOF

# Run the test
newman run ssl_addressquery_test.json
```

---

## 6. Endpoint: properties (health check)

This endpoint requires no authentication. It returns the current configuration the SOE is running with — useful for verifying that layer names are set correctly, or as a simple health check to confirm the service is up.

**Request:**

```bash
curl "https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API/properties?f=json"
```

**Response:**

```json
{
  "Study Area Name": "StudyAreas",
  "School Name":     "Schools",
  "Trustee Name":    "Trustee",
  "maxNumFeatures":  100,
  "returnFormat":    "json",
  "isEditable":      false
}
```

Use this to confirm:
- `Study Area Name` matches the attendance boundary layer name in your map service
- `School Name` matches the schools point layer name
- `Trustee Name` matches your trustee layer name (if you have one)
- `maxNumFeatures` is set to a value large enough for your district

If any of these values look wrong, they need to be updated in ArcGIS Server Manager under the SOE properties for this service.

---

## 7. Full Postman collection setup

This section walks you through a complete Postman workspace that you can share with your whole team.

### Step 1 — Create the environment

In Postman: **Environments → New → name it "SSL API — Demo"**

Add these variables:

| Variable | Current Value |
|----------|---------------|
| `baseUrl` | `https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/MapServer/exts/SSL_API` |
| `apiKey` | `c17b5e11-172a-4e81-a79c-5af64f7f0e0b` |
| `districtID` | `demo` |
| `geocoderUrl` | `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates` |

Save. Select this environment from the top-right dropdown before running any request.

### Step 2 — Import the collection

Create a file called `SSL_API.postman_collection.json` and paste the content below, then import via **File → Import** in Postman.

```json
{
  "info": {
    "name": "SSL API v3.05 — Full Collection",
    "description": "SchoolSite Locator API — all endpoints with test scripts. Use with the 'SSL API — Demo' environment.",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "01. Health check — properties",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/properties?f=json"
      },
      "event": [{
        "listen": "test",
        "script": { "exec": [
          "pm.test('Status 200', () => pm.response.to.have.status(200));",
          "pm.test('Has Study Area Name', () => {",
          "  pm.expect(pm.response.json()).to.have.property('Study Area Name');",
          "});"
        ]}
      }]
    },
    {
      "name": "02. locationQuery — point lookup",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/locationQuery",
        "body": {
          "mode": "urlencoded",
          "urlencoded": [
            { "key": "apiKey",     "value": "{{apiKey}}" },
            { "key": "districtID", "value": "{{districtID}}" },
            { "key": "location",   "value": "{\"x\":-118.2437,\"y\":34.0522,\"spatialReference\":{\"wkid\":4326}}" },
            { "key": "f",          "value": "json" }
          ]
        }
      },
      "event": [{
        "listen": "test",
        "script": { "exec": [
          "pm.test('Status 200', () => pm.response.to.have.status(200));",
          "const body = pm.response.json();",
          "pm.test('schoolResults present', () => pm.expect(body).to.have.property('schoolResults'));",
          "pm.test('At least one school', () => pm.expect(Object.keys(body.schoolResults).length).to.be.above(0));",
          "pm.test('No error in body', () => pm.expect(body).to.not.have.property('error'));",
          "pm.environment.set('lastSchoolCount', Object.keys(body.schoolResults).length);"
        ]}
      }]
    },
    {
      "name": "03. addressQuery — address lookup",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/addressQuery",
        "body": {
          "mode": "urlencoded",
          "urlencoded": [
            { "key": "apiKey",             "value": "{{apiKey}}" },
            { "key": "districtID",         "value": "{{districtID}}" },
            { "key": "address",            "value": "742 Evergreen Terrace Springfield OR 97401" },
            { "key": "restGeocodeService", "value": "{{geocoderUrl}}" },
            { "key": "f",                  "value": "json" }
          ]
        }
      },
      "event": [{
        "listen": "test",
        "script": { "exec": [
          "pm.test('Status 200', () => pm.response.to.have.status(200));",
          "const body = pm.response.json();",
          "if (body.status === 'AMBIGUOUS_ADDRESS') {",
          "  pm.test('Suggestions returned', () => pm.expect(body.suggestedAddresses.length).to.be.above(0));",
          "} else {",
          "  pm.test('schoolResults present', () => pm.expect(body).to.have.property('schoolResults'));",
          "  pm.test('Geocode score > 80', () => pm.expect(body.geocodeResults.score).to.be.above(80));",
          "  pm.environment.set('lastMatchedAddress', body.geocodeResults.matchedAddress);",
          "}"
        ]}
      }]
    },
    {
      "name": "04. locationQuery — bad API key (expect rejection)",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/locationQuery",
        "body": {
          "mode": "urlencoded",
          "urlencoded": [
            { "key": "apiKey",     "value": "invalid-key-12345" },
            { "key": "districtID", "value": "{{districtID}}" },
            { "key": "location",   "value": "{\"x\":-118.2437,\"y\":34.0522,\"spatialReference\":{\"wkid\":4326}}" },
            { "key": "f",          "value": "json" }
          ]
        }
      },
      "event": [{
        "listen": "test",
        "script": { "exec": [
          "pm.test('Bad key is rejected', () => {",
          "  const body = pm.response.json();",
          "  const hasError = body.error || body.message || (typeof body === 'string' && body.includes('not valid'));",
          "  pm.expect(hasError).to.be.ok;",
          "});"
        ]}
      }]
    }
  ]
}
```

### Step 3 — Run the full collection

Use Postman's **Collection Runner** to run all four requests in sequence:

1. Right-click the collection name → **Run collection**
2. Select the **SSL API — Demo** environment
3. Set iterations to 1
4. Click **Run SSL API v3.05**

All four tests should pass. The bad API key request (item 04) is intentionally expected to fail so you can confirm error handling works correctly.

### Step 4 — Run from the terminal with Newman

```bash
npm install -g newman

newman run SSL_API.postman_collection.json \
  --environment SSL_API_Demo.postman_environment.json \
  --reporters cli
```

---

## 8. Understanding the response structure

Every successful response from either endpoint has the same top-level structure. Here is what each key means and when to expect it to be empty.

```
Response
├── geocodeResults          object
│   ├── matchedAddress      string   — what the geocoder matched your input to
│   └── score               number   — confidence 0–100. Only populated for addressQuery.
│
├── schoolResults           object   — keyed by SCHL_CODE
│   └── "1042"              array    — always an array, usually one item
│       └── [0]             object
│           ├── SCHL_CODE   string   — the school's unique code
│           ├── SCHOOL_NAME string
│           ├── GRADES      string   — e.g. "K-5" or "6-8"
│           ├── ADDRESS     string
│           ├── PHONE       string
│           ├── (all other fields from your Schools layer)
│           └── geometry    object
│               ├── x       number   — longitude of the school building
│               └── y       number   — latitude of the school building
│
├── walkZoneResults         object   — keyed by OID. Empty {} if layer not configured.
│   └── "5"                 array
│       └── [0]             object   — all non-geometry fields from walkzones layer
│
└── trusteeResults          object   — flat object (not keyed). Empty {} if not configured.
    ├── TRUSTEE             string   — the trustee code
    ├── TRUSTEE_NAME        string
    └── (all other non-geometry fields from Trustee layer)
```

**Things to watch out for:**

- `schoolResults` keys are strings even though they look like numbers. Use `Object.entries()` or `Object.keys()` to iterate, not array indexing.
- Each value in `schoolResults` is an **array**. Always access index `[0]` to get the school object.
- `walkZoneResults` and `trusteeResults` come back as empty objects `{}` when the layer is not configured. Check `Object.keys(result.walkZoneResults).length > 0` before trying to read them.
- `geocodeResults` is always an empty object `{}` for `locationQuery`. Do not depend on it having data unless you called `addressQuery`.

---

## 9. Common errors and what they mean

| Error / Symptom | What happened | What to do |
|----------------|---------------|-----------|
| `"API Key is not valid, please contact MGT Impact Solutions"` | The apiKey and districtID combination did not match any entry in the key file, or the key is inactive or expired. | Check that districtID matches exactly. Verify isActive is true and expiresAt has not passed. |
| `"School codes cannot be found. Location is possibly outside the district"` | The coordinate or geocoded point landed outside all StudyAreas polygons. | Confirm the point is geographically inside the district's boundaries. Double-check that x/y are not swapped. |
| `"Address could not be geocoded"` | Neither the internal geocoder nor the Esri World Geocoder returned a result above the score threshold. | Add more detail to the address — include city, state, and ZIP code. |
| `status: "AMBIGUOUS_ADDRESS"` | Two candidates scored within 5 points of each other. | Show `suggestedAddresses` to the user and let them pick one. |
| `"Study Areas with name of 'X' cannot be found in group layer 'Y'"` | The layerType SOE property does not match the actual layer name in the map service. | Check the layer name in ArcGIS Server Manager SOE properties. |
| Empty `schoolResults: {}` | The StudyAreas query returned school codes, but no Schools features matched those codes. | Verify that SCHL_CODE values in the Schools layer match the school code fields in StudyAreas. |
| HTTP 500 with no body | The SOE threw an unhandled exception, usually because a required layer is null. | Check ArcGIS Server Manager logs for the specific error message. |

---

## 10. Quick reference card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SSL API — Quick Reference                            │
│                                                                             │
│  Base URL                                                                   │
│  https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/           │
│  MapServer/exts/SSL_API                                                     │
│                                                                             │
│  Demo key:    c17b5e11-172a-4e81-a79c-5af64f7f0e0b                          │
│  District ID: demo                                                          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Endpoint        Method  When to use                                        │
│  ─────────────── ──────  ──────────────────────────────────────────────     │
│  /locationQuery  POST    You have GPS coordinates (x/y)                     │
│  /addressQuery   POST    User typed a street address                        │
│  /properties     GET     Health check, verify layer config                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  locationQuery required params                                              │
│    apiKey      → your key                                                   │
│    districtID  → district group layer name                                  │
│    location    → {"x":LONGITUDE,"y":LATITUDE,"spatialReference":{"wkid":4326}}│
│    f           → json                                                       │
│                                                                             │
│  addressQuery required params                                               │
│    apiKey             → your key                                            │
│    districtID         → district group layer name                           │
│    address            → full street address including city and state        │
│    restGeocodeService → URL to findAddressCandidates endpoint               │
│    f                  → json                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Always check these in your code                                            │
│    • data.status === "AMBIGUOUS_ADDRESS" before reading schoolResults       │
│    • Object.keys(data.schoolResults).length > 0 before iterating            │
│    • data.schoolResults["1042"][0]  ← always index [0] on the array         │
│    • x = longitude, y = latitude   ← not the other way around               │
└─────────────────────────────────────────────────────────────────────────────┘
```

Questions about the API or key provisioning — contact MGT Impact Solutions.
