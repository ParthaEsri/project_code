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
6. [Common errors and what they mean](#5-common-errors-and-what-they-mean)
7. [Quick reference card](#6-quick-reference-card)

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
| `apiKey` |  Yes | string | Your API key |
| `districtID` |  Yes | string | The district group layer name in the map service. Case-insensitive. |
| `location` |  Yes | JSON string | An Esri point JSON object. See the format below. |
| `f` |  Yes | string | Always send `json` |

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

Go to the **Scripts** tab and paste this. It runs automatically after every request and flags problems:

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
    spatialReference: { wkid: 4326 [update based on your SR]}
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


## 5. Endpoint: addressQuery

### What it does

This endpoint accepts a plain-text street address. The server converts it to coordinates (geocoding), then performs the same spatial lookup as `locationQuery`. Use this when a user types their home address into a form — you do not need to geocode it yourself first.

The geocoding happens in two stages internally. First, the server tries the district's own ArcGIS geocoder (you pass that URL as a parameter). If nothing comes back with a high enough confidence score, it automatically falls back to the Esri World Geocoder. You do not need to handle this fallback yourself.

### Input parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `apiKey` |  Yes | string | Your API key |
| `districtID` |  Yes | string | The district group layer name. Case-insensitive. |
| `address` | Yes | string | Full street address. Include city and state for best accuracy. |
| `restGeocodeService` |  Yes | string | Full URL to the district's internal ArcGIS geocoder `findAddressCandidates` endpoint. The API tries this first before falling back to Esri World. |
| `f` | Yes | string | Always send `json` |

### The geocoding chain explained

When you call `addressQuery`, here is exactly what happens inside the server before any GIS query runs:

```
Your address string
        │
--------------------------------------  
│  Step 1: Try internal geocoder     │
│  (restGeocodeService parameter)    │
│  Threshold: score must be >= 80    │
--------------------------------------
        │
  Score >= 80?
  ├─ YES ------------------------------------------------ Point found
  │                                                           │
  └─ NO                                                       │
        │                                                     │
        |                                                     │
--------------------------------------                        │
│  Step 2: Try Esri World Geocoder   │                        │
│  Threshold: score must be >= 85    │                        │
--------------------------------------                        │
        │                                                     │
  Score >= 85?                                                │
  ├─ YES ----------------------------------------------- Point found
  │                                                           │
  └─ NO ----------------------------------------------- null (error returned)
                                                             │
                                                             ▼
                                               Ambiguity check runs on winner:
                                               Are top 2 scores within 5 points?
                                               ├─ YES - AMBIGUOUS_ADDRESS response
                                               └─ NO  - proceed to spatial query
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


## 5. Common errors and what they mean

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

## 6. Quick reference card

```
-------------------------------------------------------------------------------
│                        SSL API — Quick Reference                            │
│                                                                             │
│  Base URL                                                                   │
│  https://www.schoolsitelocator.com/server/rest/services/ssl_Demo/           │
│  MapServer/exts/SSL_API                                                     │
│                                                                             │
│  Demo key:    c17b5e11-172a-4e81-a79c-5af64f7f0e0b                          │
│  District ID: demo                                                          │
│                                                                             │
-------------------------------------------------------------------------------
│  Endpoint        Method  When to use                                        │
│  -------------- ------  -----------------------------------     │
│  /locationQuery  POST    You have GPS coordinates (x/y)                     │
│  /addressQuery   POST    User typed a street address                        │
│  /properties     GET     Health check, verify layer config                  │
-------------------------------------------------------------------------------
│  locationQuery required params                                              │
│    apiKey      - your key                                                   │
│    districtID  - district group layer name                                  │
│    location    = {"x":LONGITUDE,"y":LATITUDE,"spatialReference":{"wkid":4326}}│
│    f           - json                                                       │
│                                                                             │
│  addressQuery required params                                               │
│    apiKey             - your key                                            │
│    districtID         - district group layer name                           │
│    address            - full street address including city and state        │
│    restGeocodeService - URL to findAddressCandidates endpoint               │
│    f                  - json                                                │
-------------------------------------------------------------------------------
│  Always check these in your code                                            │
│    * data.status === "AMBIGUOUS_ADDRESS" before reading schoolResults       │
│    * Object.keys(data.schoolResults).length > 0 before iterating            │
│    * data.schoolResults["1042"][0]  - always index [0] on the array         │
│    * x = longitude, y = latitude   - not the other way around               │
-------------------------------------------------------------------------------
```

Questions about the API or key provisioning — contact MGT Impact Solutions.
