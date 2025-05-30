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
const unlinkAsync = promisify(fs.unlink); // For deleting temporary files

let mainWindow; // Declare mainWindow globally so it can be accessed by autoUpdater events

// Set the application user model ID for Windows (important for taskbar icon)
// This should be set before the app is ready.
if (process.platform === 'win32') {
    app.setAppUserModelId(app.getName());
}

/**
 * Creates the main application window.
 */
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        fullscreen: false, // Set to false for maximized window
        maximizable: true, // Allow the window to be maximized
        autoHideMenuBar: true, // Hide the menu bar
        // Set the application icon. Ensure 'assets/icon.png' exists relative to main.js.
        icon: path.join(__dirname, 'assets', 'icon.png'), // Assuming an 'assets' folder with 'icon.png'
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        },
    });

    // Load the index.html of the app.
    mainWindow.loadFile('index.html');

    // Maximize the window after it's ready to show
    mainWindow.once('ready-to-show', () => {
        mainWindow.maximize();
        mainWindow.show();
    });

    // Handle window close event
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

/**
 * Removes JavaScript comments from a given code string.
 * This is a simplified regex and might not handle all edge cases (e.g., // inside a string literal).
 * @param {string} code - The JavaScript code string.
 * @returns {string} The code string with comments removed.
 */
function removeJsComments(code) {
    // Remove multi-line comments /* ... */
    let cleanedCode = code.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove single-line comments // ...
    cleanedCode = cleanedCode.replace(/\/\/.*/g, '');
    return cleanedCode;
}

/**
 * Minifies a JSON string.
 * @param {string} jsonString - The JSON string to minify.
 * @returns {string} The minified JSON string.
 */
function minifyJson(jsonString) {
    try {
        return JSON.stringify(JSON.parse(jsonString));
    } catch (e) {
        console.error('Error minifying JSON:', e);
        return jsonString; // Return original if parsing fails
    }
}

/**
 * Placeholder for image optimization. In a real application, this would involve
 * using a library like `sharp` or `imagemin` (which would need to be installed
 * as a dependency). For this example, it just copies the file.
 * @param {string} inputPath - Path to the input image file.
 * @param {string} outputPath - Path to save the optimized image file.
 */
async function optimizeImage(inputPath, outputPath) {
    await copyFileAsync(inputPath, outputPath);
    console.log(`Image copied (optimization skipped): ${inputPath} to ${outputPath}`);
}

/**
 * Processes files in a directory based on given options (obfuscation, comment removal, JSON minification, image compression).
 * This function is used recursively for directories.
 * @param {string} inputDir - Path to the directory containing files.
 * @param {string} outputDir - Path to the directory where processed files should be saved.
 * @param {object} options - Processing options.
 * @param {object} options.obfuscationOptions - Options for JavaScript obfuscator (can be null/undefined if not obfuscating).
 * @param {boolean} options.removeComments - Whether to remove comments from JS files.
 * @param {boolean} options.minifyJson - Whether to minify JSON files.
 * @param {boolean} options.compressImages - Whether to compress image files.
 */
async function processDirectory(inputDir, outputDir, options) {
    await mkdirAsync(outputDir, { recursive: true });

    const files = await readdirAsync(inputDir);
    for (const file of files) {
        const inputPath = path.join(inputDir, file);
        const outputPath = path.join(outputDir, file);

        const stats = await statAsync(inputPath);
        if (stats.isDirectory()) {
            await processDirectory(inputPath, outputPath, options); // Recursive call for subdirectories
        } else {
            const ext = path.extname(file).toLowerCase();
            if (ext === '.js') {
                let code = await readFileAsync(inputPath, 'utf8');
                if (options.removeComments) {
                    code = removeJsComments(code);
                }
                if (options.obfuscationOptions) { // Only obfuscate if options are provided
                    code = JavaScriptObfuscator.obfuscate(code, options.obfuscationOptions).getObfuscatedCode();
                }
                await writeFileAsync(outputPath, code, 'utf8');
            } else if (ext === '.json') {
                let content = await readFileAsync(inputPath, 'utf8');
                if (options.minifyJson) {
                    content = minifyJson(content);
                }
                await writeFileAsync(outputPath, content, 'utf8');
            } else if (['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff'].includes(ext)) {
                if (options.compressImages) {
                    await optimizeImage(inputPath, outputPath);
                } else {
                    await copyFileAsync(inputPath, outputPath);
                }
            } else {
                await copyFileAsync(inputPath, outputPath); // Copy other files as is
            }
        }
    }
}


/**
 * Packages the Behavior Pack and Resource Pack into an mcpack file.
 * @param {object} packPaths - Object containing paths to the Behavior Pack and Resource Pack.
 * @param {string} outputDir - Directory to save the packaged mcpack file.
 * @param {string} packName - The desired name for the output .mcpack file (without extension).
 * @param {object} processingOptions - Options for processing files (obfuscation, comments, json, images).
 * @returns {Promise<string>} - The path to the created mcpack file.
 */
async function packageAddon(packPaths, outputDir, packName, processingOptions) {
    let tempProcessingDir = null;
    try {
        await mkdirAsync(outputDir, { recursive: true });
        const outputFileName = `${packName.replace(/[^a-z0-9_.-]/gi, '_')}.mcpack`; // Sanitize pack name
        const outputFilePath = path.join(outputDir, outputFileName);
        const output = fs.createWriteStream(outputFilePath);
        const archive = archiver('zip', { zlib: { level: 9 } }); // Compression level

        archive.on('error', err => {
            throw err;
        });
        archive.pipe(output);

        // Create a temporary directory for processing if any processing option is enabled
        if (processingOptions.obfuscationOptions || processingOptions.removeComments || processingOptions.minifyJson || processingOptions.compressImages) {
            tempProcessingDir = path.join(app.getPath('temp'), `addon_temp_${Date.now()}`);
            await mkdirAsync(tempProcessingDir, { recursive: true });
        }

        if (packPaths.behaviorPackPath) {
            const bpSourcePath = packPaths.behaviorPackPath;
            const bpArchiveName = 'behavior_pack';
            if (tempProcessingDir) {
                const bpDestPath = path.join(tempProcessingDir, bpArchiveName);
                await processDirectory(bpSourcePath, bpDestPath, processingOptions);
                archive.directory(bpDestPath, bpArchiveName);
            } else {
                archive.directory(bpSourcePath, bpArchiveName);
            }
        }
        if (packPaths.resourcePackPath) {
            const rpSourcePath = packPaths.resourcePackPath;
            const rpArchiveName = 'resource_pack';
            if (tempProcessingDir) {
                const rpDestPath = path.join(tempProcessingDir, rpArchiveName);
                await processDirectory(rpSourcePath, rpDestPath, processingOptions);
                archive.directory(rpDestPath, rpArchiveName);
            } else {
                archive.directory(rpSourcePath, rpArchiveName);
            }
        }

        await archive.finalize();
        return outputFilePath;
    } catch (error) {
        console.error('Packaging failed:', error);
        throw error;
    } finally {
        // Clean up temporary directory if it was created
        if (tempProcessingDir) {
            fs.rm(tempProcessingDir, { recursive: true, force: true }, (err) => {
                if (err) console.error("Failed to remove temp dir:", err);
            });
        }
    }
}

// --- App Lifecycle ---

app.whenReady().then(() => {
    createWindow();

    // --- Auto-Updater ---
    // Check for updates after the window is created
    autoUpdater.checkForUpdates(); // Force check for testing

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
ipcMain.handle('select-folder', async (event, initialPath = null) => { // Added initialPath parameter
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        defaultPath: initialPath || app.getPath('home') // Use initialPath or user's home directory
    });
    if (result.canceled) {
        return null;
    } else {
        return result.filePaths[0];
    }
});

// Show save file dialog
ipcMain.handle('show-save-dialog', async (event, defaultPath) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultPath,
        filters: [
            { name: 'Minecraft Add-on', extensions: ['mcpack', 'mcaddon'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    if (result.canceled) {
        return null;
    } else {
        return result.filePath;
    }
});

// Move file
ipcMain.handle('move-file', async (event, sourcePath, destinationPath) => {
    try {
        await copyFileAsync(sourcePath, destinationPath);
        await unlinkAsync(sourcePath); // Delete the original file
        return { success: true, message: 'File moved successfully.' };
    } catch (error) {
        console.error('Failed to move file:', error);
        return { success: false, error: error.message };
    }
});


// Obfuscate code
ipcMain.handle('obfuscate-code', async (event, data) => {
    try {
        const { inputPath, outputPath, options } = data;
        await processDirectory(inputPath, outputPath, {
            obfuscationOptions: options,
            removeComments: false, // Not exposed in obfuscator tab directly for now
            minifyJson: false,
            compressImages: false
        });
        return { success: true, message: 'Obfuscation successful' };
    } catch (error) {
        return { success: false, error: error.message }; // Return error.message for better detail
    }
});

// Package addon
ipcMain.handle('package-addon', async (event, data) => {
    try {
        const { behaviorPackPath, resourcePackPath, packName, obfuscationOptions, removeCommentsPackagedCode, minifyJsonFiles, compressImages } = data;
        const tempOutputDir = app.getPath('temp'); // Use temp directory for initial package creation

        const processingOptions = {
            obfuscationOptions: obfuscationOptions,
            removeComments: removeCommentsPackagedCode,
            minifyJson: minifyJsonFiles,
            compressImages: compressImages
        };

        const packagedFilePath = await packageAddon(
            { behaviorPackPath, resourcePackPath },
            tempOutputDir,
            packName, // Pass the packName here
            processingOptions
        );

        return { success: true, message: 'Add-on packaged successfully!', filePath: packagedFilePath };
    } catch (error) {
        return { success: false, error: error.message }; // Return error.message for better detail
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
    // Always check for updates regardless of NODE_ENV for testing/debugging purposes.
    autoUpdater.checkForUpdates(); 
    return { message: 'Checking for updates...' }; // Return immediate feedback
});

/**
 * IPC handler to trigger the application restart and installation of the downloaded update.
 */
ipcMain.handle('restart-app', () => {
    autoUpdater.quitAndInstall();
});

// --- Auto-Updater Events (Modified) ---

autoUpdater.on('update-available', async (info) => {
    log.info('Update available:', info);
    // Ask the user if they want to download the update
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available. Do you want to download and install it?`,
        buttons: ['Yes', 'No']
    });

    if (result.response === 0) { // User clicked 'Yes'
        // Send update_available and changelog to the main window
        mainWindow.webContents.send('update_available');
        mainWindow.webContents.send('update-changelog', info.releaseNotes || 'No release notes available.');
        autoUpdater.downloadUpdate(); // Start downloading the update
    } else {
        // User clicked 'No', hide the update section in the renderer
        mainWindow.webContents.send('update-download-cancelled');
    }
});

autoUpdater.on('download-progress', (progressObj) => {
    log.info('Download progress:', progressObj);
    // Send download progress to the main window
    mainWindow.webContents.send('download-progress', progressObj.percent);
});

autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info);
    // Send update_downloaded event to the main window
    mainWindow.webContents.send('update_downloaded');
    // Show a dialog to the user in the main window asking to restart
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Downloaded',
        message: 'The update has been downloaded. Click "Restart Now" to apply it.',
        buttons: ['Restart Now', 'Later']
    }).then(result => {
        if (result.response === 0) { // User clicked 'Restart Now'
            autoUpdater.quitAndInstall();
        }
    });
});

autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
    // Send update_error to the main window
    mainWindow.webContents.send('update_error', err.message);
    // Also show a dialog for critical errors
    dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Update Error',
        message: `An error occurred during update: ${err.message}`
    });
});
