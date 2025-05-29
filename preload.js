// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    obfuscateCode: (params) => ipcRenderer.invoke('obfuscate-code', params),
    packageAddon: (params) => ipcRenderer.invoke('package-addon', params),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    restartApp: () => ipcRenderer.invoke('restart_app'), // New: Expose restart_app
    // New: Expose ipcRenderer.on for update events
    on: (channel, callback) => {
        const validChannels = ['update_available', 'update_downloaded', 'update_error']; // Define valid channels
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender` which is a security risk
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    }
});