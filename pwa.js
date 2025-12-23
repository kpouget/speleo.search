function init_sw() {
    if('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/pwa_sw.js').then(function(registration) {
            console.log('Service worker registration succeeded:', registration);
        }, /*catch*/ function(error) {
            console.log('Service worker registration failed:', error);
            alert("failed"+ error)
  });
    };

}

function initPWA() {
    init_sw()
}
