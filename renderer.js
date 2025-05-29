// renderer.js (Electron Renderer Process)
// This script interacts with the DOM and communicates with the main process.

// Get references to main menu buttons and sections
const mainMenu = document.getElementById('main-menu');
const obfuscatorBtn = document.getElementById('obfuscator-btn');
const packagerBtn = document.getElementById('packager-btn');
const creditsBtn = document.getElementById('credits-btn');
const updaterBtn = document.getElementById('updater-btn');

const obfuscatorSection = document.getElementById('obfuscator-section');
const packagerSection = document.getElementById('packager-section');
const creditsSection = document.getElementById('credits-section');

// Obfuscator elements
const obfuscatorInputFolderBtn = document.getElementById('obfuscator-input-folder-btn');
const obfuscatorInputFolderPathSpan = document.getElementById('obfuscator-input-folder-path');
const obfuscatorOutputFolderBtn = document.getElementById('obfuscator-output-folder-btn');
const obfuscatorOutputFolderPathSpan = document.getElementById('obfuscator-output-folder-path');
const obfuscateCodeBtn = document.getElementById('obfuscate-code-btn');
const obfuscatorOutput = document.getElementById('obfuscator-output');
const backToMainObfuscator = document.getElementById('back-to-main-obfuscator');

const compactCodeCheckbox = document.getElementById('compactCode');
const controlFlowFlatteningCheckbox = document.getElementById('controlFlowFlattening');
const deadCodeInjectionCheckbox = document.getElementById('deadCodeInjection');
const debugProtectionCheckbox = document.getElementById('debugProtection');
const disableConsoleOutputCheckbox = document.getElementById('disableConsoleOutput');
const stringArrayCheckbox = document.getElementById('stringArray');
const stringArrayShuffleCheckbox = document.getElementById('stringArrayShuffle');
const stringArrayThresholdValueInput = document.getElementById('stringArrayThresholdValue');

// Packager elements
const bpFolderInputBtn = document.getElementById('bp-folder-input-btn');
const bpFolderPathSpan = document.getElementById('bp-folder-path');
const rpFolderInputBtn = document.getElementById('rp-folder-input-btn');
const rpFolderPathSpan = document.getElementById('rp-folder-path');
const obfuscatePackagedCodeCheckbox = document.getElementById('obfuscatePackagedCode');
const packageAddonBtn = document.getElementById('package-addon-btn');
const backToMainPackager = document.getElementById('back-to-main-packager');

// Credits elements
const backToMainCredits = document.getElementById('back-to-main-credits');
const appVersionSpan = document.getElementById('app-version');

// --- Debugging: Log elements to console on load ---
console.log('Renderer script loaded.');
console.log('mainMenu:', mainMenu);
console.log('obfuscatorBtn:', obfuscatorBtn);
console.log('packagerBtn:', packagerBtn);
console.log('creditsBtn:', creditsBtn);
console.log('updaterBtn:', updaterBtn);
console.log('obfuscatorSection:', obfuscatorSection);
console.log('packagerSection:', packagerSection);
console.log('creditsSection:', creditsSection);
console.log('appVersionSpan:', appVersionSpan);


/**
 * Hides all main sections and displays the specified section.
 * @param {HTMLElement} sectionToShow - The section element to display.
 */
function showSection(sectionToShow) {
    mainMenu.classList.add('hidden');
    obfuscatorSection.classList.add('hidden');
    packagerSection.classList.add('hidden');
    creditsSection.classList.add('hidden');

    sectionToShow.classList.remove('hidden');
}

/**
 * Hides all sections and displays the main menu.
 */
function showMainMenu() {
    mainMenu.classList.remove('hidden');
    obfuscatorSection.classList.add('hidden');
    packagerSection.classList.add('hidden');
    creditsSection.classList.add('hidden');
}

// Set initial values for obfuscator options based on common defaults or provided bot.js logic
compactCodeCheckbox.checked = true;
controlFlowFlatteningCheckbox.checked = false;
deadCodeInjectionCheckbox.checked = false;
debugProtectionCheckbox.checked = false;
disableConsoleOutputCheckbox.checked = true;
stringArrayCheckbox.checked = true;
stringArrayShuffleCheckbox.checked = true;
stringArrayThresholdValueInput.value = 0.5;

// Enable/disable the stringArrayThresholdValueInput based on the stringArrayCheckbox state
stringArrayCheckbox.addEventListener('change', () => {
    stringArrayThresholdValueInput.disabled = !stringArrayCheckbox.checked;
});
// Set initial disabled state on load
stringArrayThresholdValueInput.disabled = !stringArrayCheckbox.checked;


// --- Event Listeners for Main Menu Buttons ---

// Obfuscator button click handler
obfuscatorBtn.addEventListener('click', () => showSection(obfuscatorSection));

// Packager button click handler
packagerBtn.addEventListener('click', () => showSection(packagerSection));

// Credits button click handler: fetches and displays app version
creditsBtn.addEventListener('click', async () => {
    const version = await window.electronAPI.getAppVersion();
    appVersionSpan.textContent = version;
    showSection(creditsSection);
});

// Updater button click handler: triggers update check
updaterBtn.addEventListener('click', async () => {
    // Trigger the update check via IPC. The main process will handle dialogs.
    await window.electronAPI.checkForUpdates();
    // Provide immediate feedback to the user that the check is in progress
    await window.electronAPI.showMessageBox({
        type: 'info',
        title: 'Checking for Updates...',
        message: 'Checking for new releases. You will be notified if an update is available.'
    });
});


// --- Event Listeners for Back Buttons in sections ---
backToMainObfuscator.addEventListener('click', showMainMenu);
backToMainPackager.addEventListener('click', showMainMenu);
backToMainCredits.addEventListener('click', showMainMenu);

// --- Obfuscator Logic ---

// Event listener for selecting the input script folder for obfuscation
obfuscatorInputFolderBtn.addEventListener('click', async () => {
    const folderPath = await window.electronAPI.selectFolder();
    if (folderPath) {
        obfuscatorInputFolderPathSpan.textContent = folderPath;
    }
});

// Event listener for selecting the output folder for obfuscated scripts
obfuscatorOutputFolderBtn.addEventListener('click', async () => {
    const folderPath = await window.electronAPI.selectFolder();
    if (folderPath) {
        obfuscatorOutputFolderPathSpan.textContent = folderPath;
    }
});

// Event listener for the "Obfuscate Code" button
obfuscateCodeBtn.addEventListener('click', async () => {
    const inputFolderPath = obfuscatorInputFolderPathSpan.textContent;
    const outputFolderPath = obfuscatorOutputFolderPathSpan.textContent;

    // Validate that both input and output folders are selected
    if (!inputFolderPath || inputFolderPath === 'No folder selected.') {
        await window.electronAPI.showMessageBox({
            type: 'warning',
            title: 'Input Folder Required',
            message: 'Please select an input folder containing your JavaScript files.'
        });
        return;
    }
    if (!outputFolderPath || outputFolderPath === 'No folder selected.') {
        await window.electronAPI.showMessageBox({
            type: 'warning',
            title: 'Output Folder Required',
            message: 'Please select an output folder for the obfuscated files.'
        });
        return;
    }

    // Inform the user that obfuscation is in progress
    await window.electronAPI.showMessageBox({
        type: 'info',
        title: 'Obfuscation in Progress',
        message: 'Processing your JavaScript files. This might take a moment...'
    });

    // Gather all obfuscation options from the checkboxes and input field
    const obfuscationOptions = {
        compactCode: compactCodeCheckbox.checked,
        controlFlowFlattening: controlFlowFlatteningCheckbox.checked,
        deadCodeInjection: deadCodeInjectionCheckbox.checked,
        debugProtection: debugProtectionCheckbox.checked,
        disableConsoleOutput: disableConsoleOutputCheckbox.checked,
        stringArray: stringArrayCheckbox.checked,
        stringArrayShuffle: stringArrayShuffleCheckbox.checked,
        stringArrayThreshold: parseFloat(stringArrayThresholdValueInput.value) // Ensure it's a number
    };

    // Call the main process to perform the obfuscation
    const result = await window.electronAPI.obfuscateCode({
        inputFolderPath,
        outputFolderPath,
        options: obfuscationOptions
    });

    // Display the result of the obfuscation
    if (result.success) {
        obfuscatorOutput.value = result.message || 'Obfuscation complete. Check your output folder.';
        await window.electronAPI.showMessageBox({
            type: 'info',
            title: 'Obfuscation Complete',
            message: result.message || 'JavaScript files obfuscated successfully!'
        });
    } else {
        obfuscatorOutput.value = `Error: ${result.error}`;
        await window.electronAPI.showMessageBox({
            type: 'error',
            title: 'Obfuscation Error',
            message: `Failed to obfuscate files: ${result.error}`
        });
    }
});

// --- Add-on Packager Logic ---

// Event listener for selecting the Behavior Pack folder
bpFolderInputBtn.addEventListener('click', async () => {
    const folderPath = await window.electronAPI.selectFolder();
    if (folderPath) {
        bpFolderPathSpan.textContent = folderPath;
    }
});

// Event listener for selecting the Resource Pack folder
rpFolderInputBtn.addEventListener('click', async () => {
    const folderPath = await window.electronAPI.selectFolder();
    if (folderPath) {
        rpFolderPathSpan.textContent = folderPath;
    }
});

// Event listener for the "Package Add-on" button
packageAddonBtn.addEventListener('click', async () => {
    const bpFolderPath = bpFolderPathSpan.textContent;
    const rpFolderPath = rpFolderPathSpan.textContent;
    const obfuscatePackagedCode = obfuscatePackagedCodeCheckbox.checked;

    // Validate that at least one pack folder is selected
    if ((!bpFolderPath || bpFolderPath === 'No folder selected.') && (!rpFolderPath || rpFolderPath === 'No folder selected.')) {
        await window.electronAPI.showMessageBox({
            type: 'warning',
            title: 'Folders Required',
            message: 'Please select at least one pack folder (Behavior Pack or Resource Pack).'
        });
        return;
    }

    // Inform the user that packaging is in progress
    await window.electronAPI.showMessageBox({
        type: 'info',
        title: 'Packaging Add-on',
        message: 'Packaging your add-on. This might take a moment...'
    });

    // Gather obfuscation options to pass to the main process if obfuscation is requested
    const obfuscationOptions = {
        compactCode: compactCodeCheckbox.checked,
        controlFlowFlattening: controlFlowFlatteningCheckbox.checked,
        deadCodeInjection: deadCodeInjectionCheckbox.checked,
        debugProtection: debugProtectionCheckbox.checked,
        disableConsoleOutput: disableConsoleOutputCheckbox.checked,
        stringArray: stringArrayCheckbox.checked,
        stringArrayShuffle: stringArrayShuffleCheckbox.checked,
        stringArrayThreshold: parseFloat(stringArrayThresholdValueInput.value)
    };

    // Call the main process to package the add-on
    const result = await window.electronAPI.packageAddon({
        bpFolderPath: bpFolderPath === 'No folder selected.' ? null : bpFolderPath, // Pass null if not selected
        rpFolderPath: rpFolderPath === 'No folder selected.' ? null : rpFolderPath, // Pass null if not selected
        obfuscatePackagedCode,
        obfuscationOptions
    });

    // Display the result of the packaging
    if (result.success) {
        await window.electronAPI.showMessageBox({
            type: 'info',
            title: 'Packaging Complete',
            message: result.message
        });
    } else {
        await window.electronAPI.showMessageBox({
            type: 'error',
            title: 'Packaging Error',
            message: `Failed to package add-on: ${result.error}`
        });
    }
});

// --- Electron-Updater Renderer-side Event Listeners ---

// Listen for 'update_available' event from the main process
window.electronAPI.on('update_available', () => {
    console.log('Update available, download started...');
    // You could update a UI element here, e.g., show a "Downloading Update..." message
});

// Listen for 'update_downloaded' event from the main process
window.electronAPI.on('update_downloaded', async () => {
    const response = await window.electronAPI.showMessageBox({
        type: 'info',
        title: 'Update Ready!',
        message: 'A new version has been downloaded. Restart the application to apply the update.',
        buttons: ['Restart Now', 'Later']
    });

    if (response.response === 0) { // 'Restart Now' button clicked
        window.electronAPI.restartApp(); // Call the main process to quit and install
    }
});

// Listen for 'update_error' event from the main process
window.electronAPI.on('update_error', (errorMessage) => {
    console.error('Update error in renderer:', errorMessage);
    // You could display this error message in a more user-friendly way in the UI
    window.electronAPI.showMessageBox({
        type: 'error',
        title: 'Update Error',
        message: `An error occurred during update: ${errorMessage}`
    });
});

// Function to fetch and display the app version from package.json
async function displayAppVersion() {
    try {
        const version = await window.electronAPI.getAppVersion();
        const appVersionSpan = document.getElementById('app-version');
        if (appVersionSpan) {
            appVersionSpan.textContent = version;
        }
    } catch (error) {
        console.error('Failed to get app version:', error);
        // Optionally display an error message in the UI
    }
}

// Call displayAppVersion when the credits section is shown
creditsBtn.addEventListener('click', async () => {
    await displayAppVersion(); // Call the function here
    showSection(creditsSection);
});

// Also call it on startup, after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', displayAppVersion);