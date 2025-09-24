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