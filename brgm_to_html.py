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

df = pd.read_table("Prospection.csv", sep=",")

html_lines = []
dup = []
ignored = []
idx = 0
kept = []
for i, line in sorted(df.iterrows(), key=lambda x: str(x[1][NOM])):
    ignore = False
    if "centroide" in line[POSIT_APP]: ignore = True
    if "ouvrage civil" in line[TYPE]: ignore = True
    if ignore:
        ignored.append(str(line[NOM]))
        continue

    pt = xform.transform(QgsPointXY(line[X], line[Y]))
    latitude = pt.y()
    longitude = pt.x()
    name = str(line[NOM])

    uid = f"{latitude} | {longitude} | {name}"
    if uid in kept:
        dup.append(uid)
        continue

    idx += 1
    name = name.replace("?", " ").capitalize()
    name_url = urllib.parse.urlencode({'name': name})
    name_html = html.escape(name)
    html_line = f"""
      <li>
        <span class='distance'>{idx}</span> |
        <a href='https://www.geoportail.gouv.fr/carte?c={longitude},{latitude}&z=30&l0=GEOGRAPHICALGRIDSYSTEMS.MAPS::GEOPORTAIL:OGC:WMTS(1)&permalink=yes' target=_blank>GEO</a> |
        <a href='https://www.openstreetmap.org/?mlat={latitude}&mlon={longitude}' target=_blank>OSM</a> |
        <a class='cave' href='cherche.html?lat={latitude}&lon={longitude}&{name_url}' data-latitude='{latitude}' data-longitude='{longitude}' data-name='{name_html}'>{name_html}</a>
      </li>"""

    kept.append(uid)
    html_lines.append(html_line)

with open("index_template.html") as f:
    template = f.read()

with open("index.html", "w") as out_f:
    print(
        template.replace("{{ data }}", "\n".join(html_lines)),
        file=out_f
    )

print("Kept:", len(kept))
print("Dups:", len(dup))
print("Ignored", len(ignored))
