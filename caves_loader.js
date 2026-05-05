/**
 * Cave data loader - replaces server-side template generation with client-side loading
 */

let cavesData = null;
let currentDataSource = null;
let loadedSources = new Set(); // Track which sources have been loaded
let combinedMetadata = {
    total_caves: 0,
    sources: [],
    last_updated: null
};

/**
 * Load caves data from specified JSON file
 */
async function loadCavesData(dataSource = 'brgm') {
    try {
        const fileName = dataSource === 'taisne' ? 'output/taisne_data.json' : 'output/caves_data.json';

        updateDataSourceUI(dataSource, 'loading');

        const response = await fetch(fileName);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        cavesData = await response.json();
        currentDataSource = dataSource;

        updateDataSourceUI(dataSource, 'loaded');
        return cavesData;
    } catch (error) {
        updateDataSourceUI(dataSource, 'error');
        showLoadingError(error, dataSource);
        return null;
    }
}

/**
 * Create HTML element for a single cave
 */
function createCaveElement(cave, dataSource = null) {
    const li = document.createElement('li');
    li.className = 'cave-item';
    li.setAttribute('data-name', cave.search_name);
    li.setAttribute('data-type', cave.search_type);
    li.setAttribute('data-locality', cave.search_locality);

    // Create the cave details section with source indicator
    let caveDetails = '';
    if (cave.locality && cave.locality.toLowerCase() !== 'naturelle') {
        caveDetails = `<div class="cave-details"><small>${cave.locality}</small></div>`;
    }

    // Add source indicator
    const sourceIndicator = dataSource ?
        `<div class="source-indicator source-${dataSource}">${dataSource === 'taisne' ? 'T' : 'B'}</div>` :
        '';

    caveDetails += sourceIndicator;

    // Build URL with description if available (Taisne data)
    // Use proper URL parameter encoding to handle commas, colons, and special characters
    const params = new URLSearchParams({
        lat: cave.latitude,
        lon: cave.longitude,
        name: cave.name
    });

    // Add description if available and non-empty
    if (cave.description && cave.description.trim()) {
        params.set('description', cave.description.trim());
    }

    const caveUrl = `cherche.html?${params.toString()}`;

    // Note: Cave URLs are automatically encoded to handle special characters

    li.innerHTML = `
        <span class="distance">-</span>
        <a href='${caveUrl}'
           class="cave cave-name"
           data-latitude='${cave.latitude}'
           data-longitude='${cave.longitude}'
           data-name='${cave.name}'>${cave.name}</a>
        ${caveDetails}
        <div class="external-links">
            <a href='https://cartes-ign.ign.fr?lng=${cave.longitude}&lat=${cave.latitude}&z=16.5'
               target='_blank'
               class="ign-link">IGN Cartes</a>
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
 * Populate the cave list with data (additive - appends to existing data)
 */
function populateCaveList(data, dataSource) {
    const caveList = document.getElementById('cave_list');
    const caveCount = document.getElementById('cave-count');

    if (!caveList || !caveCount) {
        return;
    }

    // Clear loading content only on first load
    if (loadedSources.size === 0) {
        caveList.innerHTML = '';
    }

    // Add this source to loaded sources
    loadedSources.add(dataSource);

    // Update combined metadata
    combinedMetadata.total_caves += data.metadata.total_caves;
    combinedMetadata.sources.push({
        name: dataSource === 'taisne' ? 'Taisne' : 'BRGM',
        caves: data.metadata.total_caves,
        loaded_at: new Date().toISOString()
    });
    combinedMetadata.last_updated = new Date().toISOString();

    // Create and append cave elements with source indicator
    data.caves.forEach(cave => {
        const caveElement = createCaveElement(cave, dataSource);
        caveList.appendChild(caveElement);
    });

    // Update count with combined info
    updateCombinedCount();

    // Update info display after metadata is populated
    updateInfoDisplay();

    // Data successfully added to combined list
}

/**
 * Update the cave count display with combined information
 */
function updateCombinedCount() {
    const caveCount = document.getElementById('cave-count');
    if (!caveCount) return;

    const sourceLabels = combinedMetadata.sources.map(s => s.name).join(' + ');
    caveCount.textContent = `${combinedMetadata.total_caves} grottes (${sourceLabels})`;

    // Use gradient background if multiple sources
    if (loadedSources.size > 1) {
        caveCount.style.background = 'linear-gradient(135deg, #3498db 50%, #8e44ad 50%)';
    } else if (loadedSources.has('taisne')) {
        caveCount.style.backgroundColor = '#8e44ad';
    } else {
        caveCount.style.backgroundColor = '#3498db';
    }
}

/**
 * Update the data source UI buttons and info
 */
function updateDataSourceUI(dataSource, state) {
    const brgmButton = document.getElementById('load-brgm');
    const taisneButton = document.getElementById('load-taisne');
    const infoDiv = document.getElementById('data-source-info');

    if (!brgmButton || !taisneButton || !infoDiv) {
        return;
    }

    const currentButton = dataSource === 'taisne' ? taisneButton : brgmButton;

    switch (state) {
        case 'loading':
            currentButton.classList.add('loading');
            currentButton.disabled = true;
            currentButton.textContent = dataSource === 'taisne' ? '⏳ Chargement Taisne...' : '⏳ Chargement BRGM...';
            break;

        case 'loaded':
            // Permanently disable current button - it's been loaded
            currentButton.classList.remove('loading');
            currentButton.classList.add('loaded');
            currentButton.disabled = true;
            currentButton.textContent = dataSource === 'taisne' ? '✅ Taisne chargé' : '✅ BRGM chargé';
            break;

        case 'error':
            // Re-enable button on error
            currentButton.classList.remove('loading');
            currentButton.disabled = false;
            currentButton.textContent = dataSource === 'taisne' ? '❌ Erreur Taisne' : '❌ Erreur BRGM';
            updateInfoDisplay();
            break;
    }
}

/**
 * Update the info display with combined statistics
 */
function updateInfoDisplay() {
    const infoDiv = document.getElementById('data-source-info');
    if (!infoDiv) return;

    if (combinedMetadata.sources.length === 0) {
        infoDiv.textContent = 'Aucune donnée chargée';
        return;
    }

    if (combinedMetadata.sources.length === 1) {
        // Single source display
        const source = combinedMetadata.sources[0];
        infoDiv.innerHTML = `📊 <strong>${source.name}</strong> (${source.caves} entrées) = <strong>${source.caves}</strong> grottes au total`;
    } else {
        // Multiple sources - show combined total
        const sourcesList = combinedMetadata.sources.map(s =>
            `<strong>${s.name}</strong> (${s.caves} entrées)`
        ).join(' + ');
        infoDiv.innerHTML = `📊 ${sourcesList} = <strong>${combinedMetadata.total_caves}</strong> grottes au total`;
    }
}

/**
 * Show loading error message
 */
function showLoadingError(error, dataSource) {
    const caveList = document.getElementById('cave_list');
    const caveCount = document.getElementById('cave-count');

    const fileName = dataSource === 'taisne' ? 'taisne_data.json' : 'caves_data.json';

    if (caveList) {
        caveList.innerHTML = `
            <li class="loading" style="color: #e74c3c;">
                ❌ Erreur lors du chargement des données ${dataSource.toUpperCase()}: ${error.message}
                <br><small>Vérifiez que le fichier output/${fileName} existe.</small>
            </li>
        `;
    }

    if (caveCount) {
        caveCount.textContent = 'Erreur de chargement';
        caveCount.style.backgroundColor = '#e74c3c';
    }
}

/**
 * Load and display caves data (additive)
 */
async function loadAndDisplayData(dataSource) {
    // Check if this source is already loaded
    if (loadedSources.has(dataSource)) {
        return;
    }

    const data = await loadCavesData(dataSource);
    if (data) {
        populateCaveList(data, dataSource);

        // Dispatch a custom event to notify other scripts that caves are loaded
        const cavesLoadedEvent = new CustomEvent('cavesLoaded', {
            detail: {
                cavesData: data,
                dataSource: dataSource,
                combinedMetadata: combinedMetadata
            }
        });
        document.dispatchEvent(cavesLoadedEvent);
    }
}

/**
 * Initialize caves data loader with button handlers
 * This function should be called after the DOM is ready
 */
function initCavesLoader() {
    // Set up button event listeners
    const brgmButton = document.getElementById('load-brgm');
    const taisneButton = document.getElementById('load-taisne');

    if (brgmButton) {
        brgmButton.addEventListener('click', () => {
            loadAndDisplayData('brgm');
        });
    }

    if (taisneButton) {
        taisneButton.addEventListener('click', () => {
            loadAndDisplayData('taisne');
        });
    }

    // Initialize the cave list with an empty state
    initializeEmptyState();
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

/**
 * Initialize the cave list with an empty/waiting state
 */
function initializeEmptyState() {
    const caveList = document.getElementById('cave_list');
    const caveCount = document.getElementById('cave-count');

    if (caveList) {
        caveList.innerHTML = `
            <li class="loading" style="text-align: center; color: #7f8c8d; padding: 40px;">
                📂 Aucune donnée chargée
                <br><small>Sélectionnez une ou plusieurs sources de données ci-dessus</small>
            </li>
        `;
    }

    if (caveCount) {
        caveCount.textContent = 'Aucune donnée';
        caveCount.style.backgroundColor = '#95a5a6';
    }

    // Initialize info display
    updateInfoDisplay();
}

/**
 * Get current data source information
 */
function getCurrentDataSource() {
    return currentDataSource;
}

// Auto-initialize when DOM is ready - BUT DO NOT AUTO-LOAD DATA
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCavesLoader);
} else {
    // DOM is already ready
    initCavesLoader();
}
