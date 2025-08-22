export function initDebugButtonListeners() {
    const copyLogsButton = document.getElementById('copy-logs-btn') as HTMLButtonElement;
    const openAppDataDirButton = document.getElementById('open-appdata-dir-btn') as HTMLButtonElement;

    copyLogsButton?.addEventListener('click', async () => {
        const recentLogs = await window.electronAPI.getRecentLogs();
        if(!recentLogs)
            return;
        await navigator.clipboard.writeText(recentLogs);
    });

    openAppDataDirButton?.addEventListener('click', async () => {
        await window.electronAPI.openAppdataExplorer()
    });
}