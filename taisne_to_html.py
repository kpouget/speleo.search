import sys
from qgis.core import (
    QgsCoordinateReferenceSystem,
    QgsCoordinateTransform,
    QgsProject,
    QgsPointXY,
)

crsSrc = QgsCoordinateReferenceSystem("EPSG:27563")    # Lambert III sud
crsDest = QgsCoordinateReferenceSystem("EPSG:4326")  # WGS 84 / UTM zone 33N
transformContext = QgsProject.instance().transformContext()
xform = QgsCoordinateTransform(crsSrc, crsDest, transformContext)


def convert(pt_x, pt_y): # in meters
    pt = xform.transform(QgsPointXY(pt_x, pt_y))
    latitude = pt.y()
    longitude = pt.x()
    print(f"https://www.google.com/maps/place/{latitude},{longitude}")


def parse_args():
    pt_x = float(sys.argv[1].replace(",", ".")) * 1000
    pt_y = float(sys.argv[2].replace(",", ".")) * 1000

    return pt_x, pt_y


convert(*parse_args())
