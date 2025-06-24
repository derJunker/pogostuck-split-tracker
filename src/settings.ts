document.addEventListener('DOMContentLoaded', async () => {
    let settings = await window.electronAPI.loadSettings();
    (document.getElementById("settingsFilePath") as HTMLInputElement)!.value = settings.pogostuckConfigPath || "";
});

document.querySelector("#save")!.addEventListener("click", (e) => {
    let settings: { pogostuckConfigPath: string } = {
        pogostuckConfigPath: (document.getElementById("settingsFilePath") as HTMLInputElement)!.value
    }
    window.electronAPI.saveSettings(settings)
})