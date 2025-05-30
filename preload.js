const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    obfuscateCode: (params) => ipcRenderer.invoke('obfuscate-code', params),
    packageAddon: (params) => ipcRenderer.invoke('package-addon', params),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    restartApp: () => ipcRenderer.invoke('restart-app'),
    showSaveDialog: (defaultPath) => ipcRenderer.invoke('show-save-dialog', defaultPath), // Expose showSaveDialog
    moveFile: (sourcePath, destinationPath) => ipcRenderer.invoke('move-file', sourcePath, destinationPath), // Expose moveFile
    on: (channel, callback) => {
        // Define valid channels that the renderer process can listen to
        const validChannels = [
            'update_available',
            'update_downloaded',
            'update_error',
            'download-progress', // Added for update progress
            'update-changelog' // Added for update changelog
        ];
        if (validChannels.includes(channel)) {
            // Deliberately not cleaning up the listener here as it's for app-wide events.
            // In a more complex app, you might manage these listeners more granularly.
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    }
});