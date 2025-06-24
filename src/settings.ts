console.log("test")
document.addEventListener('DOMContentLoaded', async () => {
    let settings = await window.electronAPI.loadSettings();
    console.log("Loaded settings:", settings);
});