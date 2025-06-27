import { app, BrowserWindow } from 'electron'
import * as path from "node:path"

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 100,
        height: 100,
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    })

    mainWindow.loadFile(path.join(__dirname, 'index.html'))

    /* Electron issues 39959 */
	/* Electron27.0.3 On win11, Electron 28.0.0 on Win10 22H2 X64*/
	/* Temporary solution: Modify window size when the window is focused or blurred */
	/* (Whether modifying the height or the width, the page content may shake, please choose according to your needs) */
	
	/* Using Electron26.6.2 may not have this issue. For me, this bug may not appear.*/
	/* Electron26.6.2 cannot click through the transparent area */
	/* Electron27.0.3 and 28.0.0 can click through the transparent area */
	
	if (/^(27|28)\.\d+\.\d+(\-alpha\.\d+|\-beta\.\d+)?$/.test(process.versions.electron) && process.platform === "win32") {
		mainWindow.on("blur", () => {
			const[width_39959, height_39959] = mainWindow.getSize()
			mainWindow.setSize(width_39959, height_39959 + 1)
			mainWindow.setSize(width_39959, height_39959)
		})
		mainWindow.on("focus", () => {
			const[width_39959, height_39959] = mainWindow.getSize()
			mainWindow.setSize(width_39959, height_39959 + 1)
			mainWindow.setSize(width_39959, height_39959)
		})
	}
}

app.on('ready', () => {
    createWindow()
})