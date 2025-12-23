// https://stackoverflow.com/a/18883819/341106
// This function takes in latitude and longitude of two location and
// returns the distance between them as the crow flies (in km)
function calcCrow(lat1, lon1, lat2, lon2) {
    var R = 6371; // km
    var dLat = toRad(lat2-lat1);
    var dLon = toRad(lon2-lon1);
    var lat1 = toRad(lat1);
    var lat2 = toRad(lat2);

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;

    return (d*1000).toFixed(0);
}

function affichZero(nombre) {
    return nombre < 10 ? '0' + nombre : nombre;
}
function heure() {
    return ts_to_heure(Date.now())
}

function ts_to_heure(ts) {
    infos = new Date(ts);
    return affichZero(infos.getHours()) + ':' + affichZero(infos.getMinutes()) + ':' + affichZero(infos.getSeconds())
}
function ts_to_hms_dist(ts) {
    now = new Date()
    ts_dt = new Date(ts);

    str = ""
    const hr_diff =  now.getHours() - ts_dt.getHours()
    if (hr_diff != 0) {
        str += `${hr_diff}h `
    }
    const min_diff = now.getMinutes() - ts_dt.getMinutes()
    if (min_diff != 0) {
        str += `${min_diff}min `
    }
    const sec_diff = now.getSeconds() - ts_dt.getSeconds()

    str += `${sec_diff} seconds`
    return str
}

// Converts from radians to degrees.
function toDegrees(radians) {
    return radians * 180 / Math.PI;
}

// Converts numeric degrees to radians
function toRad(Value) {
    return Value * Math.PI / 180;
}

// https://stackoverflow.com/a/52079217/341106
function calcBearing(startLat, startLng, destLat, destLng){
    startLat = toRad(startLat);
    startLng = toRad(startLng);
    destLat = toRad(destLat);
    destLng = toRad(destLng);

    y = Math.sin(destLng - startLng) * Math.cos(destLat);
    x = Math.cos(startLat) * Math.sin(destLat) -
        Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
    brng = Math.atan2(y, x);
    brng = toDegrees(brng);
    return (brng + 360) % 360;
}
function distWithUnit(dist) {
    if (dist > 2000) {
        dist = (dist / 1000).toFixed(1)
        return `${dist} km`
    } else {
        return `${dist}m`
    }
}
function setLinks(name, longitude, latitude) {
    const osm = document.querySelector('#osm-'+name);
    const geo = document.querySelector('#geo-'+name);

    geo.href = `https://www.geoportail.gouv.fr/carte?c=${longitude},${latitude}&z=13&l0=GEOGRAPHICALGRIDSYSTEMS.MAPS::GEOPORTAIL:OGC:WMTS(1)&permalink=yes`;
    geo.textContent = `Geoportail`;

    osm.href = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}`;
    osm.textContent = `OpenStreetMap`;
}

function erreurPosition(error) {
    var info = "erreur: ";
    switch(error.code) {
    case error.TIMEOUT:
        info += "Timeout !";
        break;
    case error.PERMISSION_DENIED:
        info += "vous n’avez pas donné la permission";
        break;
    case error.POSITION_UNAVAILABLE:
        info += "la position n’a pu être déterminée";
        break;
    case error.UNKNOWN_ERROR:
        info += "erreur inconnue";
        break;
    }
    return info
}

function bearing_to_cardinal(bear) {
    if (bear < 11) {
        return "N"
    } else if (bear < 33) {
        return "NNE"
    } else if (bear < 56) {
        return "NE"
    } else if (bear < 79) {
        return "ENE"
    } else if (bear < 101) {
        return "E"
    } else if (bear < 123) {
        return "ESE"
    } else if (bear < 146) {
        return "SE"
    } else if (bear < 169) {
        return "SSE"
    } else if (bear < 191) {
        return "S"
    } else if (bear < 214) {
        return "SSO"
    } else if (bear < 236) {
        return "SO"
    } else if (bear < 258) {
        return "OSO"
    } else if (bear < 281) {
        return "O"
    } else if (bear < 304) {
        return "ONO"
    } else if (bear < 326) {
        return "NO"
    } else if (bear < 348) {
        return "NN0"
    } else {
        return "N"
    }
}
