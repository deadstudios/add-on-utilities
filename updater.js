// updater.js - Add this as a new file
const { app, dialog, shell } = require('electron');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

class UpdateChecker {
    constructor(githubRepo, currentVersion) {
        this.githubRepo = githubRepo; // e.g., "deadstudios/addon-utilities"
        this.currentVersion = currentVersion;
        this.updateCheckUrl = `https://api.github.com/repos/${githubRepo}/releases/latest`;
    }

    async checkForUpdates() {
        try {
            const latestRelease = await this.fetchLatestRelease();
            const latestVersion = latestRelease.tag_name.replace('v', '');
            
            if (this.isNewerVersion(latestVersion, this.currentVersion)) {
                return {
                    available: true,
                    version: latestVersion,
                    downloadUrl: this.getDownloadUrl(latestRelease),
                    releaseNotes: latestRelease.body,
                    releaseName: latestRelease.name
                };
            }
            
            return { available: false };
        } catch (error) {
            console.error('Update check failed:', error);
            return { available: false, error: error.message };
        }
    }

    fetchLatestRelease() {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.github.com',
                path: `/repos/${this.githubRepo}/releases/latest`,
                headers: {
                    'User-Agent': 'Electron-App-Updater'
                }
            };

            const req = https.get(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const release = JSON.parse(data);
                        resolve(release);
                    } catch (error) {
                        reject(new Error('Failed to parse release data'));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    isNewerVersion(latest, current) {
        const parseVersion = (version) => {
            return version.split('.').map(num => parseInt(num, 10));
        };

        const latestParts = parseVersion(latest);
        const currentParts = parseVersion(current);

        for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
            const latestPart = latestParts[i] || 0;
            const currentPart = currentParts[i] || 0;

            if (latestPart > currentPart) {
                return true;
            } else if (latestPart < currentPart) {
                return false;
            }
        }

        return false;
    }

    getDownloadUrl(release) {
        // Look for Windows executable in assets
        const windowsAsset = release.assets.find(asset => 
            asset.name.toLowerCase().includes('win') && 
            (asset.name.toLowerCase().endsWith('.exe') || asset.name.toLowerCase().endsWith('.zip'))
        );

        if (windowsAsset) {
            return windowsAsset.browser_download_url;
        }

        // Fallback to first asset or release page
        return release.assets.length > 0 ? 
            release.assets[0].browser_download_url : 
            release.html_url;
    }

    async downloadUpdate(downloadUrl, updateInfo) {
        const tempDir = path.join(require('os').tmpdir(), 'addon-utilities-update');
        
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const fileName = path.basename(downloadUrl) || `update-${updateInfo.version}.exe`;
        const filePath = path.join(tempDir, fileName);

        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filePath);
            
            https.get(downloadUrl, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    // Handle redirect
                    return https.get(response.headers.location, (redirectResponse) => {
                        redirectResponse.pipe(file);
                        
                        file.on('finish', () => {
                            file.close();
                            resolve(filePath);
                        });
                    }).on('error', reject);
                }

                response.pipe(file);
                
                file.on('finish', () => {
                    file.close();
                    resolve(filePath);
                });
            }).on('error', (error) => {
                fs.unlink(filePath, () => {}); // Clean up on error
                reject(error);
            });
        });
    }

    async installUpdate(filePath) {
        try {
            if (filePath.endsWith('.exe')) {
                // For .exe files, run the installer
                execFile(filePath, [], (error) => {
                    if (error) {
                        console.error('Failed to run installer:', error);
                    }
                });
                
                // Give the installer a moment to start, then quit the app
                setTimeout(() => {
                    app.quit();
                }, 1000);
            } else {
                // For other files, open the download location
                shell.showItemInFolder(filePath);
            }
        } catch (error) {
            console.error('Failed to install update:', error);
            shell.showItemInFolder(filePath);
        }
    }
}

module.exports = UpdateChecker;
