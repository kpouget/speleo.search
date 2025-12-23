var target_lat = 0;
var target_lon = 0;
var name = "non définie"

function setTarget() {
    const urlParams = new URLSearchParams(window.location.search);
    const myLon = parseFloat(urlParams.get('lon'));
    if (!isNaN(myLon)) {
        target_lon = myLon;
    }
    const myLat = parseFloat(urlParams.get('lat'));
    if (!isNaN(myLat)) {
        target_lat = myLat;
    }
    const myName = urlParams.get('name');

    if (myName != null) {
        name = myName;
    }
    const targetName = document.querySelector('#targetName');
    const targetLoc = document.querySelector('#targetLoc');
    targetName.textContent = `cible: ${name}`;
    targetLoc.textContent = `lat=${target_lat.toFixed(4)}° lon=${target_lon.toFixed(4)}°`;

    setLinks("target", target_lon, target_lat)

    document.title = `Cherche le trou: ${name}`

}

function init() {
    const status = document.querySelector('#status');
    status.textContent = "Initialisé";
    const loc_age = document.querySelector('#loc_age');
    const gps_accuracy = document.querySelector('#gps_accuracy');
    const tracking = document.querySelector('#tracking');

    const distance = document.querySelector('#distance');
    const bearing = document.querySelector('#bearing');
    const heading = document.querySelector('#heading');

    const east = document.querySelector('#east');
    const north = document.querySelector('#north');
    const lonlat = document.querySelector('#lonlat');

    loc_age.dataset.start_ts = 0;
    setInterval(refreshGPSAge, 10*1000); // 10s
}

function refreshGPSAge() {
    var start_ts = parseInt(loc_age.dataset.start_ts)
    if (start_ts == 0) {
        loc_age.textContent = `Age du point GPS: <pas encore trouvé>`
        return
    }
    loc_age.textContent = `Age du point GPS:: ${ts_to_hms_dist(start_ts)} `
}

function success(position) {
    const status = document.querySelector('#status');

    const latitude  = position.coords.latitude;
    const longitude = position.coords.longitude;

    status.textContent = `status: Localisé`

    loc_age.dataset.start_ts = position.timestamp
    refreshGPSAge()
    try {
        gps_accuracy.textContent = `Précision du point GPS: +/- ${distWithUnit(Math.trunc(position.coords.accuracy))}`
    } catch (error) {
        gps_accuracy.textContent = `Précision du point GPS: error ${error}`
    }

    var dist = calcCrow(target_lat, target_lon, latitude, longitude)

    distance.textContent = `${distWithUnit(dist)} à vol d'oiseau`;

    var bear = calcBearing(latitude, longitude, target_lat, target_lon)
    bearing.textContent = `Direction de la cible: ${bearing_to_cardinal(bear)} (${bear.toFixed(0)}°)`;
    if (position.coords.heading != null) {
        heading.textContent = `Direction actuelle: ${bearing_to_cardinal(position.coords.heading)} (${position.coords.heading.toFixed(0)}°)`;
    } else {
        heading.textContent = `Direction actuelle: inconnue`;
    }

    var distNorth = calcCrow(target_lat, target_lon, latitude, target_lon)
    const dirLat = (latitude < target_lat) ? "Nord" : "Sud";
    north.textContent = `${distWithUnit(distNorth)} au ${dirLat}`;

    var distEast = calcCrow(target_lat, target_lon, target_lat, longitude)
    const dirLon = (latitude > target_lat) ? "Ouest" : "Est";

    east.textContent = `${distWithUnit(distEast)} à l'${dirLon}`;

    lonlat.textContent = `lat=${latitude.toFixed(4)}° lon=${longitude.toFixed(4)}°`

    setLinks("current", longitude, latitude)
}

function error(error) {
    const status = document.querySelector('#status');
    status.textContent = `status: ${heure()} ${erreurPosition(error)}`
}

var cfg = {maximumAge: 0,
           enableHighAccuracy: true};
var tracking_id = null;
function findMeOnce() {
    const status = document.querySelector('#status');
    if(!navigator.geolocation) {
        status.textContent = `status: Geolocation non supportée...`;
    } else {
        status.textContent = heure() + ' Localisation en cours…';
        navigator.geolocation.getCurrentPosition(success, error, cfg);
    }
}

function followMe() {
    const status = document.querySelector('#status');
    if (tracking_id != null) {
        status.textContent = 'status: Suivi déjà activé ...';
    } else if(!navigator.geolocation) {
        status.textContent = 'status: Geolocation non supportée.';
    } else {
        status.textContent = heure() + ' Activation du suivi en cours…';
        tracking_id = navigator.geolocation.watchPosition(success, error, cfg);
        tracking.textContent = `Suivi en cours.`
    }
}

function forgetMe() {
    const status = document.querySelector('#status');
    if(!navigator.geolocation) {
        status.textContent = 'status: Geolocation is not supported by your browser';
    } else if (tracking_id == null) {
        status.textContent = `status: ${heure()} Pas de suivi en cours…`;
    } else {
        status.textContent = `status: ${heure()} Tracking arrété.`;
        navigator.geolocation.clearWatch(tracking_id);
        tracking_id = null;
        tracking.textContent = "."
    }
}
