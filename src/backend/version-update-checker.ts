import fetch from "node-fetch";
import log from "electron-log/main";
import {VERSION} from "../version";
import {app, ipcMain, net, shell} from "electron";
import path from "path";
import fs from "fs";

export function initUpdateBtnListener() {
    ipcMain.handle('update-btn-clicked', async (_event, downloadLink: string) => {
        const tempFilePath = path.join(app.getPath("temp"), "new-release.exe");
        const request = net.request(downloadLink);
        request.on("response", (response) => {
            const fileStream = fs.createWriteStream(tempFilePath);
            response.on("data", (chunk) => fileStream.write(chunk));
            response.on("end", () => {
                fileStream.end();
                log.info(`Downloaded new release to ${tempFilePath}`);
                shell.openPath(tempFilePath); // Executes the downloaded file
                app.quit();
            });
        });
        request.end();
    })
}

export async function getNewReleaseInfoIfOutdated(): Promise<{ tag_name: string, body: string, browser_download_url: string } | null> {
    try {
        const response = await fetch("https://api.github.com/repos/derJunker/pogostuck-split-tracker/releases/latest");
        if (!response.ok) return null;
        const data = await response.json();
        const releaseData = data as { tag_name: string, body: string, assets: Array<{ browser_download_url: string }> };
        if (!data || typeof data !== "object") {
            return null;
        }
        const tagName = (data as { tag_name?: any, body?: string }).tag_name;
        const body = (data as { body?: any }).body;
        if (typeof tagName !== "string" || typeof body !== "string") {
            return null;
        }
        const latestVersion = parseVersionFromTag(tagName);
        const localVersion = parseVersionFromTag(VERSION);
        if (compareVersions(localVersion, latestVersion) >= 0) {
            return null;
        }

        const asset = releaseData.assets.find(a => a.browser_download_url.endsWith(".exe"));
        if(!asset) {
            log.warn(`No executable asset found in release ${tagName}.`);
            return null
        }

        return { tag_name: tagName, body, browser_download_url: asset.browser_download_url };
    } catch (e) {
        return null;
    }
}

function parseVersionFromTag(tag: string): string {
    // Accepts v.0.1.0, v0.1.0, 0.1.0, etc. Returns 0.1.0
    const match = tag.match(/v?\.?([0-9]+\.[0-9]+\.[0-9]+)/i);
    return match ? match[1] : "0.0.0";
}

function compareVersions(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na > nb) return 1;
        if (na < nb) return -1;
    }
    return 0;
}