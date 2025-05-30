// renderer.js (Electron Renderer Process - Updated for browser compatibility)
// This script interacts with the DOM and communicates with the main process.
// Modifications have been made to gracefully handle environments where 'electronAPI' is not available.

// --- Global Check for Electron API ---
// This function will be used to guard Electron-specific API calls.
const isElectron = typeof window.electronAPI !== 'undefined';

if (!isElectron) {
    console.warn("Warning: 'electronAPI' is not available. Functionality dependent on Electron's IPC will not work.");
}

// Get references to main menu buttons and sections
const mainMenu = document.getElementById('main-menu');
const obfuscatorBtn = document.getElementById('obfuscator-btn');
const packagerBtn = document.getElementById('packager-btn');
const creditsBtn = document.getElementById('credits-btn');
const updaterBtn = document.getElementById('updater-btn'); // This is the 'Check Updates' button

const obfuscatorSection = document.getElementById('obfuscator-section');
const packagerSection = document.getElementById('packager-section');
const creditsSection = document.getElementById('credits-section');
const headerSection = document.getElementById('header-section'); // Get reference to the header section
const body = document.body; // Get reference to the body element

// Obfuscator elements
const obfuscatorInputFolderBtn = document.getElementById('obfuscator-input-folder-btn');
const obfuscatorInputFolderPathSpan = document.getElementById('obfuscator-input-folder-path');
const obfuscatorOutputFolderBtn = document.getElementById('obfuscator-output-folder-btn');
const obfuscatorOutputFolderPathSpan = document.getElementById('obfuscator-output-folder-path');
const obfuscateCodeBtn = document.getElementById('obfuscate-code-btn');
const backToMainObfuscator = document.getElementById('back-to-main-obfuscator');

const compactCodeCheckbox = document.getElementById('compactCode');
const controlFlowFlatteningCheckbox = document.getElementById('controlFlowFlattening');
const deadCodeInjectionCheckbox = document.getElementById('deadCodeInjection');
const debugProtectionCheckbox = document.getElementById('debugProtection');
const disableConsoleOutputCheckbox = document.getElementById('disableConsoleOutput');
const stringArrayCheckbox = document.getElementById('stringArray');
const stringArrayShuffleCheckbox = document.getElementById('stringArrayShuffle');
const stringArrayThresholdValueInput = document.getElementById('stringArrayThresholdValue');

// New collapsible elements
const toggleOptionsBtn = document.getElementById('toggle-options-btn');
const obfuscationOptionsContent = document.getElementById('obfuscation-options-content');
const toggleIcon = document.getElementById('toggle-icon');


// Packager elements
const bpFolderInputBtn = document.getElementById('bp-folder-input-btn');
const bpFolderPathSpan = document.getElementById('bp-folder-path');
const rpFolderInputBtn = document.getElementById('rp-folder-input-btn');
const rpFolderPathSpan = document.getElementById('rp-folder-path');
const packNameInput = document.getElementById('packNameInput'); // New: Pack Name Input
const obfuscatePackagedCodeCheckbox = document.getElementById('obfuscatePackagedCode');
const removeCommentsPackagedCodeCheckbox = document.getElementById('removeCommentsPackagedCode'); // New checkbox
const minifyJsonFilesCheckbox = document.getElementById('minifyJsonFiles'); // New checkbox
const compressImagesCheckbox = document.getElementById('compressImages'); // New checkbox
const packageAddonBtn = document.getElementById('package-addon-btn');
const backToMainPackager = document.getElementById('back-to-main-packager');

// Credits elements
const backToMainCredits = document.getElementById('back-to-main-credits');
const appVersionSpan = document.getElementById('app-version');

// --- New Update Section Elements ---
const updateInfoSection = document.getElementById('update-info-section');
const updateChangelog = document.getElementById('update-changelog');
const updateProgressBar = document.getElementById('update-progress-bar');
const updateProgressPercent = document.getElementById('update-progress-percent');
const updateEstimatedTime = document.getElementById('update-estimated-time');
const updateRestartBtn = document.getElementById('update-restart-btn');
const updateErrorMessage = document.getElementById('update-error-message');
const hideUpdateSectionBtn = document.getElementById('hide-update-section-btn');


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
console.log('headerSection:', headerSection); // Log the new header section
console.log('appVersionSpan:', appVersionSpan);
console.log('toggleOptionsBtn:', toggleOptionsBtn);
console.log('obfuscationOptionsContent:', obfuscationOptionsContent);
console.log('toggleIcon:', toggleIcon);
console.log('packNameInput:', packNameInput); // Log new input
console.log('removeCommentsPackagedCodeCheckbox:', removeCommentsPackagedCodeCheckbox); // Log new checkbox
console.log('minifyJsonFilesCheckbox:', minifyJsonFilesCheckbox); // Log new checkbox
console.log('compressImagesCheckbox:', compressImagesCheckbox); // Log new checkbox
console.log('updateInfoSection:', updateInfoSection);
console.log('updateChangelog:', updateChangelog);
console.log('updateProgressBar:', updateProgressBar);
console.log('updateProgressPercent:', updateProgressPercent);
console.log('updateEstimatedTime:', updateEstimatedTime);
console.log('updateRestartBtn:', updateRestartBtn);
console.log('updateErrorMessage:', updateErrorMessage);
console.log('hideUpdateSectionBtn:', hideUpdateSectionBtn);


/**
 * Displays a temporary notification at the top middle of the screen.
 * @param {string} message - The message to display.
 * @param {'success' | 'error' | 'info' | 'warning'} type - The type of notification (influences styling).
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.classList.add(
        'fixed', 'top-4', 'left-1/2', '-translate-x-1/2', 'p-4', 'rounded-lg', 'shadow-lg', 'text-white',
        'z-50', 'transition-all', 'duration-300', 'ease-out', 'transform', 'scale-0', 'opacity-0'
    );

    // Apply type-specific styling
    switch (type) {
        case 'success':
            notification.classList.add('bg-green-600');
            break;
        case 'error':
            notification.classList.add('bg-red-600');
            break;
        case 'warning':
            notification.classList.add('bg-yellow-600');
            break;
        case 'info':
        default:
            notification.classList.add('bg-blue-600');
            break;
    }

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.classList.remove('scale-0', 'opacity-0');
        notification.classList.add('scale-100', 'opacity-100');
    }, 10); // Small delay to ensure transition applies

    // Animate out and remove after a delay
    setTimeout(() => {
        notification.classList.remove('scale-100', 'opacity-100');
        notification.classList.add('scale-0', 'opacity-0');
        notification.addEventListener('transitionend', () => {
            notification.remove();
        }, { once: true });
    }, 3000); // Notification visible for 3 seconds
}


/**
 * Hides all main sections and displays the specified section.
 * Also hides the main header and disables body scrolling.
 * @param {HTMLElement} sectionToShow - The section element to display.
 */
function showSection(sectionToShow) {
    // Hide all main sections
    if (mainMenu) mainMenu.classList.add('hidden');
    if (obfuscatorSection) obfuscatorSection.classList.add('hidden');
    if (packagerSection) packagerSection.classList.add('hidden');
    if (creditsSection) creditsSection.classList.add('hidden');
    
    // Hide the header section
    if (headerSection) headerSection.style.display = 'none'; 

    // Show the requested section
    if (sectionToShow) sectionToShow.classList.remove('hidden');

    // Disable body scrolling when a section is active
    body.style.overflowY = 'hidden';
}

/**
 * Hides all sections and displays the main menu.
 * Also shows the main header and enables body scrolling.
 */
function showMainMenu() {
    // Show the main menu
    if (mainMenu) mainMenu.classList.remove('hidden');
    
    // Hide all specific sections
    if (obfuscatorSection) obfuscatorSection.classList.add('hidden');
    if (packagerSection) packagerSection.classList.add('hidden');
    if (creditsSection) creditsSection.classList.add('hidden');
    
    // Show the header section
    if (headerSection) headerSection.style.display = 'block';

    // Enable body scrolling when returning to the main menu
    body.style.overflowY = 'auto';
}

// Set initial values for obfuscator options based on common defaults or provided bot.js logic
document.addEventListener('DOMContentLoaded', () => {
    if (compactCodeCheckbox) compactCodeCheckbox.checked = true;
    if (controlFlowFlatteningCheckbox) controlFlowFlatteningCheckbox.checked = false;
    if (deadCodeInjectionCheckbox) deadCodeInjectionCheckbox.checked = false;
    if (debugProtectionCheckbox) debugProtectionCheckbox.checked = false;
    if (disableConsoleOutputCheckbox) disableConsoleOutputCheckbox.checked = true;
    if (stringArrayCheckbox) stringArrayCheckbox.checked = true;
    if (stringArrayShuffleCheckbox) stringArrayShuffleCheckbox.checked = true;
    if (stringArrayThresholdValueInput) stringArrayThresholdValueInput.value = 0.5;

    // Enable/disable the stringArrayThresholdValueInput based on the stringArrayCheckbox state
    if (stringArrayCheckbox && stringArrayThresholdValueInput) {
        stringArrayCheckbox.addEventListener('change', () => {
            stringArrayThresholdValueInput.disabled = !stringArrayCheckbox.checked;
        });
        // Set initial disabled state on load
        stringArrayThresholdValueInput.disabled = !stringArrayCheckbox.checked;
    }

    // Set initial values for packager options
    if (obfuscatePackagedCodeCheckbox) obfuscatePackagedCodeCheckbox.checked = false;
    if (removeCommentsPackagedCodeCheckbox) removeCommentsPackagedCodeCheckbox.checked = true; // Default to true
    if (minifyJsonFilesCheckbox) minifyJsonFilesCheckbox.checked = true; // Default to true
    if (compressImagesCheckbox) compressImagesCheckbox.checked = false; // Default to false

    // Ensure body scrolling is enabled by default on load
    body.style.overflowY = 'auto';

    // Add event listener for the collapsible button
    if (toggleOptionsBtn && obfuscationOptionsContent && toggleIcon) {
        toggleOptionsBtn.addEventListener('click', () => {
            obfuscationOptionsContent.classList.toggle('hidden');
            // Rotate the arrow icon
            if (obfuscationOptionsContent.classList.contains('hidden')) {
                toggleIcon.style.transform = 'rotate(0deg)'; // Point down
            } else {
                toggleIcon.style.transform = 'rotate(180deg)'; // Point up
            }
        });
    }

    // Event listener for the "Close" button in the update section
    if (hideUpdateSectionBtn) {
        hideUpdateSectionBtn.addEventListener('click', () => {
            hideUpdateSection();
            showMainMenu(); // Return to main menu after closing update section
        });
    }
});


// --- Event Listeners for Main Menu Buttons ---
document.addEventListener('DOMContentLoaded', () => {
    // Obfuscator button click handler
    if (obfuscatorBtn) {
        obfuscatorBtn.addEventListener('click', () => showSection(obfuscatorSection));
    }

    // Packager button click handler
    if (packagerBtn) {
        packagerBtn.addEventListener('click', () => showSection(packagerSection));
    }

    // Credits button click handler: fetches and displays app version
    if (creditsBtn) {
        creditsBtn.addEventListener('click', async () => {
            await displayAppVersion(); // Call the function here
            showSection(creditsSection);
        });
    }

    // Updater button click handler: triggers update check
    if (updaterBtn) {
        updaterBtn.addEventListener('click', async () => {
            // Show the update info section immediately
            showUpdateSection();
            // Trigger the update check via IPC. The main process will handle dialogs.
            if (isElectron) {
                await window.electronAPI.checkForUpdates();
            } else {
                console.warn("Electron API not available for checkForUpdates.");
            }
            // Provide immediate feedback to the user that the check is in progress
            showNotification('Checking for new releases. You will be notified if an update is available.', 'info');
        });
    }

    // --- Event Listeners for Back Buttons in sections ---
    if (backToMainObfuscator) {
        backToMainObfuscator.addEventListener('click', showMainMenu);
    }
    if (backToMainPackager) {
        backToMainPackager.addEventListener('click', showMainMenu);
    }
    if (backToMainCredits) {
        backToMainCredits.addEventListener('click', showMainMenu);
    }

    // --- Obfuscator Logic ---

    // Event listener for selecting the input script folder for obfuscation
    if (obfuscatorInputFolderBtn) {
        obfuscatorInputFolderBtn.addEventListener('click', async () => {
            let folderPath = 'No folder selected.'; // Default for browser environment
            if (isElectron) {
                folderPath = await window.electronAPI.selectFolder();
            } else {
                console.warn("Electron API not available for selectFolder.");
            }
            
            if (folderPath && obfuscatorInputFolderPathSpan) {
                obfuscatorInputFolderPathSpan.textContent = folderPath;
            }
        });
    }

    // Event listener for selecting the output folder for obfuscated scripts
    if (obfuscatorOutputFolderBtn) {
        obfuscatorOutputFolderBtn.addEventListener('click', async () => {
            let folderPath = 'No folder selected.'; // Default for browser environment
            if (isElectron) {
                folderPath = await window.electronAPI.selectFolder();
            } else {
                console.warn("Electron API not available for selectFolder.");
            }

            if (folderPath && obfuscatorOutputFolderPathSpan) {
                obfuscatorOutputFolderPathSpan.textContent = folderPath;
            }
        });
    }

    // Event listener for the "Obfuscate Code" button
    if (obfuscateCodeBtn) {
        obfuscateCodeBtn.addEventListener('click', async () => {
            const inputFolderPath = obfuscatorInputFolderPathSpan ? obfuscatorInputFolderPathSpan.textContent : '';
            const outputFolderPath = obfuscatorOutputFolderPathSpan ? obfuscatorOutputFolderPathSpan.textContent : '';

            // Validate that both input and output folders are selected
            if (!inputFolderPath || inputFolderPath === 'No folder selected.') {
                showNotification('Please select an input folder containing your JavaScript files.', 'warning');
                return;
            }
            if (!outputFolderPath || outputFolderPath === 'No folder selected.') {
                showNotification('Please select an output folder for the obfuscated files.', 'warning');
                return;
            }

            // Inform the user that obfuscation is in progress
            showNotification('Processing your JavaScript files. This might take a moment...', 'info');

            // Gather all obfuscation options from the checkboxes and input field
            const obfuscationOptions = {
                compactCode: compactCodeCheckbox ? compactCodeCheckbox.checked : true,
                controlFlowFlattening: controlFlowFlatteningCheckbox ? controlFlowFlatteningCheckbox.checked : false,
                deadCodeInjection: deadCodeInjectionCheckbox ? deadCodeInjectionCheckbox.checked : false,
                debugProtection: debugProtectionCheckbox ? debugProtectionCheckbox.checked : false,
                disableConsoleOutput: disableConsoleOutputCheckbox ? disableConsoleOutputCheckbox.checked : true,
                stringArray: stringArrayCheckbox ? stringArrayCheckbox.checked : true,
                stringArrayShuffle: stringArrayShuffleCheckbox ? stringArrayShuffleCheckbox.checked : true,
                stringArrayThreshold: stringArrayThresholdValueInput ? parseFloat(stringArrayThresholdValueInput.value) : 0.5 // Ensure it's a number
            };

            let result = { success: false, error: "Electron API not available for obfuscation." };
            // Call the main process to perform the obfuscation
            if (isElectron) {
                result = await window.electronAPI.obfuscateCode({
                    inputPath: inputFolderPath, // Changed to inputPath
                    outputPath: outputFolderPath, // Changed to outputPath
                    options: obfuscationOptions // Changed to options
                });
            } else {
                console.warn("Electron API not available for obfuscateCode.");
            }

            // Display the result of the obfuscation
            if (result.success) {
                showNotification(result.message || 'Obfuscation complete. Check your output folder.', 'success');
            } else {
                showNotification(`Failed to obfuscate files: ${result.error}`, 'error');
            }
        });
    }

    // --- Add-on Packager Logic ---

    // Event listener for selecting the Behavior Pack folder
    if (bpFolderInputBtn) {
        bpFolderInputBtn.addEventListener('click', async () => {
            let folderPath = 'No folder selected.'; // Default for browser environment
            if (isElectron) {
                folderPath = await window.electronAPI.selectFolder(); // No initial path for BP
            } else {
                console.warn("Electron API not available for selectFolder.");
            }
            if (folderPath && bpFolderPathSpan) {
                bpFolderPathSpan.textContent = folderPath;
            }
        });
    }

    // Event listener for selecting the Resource Pack folder
    if (rpFolderInputBtn) {
        rpFolderInputBtn.addEventListener('click', async () => {
            const bpPath = bpFolderPathSpan ? bpFolderPathSpan.textContent : '';
            // Use the BP path as the initial path for RP if it's selected
            const initialPath = (bpPath && bpPath !== 'No folder selected.') ? bpPath : null;
            
            let folderPath = 'No folder selected.'; // Default for browser environment
            if (isElectron) {
                folderPath = await window.electronAPI.selectFolder(initialPath);
            } else {
                console.warn("Electron API not available for selectFolder.");
            }

            if (folderPath && rpFolderPathSpan) {
                rpFolderPathSpan.textContent = folderPath;
            }
        });
    }

    // Event listener for the "Package Add-on" button
    if (packageAddonBtn) {
        packageAddonBtn.addEventListener('click', async () => {
            const bpFolderPath = bpFolderPathSpan ? bpFolderPathSpan.textContent : '';
            const rpFolderPath = rpFolderPathSpan ? rpFolderPathSpan.textContent : '';
            const packName = packNameInput ? packNameInput.value.trim() : ''; // Get pack name
            const obfuscatePackagedCode = obfuscatePackagedCodeCheckbox ? obfuscatePackagedCodeCheckbox.checked : false;
            const removeCommentsPackagedCode = removeCommentsPackagedCodeCheckbox ? removeCommentsPackagedCodeCheckbox.checked : false;
            const minifyJsonFiles = minifyJsonFilesCheckbox ? minifyJsonFilesCheckbox.checked : false;
            const compressImages = compressImagesCheckbox ? compressImagesCheckbox.checked : false;


            // Validate that at least one pack folder is selected
            if ((!bpFolderPath || bpFolderPath === 'No folder selected.') && (!rpFolderPath || rpFolderPath === 'No folder selected.')) {
                showNotification('Please select at least one pack folder (Behavior Pack or Resource Pack).', 'warning');
                return;
            }

            // Validate pack name
            if (!packName) {
                showNotification('Please enter a name for your add-on pack.', 'warning');
                return;
            }

            // Inform the user that packaging is in progress
            showNotification('Packaging your add-on. This might take a moment...', 'info');

            // Gather obfuscation options to pass to the main process if obfuscation is requested
            const obfuscationOptions = {
                compactCode: compactCodeCheckbox ? compactCodeCheckbox.checked : true,
                controlFlowFlattening: controlFlowFlatteningCheckbox ? controlFlowFlatteningCheckbox.checked : false,
                deadCodeInjection: deadCodeInjectionCheckbox ? deadCodeInjectionCheckbox.checked : false,
                debugProtection: debugProtectionCheckbox ? debugProtectionCheckbox.checked : false,
                disableConsoleOutput: disableConsoleOutputCheckbox ? disableConsoleOutputCheckbox.checked : true,
                stringArray: stringArrayCheckbox ? stringArrayCheckbox.checked : true,
                stringArrayShuffle: stringArrayShuffleCheckbox ? stringArrayShuffleCheckbox.checked : true,
                stringArrayThreshold: stringArrayThresholdValueInput ? parseFloat(stringArrayThresholdValueInput.value) : 0.5
            };

            let result = { success: false, error: "Electron API not available for packaging." };
            // Call the main process to package the add-on
            if (isElectron) {
                result = await window.electronAPI.packageAddon({
                    behaviorPackPath: bpFolderPath === 'No folder selected.' ? null : bpFolderPath, // Pass null if not selected
                    resourcePackPath: rpFolderPath === 'No folder selected.' ? null : rpFolderPath, // Pass null if not selected
                    packName, // Pass the pack name
                    obfuscationOptions, // Pass obfuscation options
                    removeCommentsPackagedCode, // Pass new option
                    minifyJsonFiles, // Pass new option
                    compressImages // Pass new option
                });
            } else {
                console.warn("Electron API not available for packageAddon.");
            }

            // Display the result of the packaging
            if (result.success) {
                showNotification(result.message, 'success');
                // Open save dialog after successful packaging
                const defaultFileName = `${packName.replace(/[^a-z0-9_.-]/gi, '_')}.mcaddon`; // Use sanitized pack name
                
                let savePath = null;
                if (isElectron) {
                    savePath = await window.electronAPI.showSaveDialog(defaultFileName);
                } else {
                    console.warn("Electron API not available for showSaveDialog.");
                }

                if (savePath) {
                    let moveResult = { success: false, error: "Electron API not available for file movement." };
                    if (isElectron) {
                        moveResult = await window.electronAPI.moveFile(result.filePath, savePath);
                    } else {
                        console.warn("Electron API not available for moveFile.");
                    }

                    if (moveResult.success) {
                        showNotification('Add-on saved successfully!', 'success');
                    } else {
                        showNotification(`Failed to save add-on: ${moveResult.error}`, 'error');
                    }
                } else {
                    showNotification('Add-on packaged but not saved (save dialog cancelled or Electron API not available).', 'warning');
                }

            } else {
                showNotification(`Failed to package add-on: ${result.error}`, 'error');
            }
        });
    }

    // Also call displayAppVersion on startup, after the DOM is fully loaded
    displayAppVersion();
});


// --- Electron-Updater Renderer-side Event Listeners ---
// These listeners are only attached if running in an Electron environment.
if (isElectron) {
    // Listen for 'update_available' event from the main process
    window.electronAPI.on('update_available', () => {
        console.log('Update available, download started...');
        // Show the update section
        showUpdateSection();
        // Reset progress bar and text
        if (updateProgressBar) updateProgressBar.style.width = '0%';
        if (updateProgressPercent) updateProgressPercent.textContent = '0%';
        if (updateEstimatedTime) updateEstimatedTime.textContent = 'Downloading...';
        if (updateRestartBtn) updateRestartBtn.classList.add('hidden');
        if (updateErrorMessage) updateErrorMessage.classList.add('hidden');
    });

    // Listen for 'download-progress' event from the main process
    window.electronAPI.on('download-progress', (percent) => {
        console.log(`Download progress: ${percent}%`);
        if (updateProgressBar) updateProgressBar.style.width = `${percent}%`;
        if (updateProgressPercent) updateProgressPercent.textContent = `${Math.floor(percent)}%`;
        if (updateEstimatedTime) updateEstimatedTime.textContent = 'Downloading...';
    });

    // Listen for 'update_downloaded' event from the main process
    window.electronAPI.on('update_downloaded', async () => {
        console.log('Update downloaded');
        if (updateEstimatedTime) updateEstimatedTime.textContent = 'Download complete. Ready to install.';
        if (updateRestartBtn) updateRestartBtn.classList.remove('hidden');
        // Optionally, you can hide the progress bar after download is complete
        if (updateProgressBar) updateProgressBar.style.width = '100%';
        if (updateProgressPercent) updateProgressPercent.textContent = '100%';
        
        // Show a notification that the update is ready
        showNotification('A new version has been downloaded. Restart the application to apply the update.', 'info');
    });

    // Listen for 'update_error' event from the main process
    window.electronAPI.on('update_error', (errorMessage) => {
        console.error('Update error in renderer:', errorMessage);
        if (updateErrorMessage) {
            updateErrorMessage.textContent = `An error occurred during update: ${errorMessage}`;
            updateErrorMessage.classList.remove('hidden');
        }
        if (updateEstimatedTime) updateEstimatedTime.textContent = 'Update failed.';
        showNotification(`An error occurred during update: ${errorMessage}`, 'error');
    });

    // Listen for 'update-changelog' event from the main process
    window.electronAPI.on('update-changelog', (changelog) => {
        console.log('Changelog received:', changelog);
        if (updateChangelog) {
            updateChangelog.innerHTML = marked.parse(changelog);
        }
    });

    // Listen for 'update-download-cancelled' event from the main process
    window.electronAPI.on('update-download-cancelled', () => {
        console.log('Update download cancelled by user.');
        hideUpdateSection(); // Hide the update section if the user cancels
        showNotification('Update download cancelled.', 'info');
    });
}


// Function to fetch and display the app version from package.json
async function displayAppVersion() {
    try {
        let version = 'N/A'; // Default for browser environment
        if (isElectron) {
            version = await window.electronAPI.getAppVersion();
        } else {
            console.warn("Electron API not available for getAppVersion. Displaying 'N/A'.");
        }
        
        if (appVersionSpan) {
            appVersionSpan.textContent = version;
        }
    } catch (error) {
        console.error('Failed to get app version:', error);
    }
}


function showUpdateSection() {
    if (updateInfoSection) {
        updateInfoSection.classList.remove('hidden');
    }
    if (mainMenu) mainMenu.classList.add('hidden');
    if (obfuscatorSection) obfuscatorSection.classList.add('hidden');
    if (packagerSection) packagerSection.classList.add('hidden');
    if (creditsSection) creditsSection.classList.add('hidden');
    if (headerSection) headerSection.style.display = 'none';
    body.style.overflowY = 'hidden';
}

function hideUpdateSection() {
    if (updateInfoSection) {
        updateInfoSection.classList.add('hidden');
    }

    showMainMenu();
}
