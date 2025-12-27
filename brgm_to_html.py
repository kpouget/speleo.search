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
import sys
crsSrc = QgsCoordinateReferenceSystem("IGNF:LAMB93")    # WGS 84
crsDest = QgsCoordinateReferenceSystem("EPSG:4326")  # WGS 84 / UTM zone 33N
transformContext = QgsProject.instance().transformContext()
xform = QgsCoordinateTransform(crsSrc, crsDest, transformContext)

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
    df = pd.read_table("Prospection.csv", sep=",")
except FileNotFoundError:
    print("Error: Prospection.csv file not found!")
    sys.exit(1)
except Exception as e:
    print(f"Error reading CSV file: {e}")
    sys.exit(1)

print(f"Loaded {len(df)} entries from CSV")

html_lines = []
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
    name_url = urllib.parse.urlencode({'name': name})
    name_html = html.escape(name)

    # Enhanced cave type and locality extraction
    cave_type = str(line[TYPE]).strip() if pd.notna(line[TYPE]) else "Cavité"
    locality = str(line[POSIT_APP]).strip() if pd.notna(line[POSIT_APP]) else ""
    locality = locality.replace("approche", "approx")

    html_line = f"""
        <li class="cave-item" data-name="{name_html.lower()}" data-type="{cave_type.lower()}" data-locality="{locality.lower()}">
          <span class="distance">-</span>
          <a href='cherche.html?lat={latitude}&lon={longitude}&{name_url}' class="cave cave-name" data-latitude='{latitude}' data-longitude='{longitude}' data-name='{name_html}'>{name_html}</a>
          <div class="cave-details">
            {f'<small>{locality}</small>' if locality and locality.lower() != 'naturelle' else ''}
          </div>
          <div class="external-links">
            <a href='https://www.geoportail.gouv.fr/carte?c={longitude},{latitude}&z=30&l0=GEOGRAPHICALGRIDSYSTEMS.MAPS::GEOPORTAIL:OGC:WMTS(1)&permalink=yes' target='_blank' class="geo-link">Géoportail</a>
            <a href='https://www.openstreetmap.org/?mlat={latitude}&mlon={longitude}' target='_blank' class="osm-link">OSM</a>
            <a href='https://maps.google.com/maps?q={latitude},{longitude}' target='_blank' class="google-link">Google Maps</a>
          </div>
        </li>"""

    kept.append(uid)
    html_lines.append(html_line)

with open("index_template_improved.html") as f:
    template = f.read()

# Replace placeholders in template
html_output = template.replace("{{ data }}", "\n".join(html_lines))
html_output = html_output.replace("{{ cave_count }}", str(len(kept)))

with open("index.html", "w") as out_f:
    print(html_output, file=out_f)

print(f"""
Generation completed successfully!

Statistics:
- Total entries in CSV: {len(df)}
- Caves kept: {len(kept)}
- Duplicates removed: {len(dup)}
- Entries ignored: {len(ignored)}
- Output file: index.html

Cave filtering applied:
- Removed entries with "centroide" in position
- Removed entries with "ouvrage civil" in type
- Removed entries with missing coordinates or names
- Removed duplicate coordinates/names
""")
