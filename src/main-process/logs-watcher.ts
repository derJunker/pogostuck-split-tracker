import * as fs from 'fs';
import * as path from 'path';
import chokidar, { FSWatcher } from 'chokidar';

export class FileWatcher {
    private dirWatcher: FSWatcher | null = null;
    private fileWatcher: FSWatcher | null = null;
    private lastSize = 0;
    private listeners: { regex: RegExp, callback: (match: RegExpMatchArray) => void }[] = [];

    startWatching(dirPath: string, fileName: string) {
        this.stopWatching();
        const filePath = path.join(dirPath, fileName);

        this.dirWatcher = chokidar.watch(dirPath, { persistent: true, depth: 0 });
        this.dirWatcher.on('add', (addedPath: string) => {
            if (path.basename(addedPath) === fileName && !this.fileWatcher) {
                this.lastSize = 0;
                this.watchFile(filePath);
            }
        });
        this.dirWatcher.on('unlink', (removedPath: string) => {
            if (path.basename(removedPath) === fileName) {
                this.stopFileWatcher();
            }
        });

        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (!err) {
                this.watchFile(filePath);
            }
        });
    }

    registerListener(regex: RegExp, callback: (match: RegExpMatchArray) => void) {
        this.listeners.push({ regex, callback });
    }

    private watchFile(filePath: string) {
        this.stopFileWatcher();
        this.fileWatcher = chokidar.watch(filePath, { persistent: true, usePolling: true, interval: 500 });
        this.fileWatcher.on('change', (changedPath: string) => {
            fs.stat(filePath, (err, stats) => {
                if (err) return;
                if (stats.size > this.lastSize) {
                    const stream = fs.createReadStream(filePath, {
                        start: this.lastSize,
                        end: stats.size
                    });
                    stream.on('data', (data) => {
                        const newLines = data.toString().split('\n').filter(Boolean);
                        newLines.forEach(line => {
                            this.listeners.forEach(listener => {
                                const match = line.match(listener.regex);
                                if (match) {
                                    listener.callback(match);
                                }
                            });
                        });
                    });
                    this.lastSize = stats.size;
                }
            });
        });
    }

    private stopFileWatcher() {
        if (this.fileWatcher) {
            this.fileWatcher.close();
            this.fileWatcher = null;
        }
        this.lastSize = 0;
    }

    stopWatching() {
        if (this.dirWatcher) {
            this.dirWatcher.close();
            this.dirWatcher = null;
        }
        this.stopFileWatcher();
    }
}