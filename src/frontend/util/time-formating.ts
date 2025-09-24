export function formatPbTime(seconds: number, noZeroFill: boolean = false): string {
    if (seconds === Infinity)
        seconds = 0;
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = Math.floor(absSeconds % 60);
    const ms = Math.round((absSeconds - Math.floor(absSeconds)) * 1000);

    const msStr = ms.toString().padStart(3, '0').slice(0, 3);

    if (noZeroFill) {
        if (mins > 0) {
            return `${mins}:${secs.toString().padStart(2, '0')}.${msStr}`;
        } else if (secs > 0) {
            return `${secs}.${msStr}`;
        } else {
            return `0.${msStr}`;
        }
    }

    const minsStr = mins.toString().padStart(2, '0');
    const secsStr = secs.toString().padStart(2, '0');

    return `${minsStr}:${secsStr}.${msStr}`;
}

export function parsePbTime(timeStr: string): number {
    const trimmed = timeStr.trim();
    if (!trimmed) return -1;
    const parts = trimmed.split(":");
    if (parts.length > 3) return -1;
    let h = 0, m = 0, s = 0, ms = 0;
    let secPart = parts[parts.length - 1];
    const secMatch = /^(\d{1,2})(?:\.(\d{1,3}))?$/.exec(secPart);
    if (!secMatch) return -1;
    s = parseInt(secMatch[1], 10);
    if (secMatch[2]) {
        if (secMatch[2].length > 3) return -1;
        ms = parseInt(secMatch[2].padEnd(3, '0'), 10);
    }
    if (parts.length === 3) {
        h = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
    } else if (parts.length === 2) {
        m = parseInt(parts[0], 10);
    }
    // Fix: map parts correctly (3: h, m, s; 2: m, s; 1: s)
    if (parts.length === 3) {
        h = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
    } else if (parts.length === 2) {
        m = parseInt(parts[0], 10);
    } else if (parts.length === 1) {
        // only seconds, already set
    }
    return h * 3600 + m * 60 + s + ms / 1000;
}
