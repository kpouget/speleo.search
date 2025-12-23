function init_sw() {
    if('serviceWorker' in navigator) {
        navigator.serviceWorker.register('pwa_sw.js').then(function(registration) {
            console.log('Service worker registration succeeded:', registration);

            // Check for service worker updates
            registration.addEventListener('updatefound', () => {
                console.log('New service worker found, updating...');
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('New content available, please refresh!');
                        update_version("Nouvelle version disponible - Actualiser la page");
                    }
                });
            });

            update_version("")
        }, /*catch*/ function(error) {
            console.log('Service worker registration failed:', error);
            update_version("Failed to register PWA :/")
        });
    };

}

function initPWA() {
    init_sw()
}

function update_version(txt) {
    var version = document.querySelector('#version')
    if (version) {
        version.innerText = txt;
    }
    console.log("version", txt)
}
