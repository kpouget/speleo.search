from qgis.core import (
    QgsCoordinateReferenceSystem,
    QgsCoordinateTransform,
    QgsProject,
    QgsPointXY,
)
import pandas as pd
import urllib.parse
import html
import numpy as np
import json
import sys
from datetime import datetime

# Coordinate transformation setup
crsSrc = QgsCoordinateReferenceSystem("IGNF:LAMB93")    # Lambert 93
crsDest = QgsCoordinateReferenceSystem("EPSG:4326")    # WGS 84
transformContext = QgsProject.instance().transformContext()
xform = QgsCoordinateTransform(crsSrc, crsDest, transformContext)

# CSV column definitions
NATURE_CAV = "NATURE_CAV,C,32"
TYPE = "TYPE_APPAU,C,30"
NOM = "NOM_SIMPLE,C,100"
PRIORITE = "PRIORITE,N,19,0"
REPERAGE = "REPERAGE,C,19"
POSIT = "POSIT_APP,C,22"
PRECISION = "PREC_X_Y,N,15,7"
X = "X,N,11,3"
Y = "Y,N,11,3"
Z = "Z_OUVRAGE,N,15,7"
COMMET = "Z_OUVRAGE,N,15,7"
POSIT_APP = "POSIT_APP,C,22"
NATURE = "NATURE_CAV,C,32"
TYPE = "TYPE_APPAU,C,30"

try:
    df = pd.read_table("input/Prospection.csv", sep=",")
except FileNotFoundError:
    print("Error: input/Prospection.csv file not found!")
    sys.exit(1)
except Exception as e:
    print(f"Error reading CSV file: {e}")
    sys.exit(1)

print(f"Loaded {len(df)} entries from CSV")

caves_data = []
dup = []
ignored = []
idx = 0
kept = []

# Sort by name, handling null values gracefully
for i, line in sorted(df.iterrows(), key=lambda x: str(x[1][NOM]) if pd.notna(x[1][NOM]) else "zzz_unknown"):
    ignore = False

    # Check for missing critical data
    if pd.isna(line[X]) or pd.isna(line[Y]) or pd.isna(line[NOM]):
        ignore = True

    # Existing filtering
    if pd.notna(line[POSIT_APP]) and "centroide" in str(line[POSIT_APP]).lower():
        ignore = True
    if pd.notna(line[TYPE]) and "ouvrage civil" in str(line[TYPE]).lower():
        ignore = True

    if ignore:
        ignored.append(str(line[NOM]) if pd.notna(line[NOM]) else "Unknown")
        continue

    try:
        pt = xform.transform(QgsPointXY(float(line[X]), float(line[Y])))
        latitude = round(pt.y(), 6)
        longitude = round(pt.x(), 6)
    except Exception as e:
        print(f"Error transforming coordinates for {line[NOM]}: {e}")
        ignored.append(str(line[NOM]))
        continue

    name = str(line[NOM]).strip()

    uid = f"{latitude} | {longitude} | {name}"
    if uid in kept:
        dup.append(uid)
        continue

    idx += 1
    name = name.replace("?", " ").capitalize()
    name_encoded = urllib.parse.urlencode({'name': name}).replace('name=', '')
    name_html = html.escape(name)

    # Enhanced cave type and locality extraction
    cave_type = str(line[TYPE]).strip() if pd.notna(line[TYPE]) else "Cavité"
    locality = str(line[POSIT_APP]).strip() if pd.notna(line[POSIT_APP]) else ""
    locality = locality.replace("approche", "approx")

    # Create cave data object
    cave_data = {
        "name": name_html,
        "name_encoded": name_encoded,
        "latitude": latitude,
        "longitude": longitude,
        "type": cave_type,
        "locality": locality,
        "search_name": name_html.lower(),
        "search_type": cave_type.lower(),
        "search_locality": locality.lower()
    }

    kept.append(uid)
    caves_data.append(cave_data)

# Create the final JSON structure
output_data = {
    "metadata": {
        "total_caves": len(kept),
        "generation_date": datetime.now().isoformat(),
        "statistics": {
            "total_entries": len(df),
            "kept": len(kept),
            "duplicates_removed": len(dup),
            "ignored": len(ignored)
        },
        "filters_applied": [
            "Removed entries with 'centroide' in position",
            "Removed entries with 'ouvrage civil' in type",
            "Removed entries with missing coordinates or names",
            "Removed duplicate coordinates/names"
        ]
    },
    "caves": caves_data
}

# Write JSON to file
with open("output/caves_data.json", "w", encoding="utf-8") as json_file:
    json.dump(output_data, json_file, ensure_ascii=False, indent=2)

print(f"""
JSON generation completed successfully!

Statistics:
- Total entries in CSV: {len(df)}
- Caves kept: {len(kept)}
- Duplicates removed: {len(dup)}
- Entries ignored: {len(ignored)}
- Output file: output/caves_data.json

Cave filtering applied:
- Removed entries with "centroide" in position
- Removed entries with "ouvrage civil" in type
- Removed entries with missing coordinates or names
- Removed duplicate coordinates/names
""")