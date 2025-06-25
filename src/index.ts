document.getElementById('settings-btn')?.addEventListener('click', () => {
    window.electronAPI.openSettingsWindow();
});

window.electronAPI.onMapOrModeChanged((event: Electron.IpcRendererEvent,
                                       mapAndMode:{map: string, mode: string}) => {
    console.log(`Map or mode changed: ${mapAndMode.map}, Mode: ${mapAndMode.mode}`);
});

window.electronAPI.onSplitPassed((event: Electron.IpcRendererEvent, splitInfo: {splitName: string, splitTime: number}) => {
    console.log(`Split passed: ${splitInfo.splitName}`, `Time: ${Math.floor(splitInfo.splitTime / 60000)}:${String(Math.floor((splitInfo.splitTime % 60000) / 1000)).padStart(2, '0')}:${String(splitInfo.splitTime % 1000).padStart(3, '0')}`);
});