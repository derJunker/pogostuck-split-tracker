export function hideLoadingScreen() {
    const loadingScreen = document.getElementById("loading-overlay");
    const menuBar = document.getElementById("menu-bar");
    const footer = document.querySelector('footer');
    if (loadingScreen && menuBar && footer) {
        setTimeout(() => loadingScreen.classList.add("hidden"), 250);
        menuBar.classList.remove("hidden")
        footer.classList.remove("hidden")
    } else {
        __electronLog.error(`Hiding loading screen failed, elements not found. loadingScreen: ${loadingScreen !== null}, menuBar: ${menuBar !== null}, footer: ${footer !== null}`);
    }
}

export function showDownloadingScreen() {
    const loadingScreen = document.getElementById("loading-overlay");
    const menuBar = document.getElementById("menu-bar");
    const footer = document.querySelector('footer');
    if (loadingScreen && menuBar && footer) {
        const loadingText = document.getElementById('loading-text')!
        loadingText.innerText = "Downloading update..."
        loadingScreen.classList.remove("hidden");
        menuBar.classList.add("hidden")
        footer.classList.add("hidden")
    } else {
        __electronLog.error(`Showing loading screen failed, elements not found. loadingScreen: ${loadingScreen !== null}, menuBar: ${menuBar !== null}, footer: ${footer !== null}`);
    }
}