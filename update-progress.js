const { ipcRenderer } = require('electron');

const changelogElement = document.getElementById('changelog');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent');
const restartButton = document.getElementById('restart-button');
const errorMessageElement = document.getElementById('error-message');

ipcRenderer.on('update-changelog', (event, changelog) => {
    changelogElement.textContent = changelog;
});

ipcRenderer.on('download-progress', (event, percent) => {
    progressBar.style.width = percent + '%';
    progressPercent.textContent = Math.floor(percent) + '%';
});

ipcRenderer.on('update-downloaded', () => {
    const titleElement = document.querySelector('h2');
    titleElement.textContent = 'Update Downloaded';
    document.getElementById('progress-text').textContent = 'Download complete. Restart to install.';
    document.getElementById('progress-bar-container').style.backgroundColor = '#d4edda';
    progressBar.style.backgroundColor = '#155724';
    restartButton.classList.remove('hidden');
});

ipcRenderer.on('update-error', (event, message) => {
    const titleElement = document.querySelector('h2');
    titleElement.textContent = 'Update Error';
    document.getElementById('progress-bar-container').style.display = 'none';
    document.getElementById('progress-text').style.display = 'none';
    errorMessageElement.textContent = `Error: ${message}`;
    errorMessageElement.classList.remove('hidden');
});

restartButton.addEventListener('click', () => {
    ipcRenderer.invoke('restart-app');
});