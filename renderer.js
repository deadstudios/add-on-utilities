// DOM Elements
const navButtons = document.querySelectorAll('.nav-btn');
const contentSections = document.querySelectorAll('.content-section');
const actionCards = document.querySelectorAll('.action-card');
const quickActionCards = document.querySelectorAll('.quick-actions .action-card');

// File selection elements
const selectInputBtn = document.getElementById('select-input');
const selectOutputBtn = document.getElementById('select-output');
const selectBpBtn = document.getElementById('select-bp');
const selectRpBtn = document.getElementById('select-rp');
const inputPath = document.getElementById('input-path');
const outputPath = document.getElementById('output-path');
const bpPath = document.getElementById('bp-path');
const rpPath = document.getElementById('rp-path');
const checkUpdatesBtn = document.getElementById('check-updates-btn');

// Form elements
const packName = document.getElementById('pack-name');
const packVersion = document.getElementById('pack-version');
const isBeta = document.getElementById('is-beta');

// Buttons
const obfuscateBtn = document.getElementById('obfuscate-btn');
const packageBtn = document.getElementById('package-btn');

// Progress elements
const obfuscationProgress = document.getElementById('obfuscation-progress');
const progressText = document.getElementById('progress-text');
const progressCount = document.getElementById('progress-count');
const progressFill = document.getElementById('progress-fill');
const currentFile = document.getElementById('current-file');

const packageProgress = document.getElementById('package-progress');
const packageText = document.getElementById('package-text');
const packageCount = document.getElementById('package-count');
const packageFill = document.getElementById('package-fill');
const packageFile = document.getElementById('package-file');

// Modals
const successModal = document.getElementById('success-modal');
const errorModal = document.getElementById('error-modal');
const successMessage = document.getElementById('success-message');
const errorMessage = document.getElementById('error-message');
const modalCloseButtons = document.querySelectorAll('.modal-close, .modal-ok');
const statusText = document.getElementById('status-text');
checkUpdatesBtn.addEventListener('click', async () => {
    // Disable the button and change its text to indicate checking
    checkUpdatesBtn.disabled = true;
    checkUpdatesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
    updateStatus('Checking for updates...'); // Update status bar text

    try {
        // Call the checkForUpdates function in main.js
        const result = await window.electron.checkForUpdates();

        if (result.updateAvailable) {
            showSuccess(`Update available: v${result.version}`);
            // Here, you might want to show a dialog to the user
            // asking if they want to download and install the update
        } else {
            showSuccess('You have the latest version');
        }
    } catch (error) {
        showError(error.message);
    } finally {
        // Re-enable the button and reset its text
        checkUpdatesBtn.disabled = false;
        checkUpdatesBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Check Updates';
        updateStatus('Ready'); // Reset status bar text
    }
});

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Set initial status
    updateStatus('Ready');
});

// Navigation functionality
navButtons.forEach(button => {
    button.addEventListener('click', () => {
        const sectionId = button.getAttribute('data-section');
        
        // Update active button
        navButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Show corresponding section
        contentSections.forEach(section => {
            section.classList.remove('active');
            if (section.id === sectionId) {
                section.classList.add('active');
            }
        });
    });
});



// Quick action cards (on dashboard)
quickActionCards.forEach(card => {
    card.addEventListener('click', () => {
        const sectionId = card.getAttribute('data-section');
        
        // Find and click the corresponding nav button
        navButtons.forEach(button => {
            if (button.getAttribute('data-section') === sectionId) {
                button.click();
            }
        });
    });
});

// File selection handlers
selectInputBtn.addEventListener('click', async () => {
    const path = await window.electron.selectFolder();
    if (path) {
        inputPath.value = path;
    }
});

selectOutputBtn.addEventListener('click', async () => {
    const path = await window.electron.selectFolder();
    if (path) {
        outputPath.value = path;
    }
});

selectBpBtn.addEventListener('click', async () => {
    const path = await window.electron.selectPackFolder();
    if (path) {
        bpPath.value = path;
    }
});

selectRpBtn.addEventListener('click', async () => {
    const path = await window.electron.selectPackFolder();
    if (path) {
        rpPath.value = path;
    }
});

// Obfuscation form submission
obfuscateBtn.addEventListener('click', async () => {
    if (!inputPath.value || !outputPath.value) {
        showError('Please select both input and output folders');
        return;
    }

    // Get obfuscation options from checkboxes
    const obfuscationOptions = {
        enabled: document.getElementById('enable-obfuscation').checked,
        compact: document.getElementById('compact-code').checked,
        stringArray: document.getElementById('string-array').checked,
        deadCodeInjection: document.getElementById('dead-code-injection').checked,
        controlFlowFlattening: document.getElementById('control-flow').checked,
        debugProtection: document.getElementById('debug-protection').checked,
        disableConsoleOutput: document.getElementById('disable-console').checked
    };

    const removeComments = document.getElementById('remove-comments').checked;

    // Show progress bar
    obfuscationProgress.style.display = 'block';
    progressFill.style.width = '0%';
    progressCount.textContent = '0 / 0';
    currentFile.textContent = '';
    updateStatus('Obfuscating scripts...');

    // Disable button during processing
    obfuscateBtn.disabled = true;
    obfuscateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        const result = await window.electron.obfuscateScripts({
            inputPath: inputPath.value,
            outputPath: outputPath.value,
            obfuscationOptions,
            removeComments
        });

        if (result.success) {
            showSuccess(`Successfully obfuscated ${result.processedFiles} files`);
        } else {
            showError(result.message);
        }
    } catch (error) {
        showError(error.message);
    } finally {
        obfuscateBtn.disabled = false;
        obfuscateBtn.innerHTML = '<i class="fas fa-lock"></i> Start Obfuscation';
        updateStatus('Ready');
    }
});

// Package form submission
packageBtn.addEventListener('click', async () => {
    if (!bpPath.value) {
        showError('Please select at least a behavior pack folder');
        return;
    }

    if (!packName.value || !packVersion.value) {
        showError('Please enter a pack name and version');
        return;
    }

    const packPaths = [bpPath.value];
    if (rpPath.value) {
        packPaths.push(rpPath.value);
    }

    // Show progress bar
    packageProgress.style.display = 'block';
    packageFill.style.width = '0%';
    packageCount.textContent = '0 files';
    packageFile.textContent = '';
    updateStatus('Creating .mcaddon file...');

    // Disable button during processing
    packageBtn.disabled = true;
    packageBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Packaging...';

    try {
        const result = await window.electron.createMcaddon({
            packPaths,
            outputPath: path.join(__dirname, 'package_dist'),
            packName: packName.value,
            version: packVersion.value,
            isBeta: isBeta.checked
        });

        if (result.success) {
            showSuccess(result.message);
        } else {
            showError(result.message);
        }
    } catch (error) {
        showError(error.message);
    } finally {
        packageBtn.disabled = false;
        packageBtn.innerHTML = '<i class="fas fa-box"></i> Create .mcaddon';
        updateStatus('Ready');
    }
});

// Progress updates from main process
window.electron.onProgressUpdate(({ current, total, fileName }) => {
    const percent = Math.round((current / total) * 100);
    progressFill.style.width = `${percent}%`;
    progressCount.textContent = `${current} / ${total}`;
    currentFile.textContent = fileName;
});

window.electron.onPackageProgress(({ fileCount, currentFile }) => {
    packageFill.style.width = `${Math.min(100, fileCount / 10)}%`; // Simple progress indicator
    packageCount.textContent = `${fileCount} files`;
    packageFile.textContent = currentFile;
});

// Modal handling
modalCloseButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        successModal.style.display = 'none';
        errorModal.style.display = 'none';
    });
});

// Also add click event to close modals when clicking outside the content
[successModal, errorModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});
// Helper functions
function showSuccess(message) {
    successMessage.textContent = message;
    successModal.style.display = 'flex';
}

function showError(message) {
    errorMessage.textContent = message;
    errorModal.style.display = 'flex';
}

function updateStatus(message) {
    statusText.textContent = message;
}

ipcMain.handle('check-for-updates', async () => {
    try {
        const result = await updateChecker.checkForUpdates();
        return result; // Send the update check result back to the renderer
    } catch (error) {
        return { error: true, message: error.message };
    }
});

// Keep this at the bottom with other window.electron definitions
window.electron = {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    selectPackFolder: () => ipcRenderer.invoke('select-pack-folder'),
    obfuscateScripts: (options) => ipcRenderer.invoke('obfuscate-scripts', options),
    createMcaddon: (options) => ipcRenderer.invoke('create-mcaddon', options),
    onProgressUpdate: (callback) => ipcRenderer.on('progress-update', (event, data) => callback(data)),
    onPackageProgress: (callback) => ipcRenderer.on('package-progress', (event, data) => callback(data))
};