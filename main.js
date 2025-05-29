// main.js (Electron Main Process)
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const JavaScriptObfuscator = require('javascript-obfuscator');
const archiver = require('archiver');
const { promisify } = require('util');
// Import autoUpdater from electron-updater
const { autoUpdater } = require('electron-updater');

// Promisify fs methods for easier async/await usage
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const copyFileAsync = promisify(fs.copyFile);

let mainWindow; // Declare mainWindow globally so it can be accessed by autoUpdater events

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
        icon: path.join(__dirname, 'icon.png') // Optional: Add an application icon
    });

    // Load the index.html file into the window
    mainWindow.loadFile('index.html');

    // Open the DevTools (optional, for development and debugging)
    // mainWindow.webContents.openDevTools();
}

// --- Electron-Updater Configuration and Event Handling ---

// Set the autoUpdater feed URL (GitHub releases)
// This should point to your GitHub repository where releases are published.
// electron-updater will automatically look for `latest.yml` (or `latest.json`) in your releases.
autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'deadstudios',
    repo: 'add-on-utilities'
});

// Optional: Log autoUpdater events for debugging
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

// Event: An update is available.
autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version ${info.version} is available! Downloading now...`,
        buttons: ['OK']
    });
    // Optionally, send a message to the renderer process to update UI
    mainWindow.webContents.send('update_available');
});

// Event: No update available.
autoUpdater.on('update-not-available', (info) => {
    console.log(`No update available. Current version: ${app.getVersion()}, Latest checked: ${info.version}`);
    // Optionally, send a message to the renderer process
    // mainWindow.webContents.send('update_not_available');
});

// Event: Update has been downloaded.
autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Downloaded',
        message: `Update ${info.version} downloaded and ready to be installed. It will be installed on quit.`,
        buttons: ['Install & Restart', 'Later']
    }).then((result) => {
        if (result.response === 0) { // 'Install & Restart' button
            autoUpdater.quitAndInstall();
        }
    });
    // Optionally, send a message to the renderer process to update UI
    mainWindow.webContents.send('update_downloaded');
});

// Event: An error occurred during update process.
autoUpdater.on('error', (err) => {
    console.error('Error during auto update:', err);
    dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Update Error',
        message: `Error checking for updates: ${err.message}`,
        buttons: ['OK']
    });
    // Optionally, send a message to the renderer process
    mainWindow.webContents.send('update_error', err.message);
});

// When the Electron app is ready, create the window
app.whenReady().then(async () => {
    createWindow();
    // Log the application version to the main process console for debugging the credits section
    console.log(`App Version: ${app.getVersion()}`);

    // Perform update check immediately after the window is created
    console.log('Checking for updates on app startup...');
    autoUpdater.checkForUpdatesAndNotify(); // This triggers the update flow

    // On macOS, activate the app when the dock icon is clicked and no windows are open
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit the app when all windows are closed (except on macOS where applications typically stay open)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// --- IPC Main Handlers (Communication with Renderer Process) ---

/**
 * Handles requests from the renderer process to show a native message box.
 * @param {Electron.IpcMainEvent} event - The IPC event.
 * @param {Electron.MessageBoxOptions} options - Options for the message box.
 * @returns {Promise<Electron.MessageBoxReturnValue>} - The result of the message box.
 */
ipcMain.handle('show-message-box', async (event, options) => {
    const focusedWindow = BrowserWindow.fromWebContents(event.sender);
    return await dialog.showMessageBox(focusedWindow, options);
});

/**
 * Handles requests from the renderer process to get the application version.
 * @returns {string} The application version from package.json.
 */
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

/**
 * Handles requests from the renderer process to open a native folder selection dialog.
 * @param {Electron.IpcMainEvent} event - The IPC event.
 * @returns {Promise<string|null>} The selected folder path, or null if cancelled.
 */
ipcMain.handle('select-folder', async (event) => {
    const focusedWindow = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(focusedWindow, {
        properties: ['openDirectory'] // Allow only directory selection
    });
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0]; // Return the first selected folder path
    }
    return null; // Return null if the dialog was cancelled
});

/**
 * Removes comments from JavaScript code.
 * This function is adapted from the provided bot.js logic to ensure consistency.
 * It handles single-line (//) and multi-line (/* *) comments,
 * while being careful not to remove comments within string literals.
 * @param {string} code - The JavaScript code string.
 * @returns {string} The code with comments removed.
 */
function removeComments(code) {
    // First pass: Remove single-line comments that are on their own line or at the start of a line.
    // This regex tries to preserve leading whitespace to maintain indentation.
    code = code.replace(/^(\s*)(\/\/.*?)$/gm, (match, whitespace, comment) => {
        return whitespace; // Keep leading whitespace to preserve indentation
    });

    let result = '';
    let inString = false; // Flag to track if currently inside a string literal
    let stringChar = ''; // Stores the quote character ('', "", or ``) that started the current string
    let inMultiLineComment = false; // Flag to track if currently inside a multi-line comment

    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        const nextChar = code[i + 1] || ''; // Lookahead character
        const prevChar = code[i - 1] || ''; // Lookbehind character (for escape sequences)

        // If not inside a comment or string
        if (!inMultiLineComment && !inString) {
            // Check for start of a string literal
            if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
                inString = true;
                stringChar = char;
                result += char; // Append the quote character to the result
            }
            // Check for start of a multi-line comment (/*)
            else if (char === '/' && nextChar === '*') {
                inMultiLineComment = true;
                i++; // Skip the '*' character as it's part of the comment start
            }
            // Check for start of a single-line comment (//)
            // This is a fallback/additional check, as the regex already handles many cases.
            else if (char === '/' && nextChar === '/') {
                // Consume characters until a newline is found
                while (i < code.length && code[i] !== '\n') {
                    i++;
                }
                if (i < code.length) {
                    result += code[i]; // Append the newline character to preserve line breaks
                }
            }
            // If it's a regular character and not part of any special sequence, append it
            else {
                result += char;
            }
        }
        // If currently inside a string literal
        else if (inString) {
            result += char; // Always append characters when inside a string
            // Check for end of the string literal (matching quote, not escaped)
            if (char === stringChar && prevChar !== '\\') {
                inString = false;
                stringChar = '';
            }
        }
        // If currently inside a multi-line comment
        else if (inMultiLineComment) {
            // Check for end of the multi-line comment (*/)
            if (char === '*' && nextChar === '/') {
                inMultiLineComment = false;
                i++; // Skip the '/' character as it's part of the comment end
            }
        }
    }

    // Post-processing: Remove excessive blank lines and trim leading/trailing whitespace.
    // Replaces three or more consecutive blank lines with two blank lines.
    // Removes blank lines at the very beginning of the string or block.
    return result
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .replace(/^\s*\n/gm, '')
        .trim();
}

/**
 * Recursively processes JavaScript files within a given input directory,
 * removes comments, obfuscates them, and saves them to an output directory,
 * maintaining the original folder structure. Non-JS files are copied directly.
 * @param {string} inputDir - The source directory containing JavaScript files.
 * @param {string} outputDir - The destination directory for processed files.
 * @param {object} obfuscationOptions - Options object for `javascript-obfuscator`.
 */
async function processJsFiles(inputDir, outputDir, obfuscationOptions) {
    // Ensure the output directory exists, create it recursively if it doesn't
    await mkdirAsync(outputDir, { recursive: true });
    // Read all items (files and directories) in the current input directory
    const items = await readdirAsync(inputDir);

    for (const item of items) {
        const inputPath = path.join(inputDir, item);
        const outputPath = path.join(outputDir, item);
        const stats = await statAsync(inputPath); // Get file/directory stats

        if (stats.isDirectory()) {
            // If it's a directory, recursively call this function for the subdirectory
            await processJsFiles(inputPath, outputPath, obfuscationOptions);
        } else if (stats.isFile() && item.toLowerCase().endsWith('.js')) {
            // If it's a JavaScript file
            try {
                let code = await readFileAsync(inputPath, 'utf8'); // Read file content

                // 1. Remove comments from the code
                code = removeComments(code);

                // 2. Obfuscate the code using the provided options
                const obfuscationResult = JavaScriptObfuscator.obfuscate(code, obfuscationOptions);
                const obfuscatedCode = obfuscationResult.getObfuscatedCode();

                // Write the obfuscated code to the output file
                await writeFileAsync(outputPath, obfuscatedCode, 'utf8');
                console.log(`Processed and obfuscated: ${item}`);
            } catch (error) {
                console.error(`Error processing ${item}: ${error.message}`);
                // If obfuscation fails for a specific file, copy the original (comment-stripped) version instead
                try {
                    let code = await readFileAsync(inputPath, 'utf8');
                    code = removeComments(code); // Ensure comments are still removed even if obfuscation failed
                    await writeFileAsync(outputPath, code, 'utf8');
                    console.warn(`Obfuscation failed for ${item}, copied comment-stripped version instead.`);
                } catch (copyError) {
                    console.error(`Failed to copy comment-stripped version of ${item}: ${copyError.message}`);
                }
            }
        } else if (stats.isFile()) {
            // If it's any other type of file (non-JS), copy it directly to the output
            await copyFileAsync(inputPath, outputPath);
            console.log(`Copied non-JS file: ${item}`);
        }
    }
}

/**
 * IPC handler for the standalone JavaScript obfuscator feature.
 * Takes an input folder, an output folder, and obfuscation options.
 * @param {Electron.IpcMainEvent} event - The IPC event.
 * @param {object} params - Parameters including inputFolderPath, outputFolderPath, and options.
 * @returns {Promise<object>} An object indicating success or failure and a message/error.
 */
ipcMain.handle('obfuscate-code', async (event, { inputFolderPath, outputFolderPath, options }) => {
    try {
        // Validate that both input and output folders are selected
        if (!inputFolderPath || !outputFolderPath) {
            return { success: false, error: 'Input and output folders must be selected.' };
        }

        // Check if the output folder already exists and prompt the user for overwrite confirmation
        if (fs.existsSync(outputFolderPath)) {
            const response = await dialog.showMessageBox(BrowserWindow.fromWebContents(event.sender), {
                type: 'question',
                buttons: ['Yes', 'No'],
                title: 'Output Folder Exists',
                message: `The output folder "${path.basename(outputFolderPath)}" already exists. Do you want to overwrite its contents?`,
                detail: 'Existing files with the same name will be replaced.'
            });
            if (response.response !== 0) { // If user selects 'No'
                return { success: false, error: 'Operation cancelled by user.' };
            } else {
                // If user selects 'Yes', remove the existing output folder to ensure a clean slate
                fs.rmSync(outputFolderPath, { recursive: true, force: true });
            }
        }

        // Call the recursive function to process and obfuscate JS files
        await processJsFiles(inputFolderPath, outputFolderPath, {
            compact: options.compactCode,
            controlFlowFlattening: options.controlFlowFlattening,
            deadCodeInjection: options.deadCodeInjection,
            debugProtection: options.debugProtection,
            disableConsoleOutput: options.disableConsoleOutput,
            stringArray: options.stringArray,
            stringArrayShuffle: options.stringArrayShuffle,
            stringArrayThreshold: options.stringArrayThreshold
        });

        return { success: true, message: 'Obfuscation complete!' };
    } catch (error) {
        console.error('Obfuscation process error:', error);
        return { success: false, error: error.message };
    }
});

/**
 * IPC handler for the Add-on Packager feature.
 * Takes paths to Behavior Pack and Resource Pack folders, an option to obfuscate,
 * and obfuscation options. It creates a .zip archive of the packs.
 * @param {Electron.IpcMainEvent} event - The IPC event.
 * @param {object} params - Parameters including bpFolderPath, rpFolderPath, obfuscatePackagedCode, and obfuscationOptions.
 * @returns {Promise<object>} An object indicating success or failure and a message/error.
 */
ipcMain.handle('package-addon', async (event, { bpFolderPath, rpFolderPath, obfuscatePackagedCode, obfuscationOptions }) => {
    try {
        // Ensure at least one pack folder is selected
        if (!bpFolderPath && !rpFolderPath) {
            return { success: false, error: 'At least one pack folder (Behavior or Resource) must be selected.' };
        }

        // Create a temporary directory for staging the packs before zipping
        const tempDir = path.join(app.getPath('temp'), `addon_package_temp_${Date.now()}`);
        // Define the output directory (e.g., Desktop) and file name for the final .zip
        const outputDir = path.join(app.getPath('home'), 'Desktop');
        const outputFileName = `addon_package_${Date.now()}.zip`;
        const outputPath = path.join(outputDir, outputFileName);

        await mkdirAsync(tempDir, { recursive: true }); // Create the temporary staging directory

        // --- Process Behavior Pack (BP) ---
        if (bpFolderPath) {
            const tempBpPath = path.join(tempDir, 'BP'); // Destination for the BP in temp folder
            if (obfuscatePackagedCode) {
                console.log('Obfuscating Behavior Pack scripts...');
                const bpScriptsPath = path.join(bpFolderPath, 'scripts'); // Original scripts folder in BP
                const tempBpScriptsPath = path.join(tempBpPath, 'scripts'); // Destination for obfuscated scripts

                // Check if the scripts folder actually exists in the Behavior Pack
                if (fs.existsSync(bpScriptsPath)) {
                    // Process (remove comments and obfuscate) JS files in the scripts folder
                    await processJsFiles(bpScriptsPath, tempBpScriptsPath, obfuscationOptions);
                    // Copy other non-script files from the BP, excluding the 'scripts' folder itself
                    await copyDirectoryRecursive(bpFolderPath, tempBpPath, ['scripts']);
                } else {
                    // If no scripts folder, just copy the entire BP without obfuscation
                    await copyDirectoryRecursive(bpFolderPath, tempBpPath);
                    console.warn('Behavior Pack scripts folder not found, skipping obfuscation for BP.');
                }
            } else {
                console.log('Copying Behavior Pack without obfuscation...');
                await copyDirectoryRecursive(bpFolderPath, tempBpPath); // Copy entire BP directly
            }
        }

        // --- Process Resource Pack (RP) ---
        if (rpFolderPath) {
            const tempRpPath = path.join(tempDir, 'RP'); // Destination for the RP in temp folder
            console.log('Copying Resource Pack...');
            await copyDirectoryRecursive(rpFolderPath, tempRpPath); // Copy entire RP directly
        }

        // --- Create the .zip archive ---
        const output = fs.createWriteStream(outputPath); // Create a write stream for the output .zip file
        const archive = archiver('zip', {
            zlib: { level: 9 } // Set compression level (9 is best compression)
        });

        // Return a Promise to handle the asynchronous archiving process
        return new Promise((resolve, reject) => {
            // Event listener for when the archive stream closes
            output.on('close', () => {
                console.log(`Archiver finalized. Total bytes: ${archive.pointer()}`);
                fs.rmSync(tempDir, { recursive: true, force: true }); // Clean up the temporary directory
                resolve({ success: true, message: `Add-on packaged successfully! Saved to: ${outputPath}` });
            });

            // Event listener for archiver errors
            archive.on('error', (err) => {
                console.error('Archiver error:', err);
                fs.rmSync(tempDir, { recursive: true, force: true }); // Clean up on error
                reject({ success: false, error: `Packaging failed: ${err.message}` });
            });

            archive.pipe(output); // Pipe the archiver output to the file write stream

            // Append the processed Behavior Pack to the archive
            if (bpFolderPath) {
                archive.directory(path.join(tempDir, 'BP'), 'BP'); // Add the staged BP folder to the root of the zip as 'BP'
            }
            // Append the processed Resource Pack to the archive
            if (rpFolderPath) {
                archive.directory(path.join(tempDir, 'RP'), 'RP'); // Add the staged RP folder to the root of the zip as 'RP'
            }

            archive.finalize(); // Finalize the archive (no more files will be added)
        });

    } catch (error) {
        console.error('Packager process error:', error);
        return { success: false, error: error.message };
    }
});

/**
 * Recursively copies a directory from source to destination.
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

/**
 * IPC handler for checking for updates by fetching the latest release from GitHub.
 * This handler now simply triggers the autoUpdater's check.
 */
ipcMain.handle('check-for-updates', async () => {
    console.log('Manual update check triggered by renderer.');
    autoUpdater.checkForUpdatesAndNotify();
    return { message: 'Checking for updates...' }; // Return immediate feedback
});

/**
 * IPC handler to trigger the application restart and installation of the downloaded update.
 */
ipcMain.handle('restart_app', () => {
    autoUpdater.quitAndInstall();
});