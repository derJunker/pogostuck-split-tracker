import * as fs from 'fs';
import * as path from 'path';
import chokidar, { FSWatcher } from 'chokidar';
import log from "electron-log/main";

const DEBUG_PRINT_MESSAGES = false;

export class FileWatcher {
    private static instance: FileWatcher | null = null;
    private dirWatcher: FSWatcher | null = null;
    private fileWatcher: FSWatcher | null = null;
    private lastSize = 0;

    private listeners: { regex: RegExp, callback: (match: RegExpMatchArray) => void }[] = [];

    // Listeners that need to wait for multiple things to be logged before they can act
    private multiLineListeners: { regexes: {
            regex: RegExp,
            match: RegExpMatchArray | null
        }[], callback: (matches: RegExpMatchArray[]) => void }[] = [];

    private logsDetected = false;
    private constructor() {}

    public static getInstance(): FileWatcher {
        if (!FileWatcher.instance) {
            FileWatcher.instance = new FileWatcher();
        }
        return FileWatcher.instance;
    }

    startWatching(dirPath: string, fileName: string) {
        this.stopWatching();
        const filePath = path.join(dirPath, fileName);

        this.dirWatcher = chokidar.watch(dirPath, { persistent: true, depth: 0 });
        this.dirWatcher.on('add', (addedPath: string) => {
            if (path.basename(addedPath) === fileName && !this.fileWatcher) {
                this.lastSize = 0;
                this.watchFile(filePath);
                log.info(`Started watching file: ${filePath}`);
            }
        });
        this.dirWatcher.on('unlink', (removedPath: string) => {
            if (path.basename(removedPath) === fileName) {
                log.debug(`removed ${fileName} from ${dirPath}`);
                this.stopFileWatcher();
            }
        });
        log.debug(`attemting to access file: ${filePath}`);
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (!err) {
                log.info(`File ${fileName} exists, starting to watch it.`);
                this.watchFile(filePath);
            } else {
                log.warn(`File ${fileName} does not exist in ${dirPath}, will wait for it to be created.`);
            }
        });
    }

    registerListener(regex: RegExp, callback: (match: RegExpMatchArray) => void) {
        this.listeners.push({ regex, callback });
    }

    registerMultiLineListener(regexes: RegExp[], callback: (matches: RegExpMatchArray[]) => void) {
        if (regexes.length === 0 || regexes.length === 1) {
            throw new Error("MultiLineListener requires at least two regexes");
        }
        const regexObjs = regexes.map(r => ({ regex: r, match: null }));
        this.multiLineListeners.push({ regexes: regexObjs, callback });
    }

    private watchFile(filePath: string) {
        this.stopFileWatcher();
        this.logsDetected = false;
        fs.stat(filePath, (err, stats) => {
            if (!err) {
                this.lastSize = stats.size;
            } else {
                this.lastSize = 0;
            }
            this.fileWatcher = chokidar.watch(filePath, { persistent: true, usePolling: true, interval: 500 });
            this.fileWatcher.on('change', (changedPath: string) => {
                fs.stat(filePath, (err, stats) => {
                    if (err) {
                        console.error(`Error reading file stats for ${changedPath}:`, err);
                        return
                    }
                    if (stats.size < this.lastSize) {
                        this.lastSize = 0;
                    }
                    if (stats.size > this.lastSize) {
                        this.logsDetected = true;
                        const stream = fs.createReadStream(filePath, {
                            start: this.lastSize,
                            end: stats.size
                        });
                        stream.on('data', (data) => {
                            const newLines = data.toString().split('\n').filter(Boolean);
                            newLines.forEach(line => {
                                if (DEBUG_PRINT_MESSAGES) {
                                    log.debug(`[LogWatcher]: ${line}`);
                                }
                                this.listeners.forEach(listener => {
                                    const match = line.match(listener.regex);
                                    if (match) {
                                        listener.callback(match);
                                    }
                                });
                                this.multiLineListeners.forEach(multiListener => {
                                    multiListener.regexes.forEach((regexObj, index) => {
                                        const match = line.match(regexObj.regex);
                                        if (match) {
                                            regexObj.match = match;
                                        }
                                    });
                                    const allMatched = multiListener.regexes.every(r => r.match);
                                    if (allMatched) {
                                        const matches = multiListener.regexes.map(r => r.match!);
                                        multiListener.regexes.forEach(reg => reg.match = null);
                                        multiListener.callback(matches!)
                                    }
                                });
                            });
                        });
                        this.lastSize = stats.size;
                    }
                });
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

    public stopWatching() {
        if (this.dirWatcher) {
            this.dirWatcher.close();
            this.dirWatcher = null;
        }
        this.stopFileWatcher();
    }

    public logsHaveBeenDetected() {
        return this.logsDetected;
    }
}