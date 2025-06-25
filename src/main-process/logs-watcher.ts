import * as fs from 'fs';
import * as path from 'path';
import chokidar, { FSWatcher } from 'chokidar';

export class FileWatcher {
    private dirWatcher: FSWatcher | null = null;
    private fileWatcher: FSWatcher | null = null;
    private lastSize = 0;
    private currentDir = '';
    private currentFile = '';

    startWatching(dirPath: string, fileName: string) {
        console.log("startWatching called with:", dirPath, fileName);
        this.stopWatching();
        this.currentDir = dirPath;
        this.currentFile = fileName;
        const filePath = path.join(dirPath, fileName);

        this.dirWatcher = chokidar.watch(dirPath, { persistent: true, depth: 0 });
        this.dirWatcher.on('add', (addedPath: string) => {
            if (path.basename(addedPath) === fileName && !this.fileWatcher) {
                this.lastSize = 0;
                this.watchFile(filePath);
                console.log('Datei gefunden und Überwachung gestartet.');
            }
        });
        this.dirWatcher.on('unlink', (removedPath: string) => {
            if (path.basename(removedPath) === fileName) {
                this.stopFileWatcher();
                console.log('Datei entfernt, Überwachung gestoppt.');
            }
        });

        // Falls Datei schon existiert
        fs.access(filePath, fs.constants.F_OK, (err) => {
            console.log("Überprüfe, ob die Datei existiert:", filePath);
            if (!err) {
                this.watchFile(filePath);
                console.log('Datei existiert bereits, Überwachung gestartet.');
            }
        });
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
                            // Hier kannst du jede neue Zeile verarbeiten
                            console.log('Neue Zeile:', line);
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
        this.currentDir = '';
        this.currentFile = '';
        console.log('Überwachung gestoppt.');
    }
}