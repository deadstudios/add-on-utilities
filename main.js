const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const JavaScriptObfuscator = require('javascript-obfuscator');
const archiver = require('archiver');
const yauzl = require('yauzl');
const UpdateChecker = require('./updater');
let mainWindow;

const GITHUB_REPO = 'deadstudios/addon-utilities'; // Replace with your repo
const CURRENT_VERSION = '1.0.0'; // Replace with your app's version
let updateChecker;

function initializeUpdateChecker() {
    updateChecker = new UpdateChecker(GITHUB_REPO, CURRENT_VERSION);
}


function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        titleBarStyle: 'default',
        show: false,
        backgroundColor: '#1a1a1a',
        icon: path.join(__dirname, 'assets/icon.png')
    });

    mainWindow.loadFile('index.html');
    
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Remove menu bar
    mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
    createWindow();
    initializeUpdateChecker(); // Initialize after the window is created

    // Check for updates on startup (optional)
    setTimeout(async () => {
        const updateInfo = await updateChecker.checkForUpdates();
        if (updateInfo.available) {
            showUpdateDialog(updateInfo);  //  You'll need to define this function
        }
    }, 3000); // 3-second delay after startup
});


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Scripts Folder'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

ipcMain.handle('select-pack-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Behavior Pack or Resource Pack Folder'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

ipcMain.handle('obfuscate-scripts', async (event, options) => {
    try {
        const { inputPath, outputPath, obfuscationOptions, removeComments } = options;
        
        // Create output directory if it doesn't exist
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        let processedFiles = 0;
        let totalFiles = 0;

        // Count total files first
        const countFiles = (dir) => {
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    countFiles(fullPath);
                } else if (isScriptFile(item)) {
                    totalFiles++;
                }
            }
        };

        countFiles(inputPath);

        // Process files
        const processDirectory = async (srcPath, destPath) => {
            if (!fs.existsSync(destPath)) {
                fs.mkdirSync(destPath, { recursive: true });
            }

            const items = fs.readdirSync(srcPath);
            
            for (const item of items) {
                const srcFile = path.join(srcPath, item);
                const destFile = path.join(destPath, item);
                const stat = fs.statSync(srcFile);

                if (stat.isDirectory()) {
                    await processDirectory(srcFile, destFile);
                } else if (isScriptFile(item)) {
                    await processScriptFile(srcFile, destFile, obfuscationOptions, removeComments);
                    processedFiles++;
                    event.sender.send('progress-update', {
                        current: processedFiles,
                        total: totalFiles,
                        fileName: item
                    });
                } else {
                    // Copy non-script files as-is
                    fs.copyFileSync(srcFile, destFile);
                }
            }
        };

        await processDirectory(inputPath, outputPath);
        
        return {
            success: true,
            message: `Successfully processed ${processedFiles} script files`,
            processedFiles
        };

    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
});

ipcMain.handle('create-mcaddon', async (event, options) => {
    try {
        const { packPaths, outputPath, packName, version, isBeta } = options;
        
        // Create package_dist directory if it doesn't exist
        const packageDistPath = path.join(__dirname, 'package_dist');
        if (!fs.existsSync(packageDistPath)) {
            fs.mkdirSync(packageDistPath, { recursive: true });
        }

        const fileName = `${packName}_v${version}${isBeta ? '-BETA' : ''}.mcaddon`;
        const fullOutputPath = path.join(packageDistPath, fileName);
        
        const output = fs.createWriteStream(fullOutputPath);
        const archive = archiver('zip', { 
            zlib: { level: 9 },
            forceLocalTime: true 
        });

        let fileCount = 0;

        return new Promise((resolve, reject) => {
            output.on('close', () => {
                const fileSize = fs.statSync(fullOutputPath).size;
                const fileSizeMB = Math.round(fileSize / 1024 / 1024 * 100) / 100;
                
                resolve({
                    success: true,
                    message: `Created ${fileName} (${fileSizeMB} MB)`,
                    filePath: fullOutputPath,
                    fileSize: fileSizeMB
                });
            });

            archive.on('error', reject);
            output.on('error', reject);

            archive.on('entry', (entry) => {
                fileCount++;
                event.sender.send('package-progress', {
                    fileCount,
                    currentFile: entry.name
                });
            });

            archive.pipe(output);

            // Add packs to archive
            packPaths.forEach((packPath, index) => {
                const packName = path.basename(packPath);
                const isRP = packName.toLowerCase().includes('rp') || packName.toLowerCase().includes('resource');
                const folderName = isRP ? 'RP' : 'BP';
                
                archive.directory(packPath, folderName);
            });

            archive.finalize();
        });

    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
});

// Helper functions
function isScriptFile(filename) {
    const scriptExtensions = ['.js', '.ts', '.mjs'];
    return scriptExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

async function processScriptFile(inputPath, outputPath, obfuscationOptions, removeComments) {
    let content = fs.readFileSync(inputPath, 'utf8');
    
    // Remove comments if requested
    if (removeComments) {
        content = removeComments(content);
    }
    
    // Obfuscate if requested
    if (obfuscationOptions && obfuscationOptions.enabled) {
        const obfuscationResult = JavaScriptObfuscator.obfuscate(content, {
            compact: obfuscationOptions.compact || true,
            controlFlowFlattening: obfuscationOptions.controlFlowFlattening || false,
            deadCodeInjection: obfuscationOptions.deadCodeInjection || false,
            debugProtection: obfuscationOptions.debugProtection || false,
            disableConsoleOutput: obfuscationOptions.disableConsoleOutput || true,
            stringArray: obfuscationOptions.stringArray || true,
            stringArrayShuffle: obfuscationOptions.stringArrayShuffle || true,
            stringArrayThreshold: obfuscationOptions.stringArrayThreshold || 0.5
        });
        
        content = obfuscationResult.getObfuscatedCode();
    }
    
    fs.writeFileSync(outputPath, content, 'utf8');
}

function removeComments(code) {
    // Remove single-line comments
    code = code.replace(/^(\s*)(\/\/.*?)$/gm, (match, whitespace, comment) => {
        return whitespace;
    });
    
    let result = '';
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let commentType = '';
    
    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        const nextChar = code[i + 1] || '';
        const prevChar = code[i - 1] || '';
        
        if (!inComment && !inString) {
            if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
                inString = true;
                stringChar = char;
                result += char;
            }
            else if (char === '/' && nextChar === '*') {
                inComment = true;
                commentType = 'multi';
                i++;
            }
            else if (char === '/' && nextChar === '/') {
                while (i < code.length && code[i] !== '\n') {
                    i++;
                }
                if (i < code.length) {
                    result += code[i];
                }
            }
            else {
                result += char;
            }
        }
        else if (inString) {
            result += char;
            if (char === stringChar && prevChar !== '\\') {
                inString = false;
                stringChar = '';
            }
        }
        else if (inComment && commentType === 'multi') {
            if (char === '*' && nextChar === '/') {
                inComment = false;
                commentType = '';
                i++;
            }
        }
    }

    return result
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .replace(/^\s*\n/gm, '')
        .trim();
}