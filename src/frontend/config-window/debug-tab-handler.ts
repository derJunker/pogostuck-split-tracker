import {addInfoMessage} from "../form-error-handler";

export function initDebugButtonListeners() {
    const copyLogsButton = document.getElementById('copy-logs-btn') as HTMLButtonElement;
    const openAppDataDirButton = document.getElementById('open-appdata-dir-btn') as HTMLButtonElement;

    copyLogsButton?.addEventListener('click', async () => {
        const recentLogs = await window.electronAPI.getRecentLogs();
        if(!recentLogs)
            return;
        await navigator.clipboard.writeText(recentLogs);
        addInfoMessage("INFO_LOGS_COPIED");
    });

    openAppDataDirButton?.addEventListener('click', async () => {
        await window.electronAPI.openAppdataExplorer()
    });
}