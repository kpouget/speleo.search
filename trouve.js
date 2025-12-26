var target_lat = 0;
var target_lon = 0;
var name = "non définie"
var gps_success_function = undefined

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
    const targetLocCopy = document.querySelector('#targetLoc-copy');

    targetName.textContent = `🕳️ ${name}`;
    const coordText = `lat=${target_lat.toFixed(4)}° lon=${target_lon.toFixed(4)}°`;
    targetLoc.textContent = coordText;
    if (targetLocCopy) {
        targetLocCopy.textContent = coordText;
    }

    setLinks("target", target_lon, target_lat)

    document.title = `Cherche le trou: ${name}`

    simple_map_dest_loc = {
        lat: target_lat,    // Latitude
        lng: target_lon     // Longitude
    };
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
        loc_age.textContent = `<pas encore trouvé>`
        return
    }
    loc_age.textContent = `${ts_to_hms_dist(start_ts)}`
}

function update_position(position) {
    const latitude  = position.coords.latitude;
    const longitude = position.coords.longitude;

    const status = document.querySelector('#status');
    status.textContent = `status: Localisé`
    loc_age.dataset.start_ts = position.timestamp
    refreshGPSAge()

    try {
        gps_accuracy.textContent = `+/- ${distWithUnit(Math.trunc(position.coords.accuracy))}`
    } catch (error) {
        gps_accuracy.textContent = `erreur: ${error}`
    }

    if (position.coords.heading != null) {
        // Only use GPS heading if device orientation compass isn't working
        if (typeof current_heading === 'undefined' || current_heading === null) {
            heading.innerHTML = `Direction actuelle:<br>${bearing_to_cardinal(position.coords.heading)} (${position.coords.heading.toFixed(0)}°) (GPS)`;

            // Update compass with GPS heading only if device orientation isn't available
            if (typeof update_compass_heading !== 'undefined') {
                update_compass_heading(position.coords.heading);
            }
        }
    } else if (typeof current_heading === 'undefined' || current_heading === null) {
        heading.innerHTML = `Direction actuelle:<br>inconnue`;
    }

    const currentCoordText = `lat=${latitude.toFixed(4)}° lon=${longitude.toFixed(4)}°`;
    lonlat.textContent = currentCoordText;

    // Also update the copy in the links section
    const lonlatCopy = document.querySelector('#lonlat-copy');
    if (lonlatCopy) {
        lonlatCopy.textContent = currentCoordText;
    }

    if (typeof simple_map_add_to_path !== 'undefined') {
        simple_map_add_to_path({lng: longitude, lat: latitude}, position.coords.heading)
    }
}

function update_cave_distances(position) {
    update_position(position);

    const latitude  = position.coords.latitude;
    const longitude = position.coords.longitude;

    Array.prototype.filter.call(document.getElementsByClassName("cave"), function(elt){
        var dist = calcCrow(elt.dataset.latitude, elt.dataset.longitude, latitude, longitude)
        elt.dataset.distance = dist;
        elt.parentNode.dataset.distance = dist;
        elt.parentNode.querySelector("span.distance").textContent = `${distWithUnit(dist)}`;
    });

    var list = document.querySelector('#cave_list');

    [...list.children]
        .sort((a, b) => parseInt(a.dataset.distance) > parseInt(b.dataset.distance) ? 1 : -1)
        .forEach(node => list.appendChild(node));
}

function update_target(position) {
    update_position(position)

    const latitude  = position.coords.latitude;
    const longitude = position.coords.longitude;

    var dist = calcCrow(target_lat, target_lon, latitude, longitude)

    distance.textContent = `${distWithUnit(dist)} à vol d'oiseau`;

    var distNorth = calcCrow(target_lat, target_lon, latitude, target_lon)
    const dirLat = (latitude < target_lat) ? "Nord" : "Sud";
    north.textContent = `${distWithUnit(distNorth)} au ${dirLat}`;

    var distEast = calcCrow(target_lat, target_lon, target_lat, longitude)
    const dirLon = (latitude > target_lat) ? "Ouest" : "Est";

    east.textContent = `${distWithUnit(distEast)} à l'${dirLon}`;

    var bear = calcBearing(latitude, longitude, target_lat, target_lon)
    bearing.innerHTML = `Direction vers la cible:<br>${bearing_to_cardinal(bear)} (${bear.toFixed(0)}°)`;

    // Update compass with target bearing
    if (typeof update_compass_target_bearing !== 'undefined') {
        update_compass_target_bearing(bear);
    }

    setLinks("current", longitude, latitude)
}

function error(error) {
    const status = document.querySelector('#status');
    status.textContent = `status: ${heure()} ${erreurPosition(error)}`
}

var cfg = {maximumAge: 0,
           enableHighAccuracy: true};
var tracking_id = null;
var wakeLock = null;

function findMeOnce() {
    const status = document.querySelector('#status');
    if(!navigator.geolocation) {
        status.textContent = `status: Geolocation non supportée...`;
    } else {
        status.textContent = heure() + ' Localisation en cours…';
        navigator.geolocation.getCurrentPosition(gps_success_function, error, cfg);
    }
}

function followMe(success_fct) {
    const status = document.querySelector('#status');
    if (tracking_id != null) {
        status.textContent = 'status: Suivi déjà activé ...';
    } else if(!navigator.geolocation) {
        status.textContent = 'status: Geolocation non supportée.';
    } else {
        status.textContent = heure() + ' Activation du suivi en cours…';
        tracking_id = navigator.geolocation.watchPosition(gps_success_function, error, cfg);
        tracking.textContent = `Suivi en cours.`

        // Prevent phone from sleeping during tracking
        requestWakeLock();
    }
    updateButtonVisibility();
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

        // Allow phone to sleep again
        releaseWakeLock();
    }
    updateButtonVisibility();
}

function updateButtonVisibility() {
    try {
        const followBtn = document.querySelector('#follow-me');
        const forgetBtn = document.querySelector('#forget-me');

        if (followBtn && forgetBtn) {
            if (tracking_id == null) {
                // Not tracking - show Suivre, hide Stopper
                followBtn.style.display = 'inline-block';
                forgetBtn.style.display = 'none';
            } else {
                // Tracking - hide Suivre, show Stopper
                followBtn.style.display = 'none';
                forgetBtn.style.display = 'inline-block';
            }
        }
    } catch (error) {
        console.log('Button visibility update failed:', error);
    }
}

// Wake Lock functions to prevent phone sleep during tracking
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake lock acquired - screen will stay on during tracking');

            wakeLock.addEventListener('release', () => {
                console.log('Wake lock released');
                // If tracking is still active, try to reacquire wake lock
                if (tracking_id != null) {
                    setTimeout(requestWakeLock, 100);
                }
            });
        }
    } catch (error) {
        console.log('Wake lock failed:', error);
        // Fallback for older browsers - request user to keep screen on
        const status = document.querySelector('#status');
        if (status && status.textContent.indexOf('Maintenez') === -1) {
            status.textContent += ' [Maintenez l\'écran allumé]';
        }
    }
}

function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
        console.log('Wake lock released - phone can sleep normally');
    }
}

function indexSearch() {
    let text = this.value;

    document.querySelectorAll('#cave_list li').forEach(function(entry) {
        let has_it = entry.innerText.toLowerCase().includes(text.toLowerCase());

        entry.style.display = has_it ? "block" : "none";
    });
}

function init_index() {
    initPWA()

    gps_success_function = update_cave_distances
    document.querySelector('#find-me').addEventListener('click', findMeOnce);

    status.textContent = "find me once";
    findMeOnce()

    function delay(fn, ms) {
        let timer = 0
        return function(...args) {
            clearTimeout(timer)
            timer = setTimeout(fn.bind(this, ...args), ms || 0)
        }
    }
    document.querySelector('#search').addEventListener('keyup', delay(indexSearch, 500));
    document.querySelector('#search').value = "";
}

function init_cherche() {
    init()
    initPWA()

    setTarget()
    gps_success_function = update_target;
    // Safe event listeners - check if elements exist first
    const findBtn = document.querySelector('#find-me');
    const followBtn = document.querySelector('#follow-me');
    const forgetBtn = document.querySelector('#forget-me');

    if (findBtn) {
        findBtn.addEventListener('click', findMeOnce);
    }
    if (followBtn) {
        followBtn.addEventListener('click', followMe);
    }
    if (forgetBtn) {
        forgetBtn.addEventListener('click', forgetMe);
    }

    status.textContent = "find me once";
    findMeOnce()

    // Initialize button visibility
    updateButtonVisibility();

    init_simple_map();
}
