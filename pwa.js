function init_sw() {
    if('serviceWorker' in navigator) {
        navigator.serviceWorker.register('pwa_sw.js').then(function(registration) {
            console.log('Service worker registration succeeded:', registration);

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
    consolog.log("version", txt)
}
