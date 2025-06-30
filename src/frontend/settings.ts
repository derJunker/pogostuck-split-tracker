document.addEventListener('DOMContentLoaded', async () => {
    let settings = await window.electronAPI.loadSettings();
    (document.getElementById("settingsFilePath") as HTMLInputElement)!.value = settings.pogostuckConfigPath || "";
});

document.querySelector("#save")!.addEventListener("click", async (e) => {
    let settings = await window.electronAPI.loadSettings();
    settings.pogostuckConfigPath = (document.getElementById("settingsFilePath") as HTMLInputElement)!.value;
    window.electronAPI.saveSettings(settings).then(r => {})
})