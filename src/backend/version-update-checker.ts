import fetch from "node-fetch";

export async function getNewReleaseInfoIfOutdated(): Promise<{ tag_name: string, body: string } | null> {
    const currentVersion = process.env.npm_package_version || "0.0.0";
    try {
        const response = await fetch("https://api.github.com/repos/derJunker/pogostuck-split-tracker/releases/latest");
        if (!response.ok) return null;
        const data = await response.json();
        if (!data || typeof data !== "object") {
            return null;
        }
        const tagName = (data as { tag_name?: string, body?: string }).tag_name;
        const body = (data as { body?: string }).body;
        if (typeof tagName !== "string" || typeof body !== "string") {
            return null;
        }
        const latestVersion = parseVersionFromTag(tagName);
        const localVersion = parseVersionFromTag(currentVersion);
        if (compareVersions(localVersion, latestVersion) < 0) {
            return { tag_name: tagName, body };
        }
        return null;
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