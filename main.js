// main.js (Electron Main Process)
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const JavaScriptObfuscator = require('javascript-obfuscator');
const archiver = require('archiver');
const { promisify } = require('util');
// Import autoUpdater from electron-updater
const { autoUpdater } = require('electron-updater');
const log = require('electron-log'); // Import electron-log

// Configure electron-log (optional, but helpful for debugging)
log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'updates.log');
autoUpdater.logger = log;
autoUpdater.autoDownload = false; // Prevent automatic download

// Promisify fs methods for easier async/await usage
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const copyFileAsync = promisify(fs.copyFile);

let mainWindow; // Declare mainWindow globally so it can be accessed by autoUpdater events
let updateProgressWindow; // Declare updateProgressWindow

/**
 * Creates the main application window.
 */
function createWindow() {
    mainWindow = new BrowserWindow({ // Assign to global mainWindow
        width: 1000,
        height: 700,
        minWidth: 800, // Minimum width for responsiveness
        minHeight: 600, // Minimum height for responsiveness
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // Preload script for security and IPC
            nodeIntegration: false, // Keep nodeIntegration false for security
            contextIsolation: true, // Keep contextIsolation true for security
            enableRemoteModule: false // Disable remote module
        },
    });

    // Load the index.html of the app.
    mainWindow.loadFile('index.html');

    // Handle window close event
    mainWindow.on('closed', () => {
        mainWindow = null;
        if (updateProgressWindow) updateProgressWindow.close();
    });
}

function createUpdateProgressWindow() {
    updateProgressWindow = new BrowserWindow({
        width: 400,
        height: 300,
        modal: true,
        parent: mainWindow,
        show: false,
        resizable: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // You might need a separate preload for this window
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    updateProgressWindow.loadFile('update-progress.html');
    updateProgressWindow.once('ready-to-show', () => {
        updateProgressWindow.show();
    });
    updateProgressWindow.on('closed', () => {
        updateProgressWindow = null;
    });
}

/**
 * Obfuscates JavaScript code in the specified directory.
 * @param {string} inputDir - Path to the directory containing JavaScript files.
 * @param {string} outputDir - Path to the directory where obfuscated files should be saved.
 * @param {object} obfuscationOptions - Options for JavaScript obfuscator.
 */
async function obfuscateCode(inputDir, outputDir, obfuscationOptions) {
    try {
        await mkdirAsync(outputDir, { recursive: true }); // Ensure output directory exists

        const files = await readdirAsync(inputDir);
        for (const file of files) {
            const inputPath = path.join(inputDir, file);
            const outputPath = path.join(outputDir, file);

            const stats = await statAsync(inputPath);
            if (stats.isDirectory()) {
                await obfuscateCode(inputPath, outputPath, obfuscationOptions); // Recursive call
            } else if (path.extname(file) === '.js') {
                const code = await readFileAsync(inputPath, 'utf8');
                const obfuscated = JavaScriptObfuscator.obfuscate(code, obfuscationOptions).getObfuscatedCode();
                await writeFileAsync(outputPath, obfuscated, 'utf8');
            } else {
                await copyFileAsync(inputPath, outputPath); // Copy non-JS files
            }
        }
    } catch (error) {
        console.error('Obfuscation failed:', error);
        throw error; // Propagate the error
    }
}

/**
 * Packages the Behavior Pack and Resource Pack into an mcpack file.
 * @param {object} packPaths - Object containing paths to the Behavior Pack and Resource Pack.
 * @param {string} outputDir - Directory to save the packaged mcpack file.
 * @param {string} outputName - Name of the output mcpack file.
 */
async function packageAddon(packPaths, outputDir, outputName) {
    try {
        await mkdirAsync(outputDir, { recursive: true });
        const outputFilePath = path.join(outputDir, `${outputName}.mcpack`);
        const output = fs.createWriteStream(outputFilePath);
        const archive = archiver('zip', { zlib: { level: 9 } }); // Compression level

        archive.on('error', err => {
            throw err;
        });
        archive.pipe(output);

        if (packPaths.behaviorPackPath) {
            archive.directory(packPaths.behaviorPackPath, 'behavior_pack');
        }
        if (packPaths.resourcePackPath) {
            archive.directory(packPaths.resourcePackPath, 'resource_pack');
        }

        await archive.finalize();
        return outputFilePath;
    } catch (error) {
        console.error('Packaging failed:', error);
        throw error;
    }
}

/**
 * Recursively copies a directory and its contents to a destination, excluding specified directories.
 * @param {string} src - Source directory path.
 * @param {string} dest - Destination directory path.
 * @param {string[]} [excludeDirs=[]] - Optional array of directory names to exclude from copying.
 */
async function copyDirectoryRecursive(src, dest, excludeDirs = []) {
    await mkdirAsync(dest, { recursive: true }); // Ensure destination directory exists
    const entries = await readdirAsync(src, { withFileTypes: true }); // Read entries with type info

    for (const entry of entries) {
        if (excludeDirs.includes(entry.name)) {
            continue; // Skip excluded directories
        }

        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyDirectoryRecursive(srcPath, destPath); // Recurse for subdirectories
        } else {
            await copyFileAsync(srcPath, destPath); // Copy files
        }
    }
}

// --- App Lifecycle ---

app.whenReady().then(() => {
    createWindow();

    // --- Auto-Updater ---
    // Check for updates after the window is created
    if (process.env.NODE_ENV === 'production') {
        autoUpdater.checkForUpdates();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// --- IPC Handlers ---

// Folder selection dialog
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    if (result.canceled) {
        return null;
    } else {
        return result.filePaths[0];
    }
});

// Obfuscate code
ipcMain.handle('obfuscate-code', async (event, data) => {
    try {
        const { inputPath, outputPath, obfuscationOptions } = data;
        await obfuscateCode(inputPath, outputPath, obfuscationOptions);
        return { success: true, message: 'Obfuscation successful' };
    } catch (error) {
        return { success: false, message: `Obfuscation failed: ${error.message}` };
    }
});

// Package addon
ipcMain.handle('package-addon', async (event, data) => {
    try {
        const { behaviorPackPath, resourcePackPath, outputDir, outputName } = data;
        const outputFilePath = await packageAddon({ behaviorPackPath, resourcePackPath }, outputDir, outputName);
        return { success: true, message: 'Add-on packaged successfully', filePath: outputFilePath };
    } catch (error) {
        return { success: false, message: `Packaging failed: ${error.message}` };
    }
});

// Get app version from package.json
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('show-message-box', async (event, options) => {
    return await dialog.showMessageBox(mainWindow, options);
});

/**
 * IPC handler for checking for updates by fetching the latest release from GitHub.
 * This handler now simply triggers the autoUpdater's check.
 */
ipcMain.handle('check-for-updates', async () => {
    console.log('Manual update check triggered by renderer.');
    if (process.env.NODE_ENV === 'production') {
        autoUpdater.checkForUpdates();
    } else {
        log.info('Skip checkForUpdates because application is not packed and dev update config is not forced');
    }
    return { message: 'Checking for updates...' }; // Return immediate feedback
});

/**
 * IPC handler to trigger the application restart and installation of the downloaded update.
 */
ipcMain.handle('restart-app', () => {
    autoUpdater.quitAndInstall();
});

// --- Auto-Updater Events (Modified) ---

autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available. Do you want to download and install it?`,
        buttons: ['Yes', 'No']
    }).then(result => {
        if (result.response === 0) { // User clicked 'Yes'
            createUpdateProgressWindow();
            autoUpdater.downloadUpdate();
            if (updateProgressWindow) {
                updateProgressWindow.webContents.send('update-changelog', info.releaseNotes || 'No release notes available.');
            }
        }
    });
});

autoUpdater.on('download-progress', (progressObj) => {
    log.info('Download progress:', progressObj);
    if (updateProgressWindow) {
        updateProgressWindow.webContents.send('download-progress', progressObj.percent);
    }
});

autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info);
    if (updateProgressWindow) {
        updateProgressWindow.webContents.send('update-downloaded');
        dialog.showMessageBox(updateProgressWindow, {
            type: 'info',
            title: 'Update Downloaded',
            message: 'The update has been downloaded. Click "Restart Now" to apply it.',
            buttons: ['Restart Now', 'Later']
        }).then(result => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
    }
});

autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
    dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Update Error',
        message: `An error occurred during update: ${err.message}`
    });
    if (updateProgressWindow) {
        updateProgressWindow.webContents.send('update-error', err.message);
    }
});