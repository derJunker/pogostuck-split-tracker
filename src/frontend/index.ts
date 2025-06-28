document.getElementById('settings-btn')?.addEventListener('click', () => {
    console.log("click")
    window.electronAPI.openSettingsWindow();
});