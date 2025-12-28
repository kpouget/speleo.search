/**
 * Cave data loader - replaces server-side template generation with client-side loading
 */

let cavesData = null;

/**
 * Load caves data from JSON file
 */
async function loadCavesData() {
    try {
        console.log('Loading caves data...');
        const response = await fetch('output/caves_data.json');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        cavesData = await response.json();
        console.log(`Loaded ${cavesData.metadata.total_caves} caves`);

        return cavesData;
    } catch (error) {
        console.error('Error loading caves data:', error);
        showLoadingError(error);
        return null;
    }
}

/**
 * Create HTML element for a single cave
 */
function createCaveElement(cave) {
    const li = document.createElement('li');
    li.className = 'cave-item';
    li.setAttribute('data-name', cave.search_name);
    li.setAttribute('data-type', cave.search_type);
    li.setAttribute('data-locality', cave.search_locality);

    // Create the cave details section
    const caveDetails = cave.locality && cave.locality.toLowerCase() !== 'naturelle'
        ? `<div class="cave-details"><small>${cave.locality}</small></div>`
        : '';

    li.innerHTML = `
        <span class="distance">-</span>
        <a href='cherche.html?lat=${cave.latitude}&lon=${cave.longitude}&name=${encodeURIComponent(cave.name)}'
           class="cave cave-name"
           data-latitude='${cave.latitude}'
           data-longitude='${cave.longitude}'
           data-name='${cave.name}'>${cave.name}</a>
        ${caveDetails}
        <div class="external-links">
            <a href='https://www.geoportail.gouv.fr/carte?c=${cave.longitude},${cave.latitude}&z=30&l0=GEOGRAPHICALGRIDSYSTEMS.MAPS::GEOPORTAIL:OGC:WMTS(1)&permalink=yes'
               target='_blank'
               class="geo-link">Géoportail</a>
            <a href='https://www.openstreetmap.org/?mlat=${cave.latitude}&mlon=${cave.longitude}'
               target='_blank'
               class="osm-link">OSM</a>
            <a href='https://maps.google.com/maps?q=${cave.latitude},${cave.longitude}'
               target='_blank'
               class="google-link">Google Maps</a>
        </div>
    `;

    return li;
}

/**
 * Populate the cave list with data
 */
function populateCaveList(data) {
    const caveList = document.getElementById('cave_list');
    const caveCount = document.getElementById('cave-count');

    if (!caveList || !caveCount) {
        console.error('Required DOM elements not found');
        return;
    }

    // Clear loading content
    caveList.innerHTML = '';

    // Update count
    caveCount.textContent = `${data.metadata.total_caves} grottes`;

    // Create and append cave elements
    data.caves.forEach(cave => {
        const caveElement = createCaveElement(cave);
        caveList.appendChild(caveElement);
    });

    console.log(`Populated ${data.caves.length} caves in the list`);

    // Log statistics to console for debugging
    console.log('Cave loading statistics:', data.metadata.statistics);
}

/**
 * Show loading error message
 */
function showLoadingError(error) {
    const caveList = document.getElementById('cave_list');
    const caveCount = document.getElementById('cave-count');

    if (caveList) {
        caveList.innerHTML = `
            <li class="loading" style="color: #e74c3c;">
                ❌ Erreur lors du chargement des données: ${error.message}
                <br><small>Vérifiez que le fichier output/caves_data.json existe.</small>
            </li>
        `;
    }

    if (caveCount) {
        caveCount.textContent = 'Erreur de chargement';
        caveCount.style.backgroundColor = '#e74c3c';
    }
}

/**
 * Initialize caves data loading
 * This function should be called after the DOM is ready
 */
async function initCavesLoader() {
    console.log('Initializing caves loader...');

    const data = await loadCavesData();
    if (data) {
        populateCaveList(data);

        // Dispatch a custom event to notify other scripts that caves are loaded
        const cavesLoadedEvent = new CustomEvent('cavesLoaded', {
            detail: { cavesData: data }
        });
        document.dispatchEvent(cavesLoadedEvent);
    }
}

/**
 * Get the currently loaded caves data
 * Useful for other scripts that need access to cave information
 */
function getCavesData() {
    return cavesData;
}

/**
 * Search function that can be used by other scripts
 * Filters caves based on search criteria
 */
function searchCaves(query) {
    if (!cavesData) {
        console.warn('Caves data not loaded yet');
        return [];
    }

    if (!query || query.trim() === '') {
        return cavesData.caves;
    }

    const searchTerm = query.toLowerCase().trim();

    return cavesData.caves.filter(cave => {
        return cave.search_name.includes(searchTerm) ||
               cave.search_type.includes(searchTerm) ||
               cave.search_locality.includes(searchTerm);
    });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCavesLoader);
} else {
    // DOM is already ready
    initCavesLoader();
}
