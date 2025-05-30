# Dead's Add-on Utilities

![Electron](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white)
![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

A comprehensive desktop application designed to streamline the development and distribution of Minecraft Bedrock Edition add-ons, offering powerful tools for code obfuscation, asset packaging, and automatic updates.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
  - [JavaScript Obfuscator](#javascript-obfuscator)
  - [Add-on Packager](#add-on-packager)
  - [Automatic Updates](#automatic-updates)
- [How It Works (Technical Overview)](#how-it-works-technical-overview)
- [Installation (For Users)](#installation-for-users)
- [Development Environment Setup](#development-environment-setup)
  - [Prerequisites](#prerequisites)
  - [Cloning the Repository](#cloning-the-repository)
  - [Installing Dependencies](#installing-dependencies)
  - [Running in Development Mode](#running-in-development-mode)
  - [Building for Production](#building-for-production)
- [Debugging](#debugging)
- [Usage Guide](#usage-guide)
- [Open Source Policy & Contributing](#open-source-policy--contributing)
- [License](#license)
- [Credits](#credits)

## Introduction

Dead's Add-on Utilities is an Electron-based desktop application built to assist Minecraft Bedrock Edition add-on creators. It provides a user-friendly interface for common, yet often complex, tasks such as protecting intellectual property in JavaScript code and efficiently packaging add-on components for distribution. With built-in automatic updates, the application ensures you always have the latest tools at your fingertips.

## Features

### JavaScript Obfuscator

The JavaScript Obfuscator is designed to protect your intellectual property within Behavior Pack scripts by making your code significantly harder to reverse-engineer or understand, while maintaining its full functionality within the game.

- **Code Compaction**: Reduces the overall size of your script files by removing unnecessary whitespace, comments, and shortening variable/function names to minimal, unreadable identifiers. This also helps in slightly reducing file size.

- **Control Flow Flattening**: Transforms the sequential and conditional logic of your code into a complex, spaghetti-like structure that is extremely difficult for a human to follow or deconstruct, even with formatting tools.

- **Dead Code Injection**: Inserts irrelevant and non-functional code segments throughout your script. These "decoy" sections serve to confuse and mislead anyone attempting to analyze the code's true purpose.

- **Debug Protection**: Implements various techniques to hinder debugging efforts. This can include anti-debugging checks that break or alter code execution if a debugger is detected, making analysis cumbersome.

- **Console Output Suppression**: Modifies or disables console.log and similar debugging output statements. This prevents sensitive information or debugging messages from being easily extracted from the obfuscated code.

- **String Array Encoding and Shuffling**: Replaces string literals (e.g., "my_custom_event") with references to elements within a dynamically generated array. This array is then shuffled and often encrypted, making it challenging to extract meaningful strings directly from the code.

### Add-on Packager

This feature simplifies the process of preparing your Minecraft add-ons for distribution. It allows you to combine your Behavior Pack and Resource Pack folders into a single, installable .mcaddon file.

- **Streamlined Packaging**: Select your Behavior Pack (BP) and/or Resource Pack (RP) folders, and the utility will generate a standard .mcaddon archive, ready for sharing and easy installation by other players.

- **Optional Obfuscation Integration**: You can choose to apply the JavaScript Obfuscator to your Behavior Pack's script files directly during the packaging process, ensuring your code is protected before distribution.

### Automatic Updates

Stay current with the latest features, bug fixes, and performance improvements without manual intervention.

- **Seamless Updates**: The application automatically checks for new releases hosted on GitHub.

- **User Notification & Control**: When an update is available, you will be prompted to download and install it, with a clear progress indicator and the option to restart the application to apply the changes.

## How It Works (Technical Overview)

Dead's Add-on Utilities is built on the Electron framework, which allows for cross-platform desktop applications using web technologies (HTML, CSS, JavaScript).

**Architecture**: It follows Electron's standard Main Process and Renderer Process architecture.
- The Main Process (main.js) handles native desktop functionalities like window management, file system access (reading/writing files, creating zips), inter-process communication (IPC), and the auto-update logic.
- The Renderer Process (renderer.js, index.html, styles.css) is responsible for the user interface and user interactions.

**Core Technologies**:
- **Node.js**: Powers the backend operations in the Main Process, including file system (fs, path, util) and HTTP requests (https).
- **javascript-obfuscator**: A powerful Node.js library used in the Main Process to perform the complex JavaScript code transformations.
- **archiver**: A Node.js library used in the Main Process to create .zip archives (for .mcaddon files).
- **electron-builder**: A comprehensive toolchain used for packaging and distributing the Electron application across various platforms (Windows, macOS, Linux). It handles creating installers and managing release artifacts.
- **electron-updater**: A module integrated into the Main Process that leverages GitHub Releases to provide seamless automatic updates for the application.
- **electron-log**: A logging utility for Electron applications, used here for robust logging of update processes and general application events.
- **Tailwind CSS**: Used for rapid and responsive styling of the user interface in index.html and styles.css.

## Installation (For Users)

To get started with Dead's Add-on Utilities, download the latest stable release for your operating system:

1. Visit the [GitHub Releases page](https://github.com/deadstudios/add-on-utilities/releases).
2. Download the appropriate installer for your system (e.g., .exe for Windows, .dmg for macOS, .deb/.rpm for Linux).
3. Run the installer and follow the on-screen instructions.
4. The application will automatically check for updates on startup and notify you if a new version is available.

## Development Environment Setup

If you wish to contribute to Dead's Add-on Utilities or explore its codebase, follow these steps to set up your development environment.

### Prerequisites

- **Node.js**: [Download & Install Node.js](https://nodejs.org/) (LTS version recommended). This includes npm (Node Package Manager).
- **Git**: [Download & Install Git](https://git-scm.com/).

### Cloning the Repository

First, clone the project repository to your local machine:

```bash
git clone https://github.com/deadstudios/add-on-utilities.git
cd add-on-utilities
```

### Installing Dependencies

Navigate into the project directory and install all necessary Node.js dependencies:

```bash
npm install
# or if you prefer yarn:
# yarn install
```

### Running in Development Mode

To run the application in development mode with live reloading and developer tools enabled:

```bash
npm start
```

### Building for Production

To create a distributable package for your operating system:

**For Windows (.exe installer):**
```bash
npm run package-win
```

**For macOS (.dmg installer):**
```bash
npm run package-mac
```

**For Linux (.deb, .rpm, .tar.gz):**
```bash
npm run package-linux
```

Packaged applications will be found in the `dist/` directory.

## Debugging

While running in development mode (`npm start`), you can open Electron's Developer Tools by pressing `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (macOS) in the application window. This provides access to console logs, network requests, and UI inspection.

`electron-log` writes application and update logs to a file within your user data directory (e.g., `C:\Users\YOUR_USERNAME\AppData\Roaming\deads-addon-utilities\updates.log` on Windows).

## Usage Guide

The application features a straightforward interface with distinct sections:

1. **Obfuscator**: Select an input folder containing your JavaScript files and an output folder. Choose your desired obfuscation options and click "Obfuscate Code".

2. **Packager**: Select your Behavior Pack and/or Resource Pack folders. Optionally, enable "Obfuscate Behavior Pack Scripts" if you want to protect your code during packaging. Click "Package Add-on" to create the .mcaddon file.

3. **Credits**: View information about the application's development, technologies used, and version.

4. **Check for Updates**: Manually trigger an update check. The application will also check automatically on startup.

For more detailed usage instructions and specific scenarios, please refer to the in-app prompts and future dedicated documentation.

## Open Source Policy & Contributing

Dead's Add-on Utilities is an open-source project, and contributions are welcome! This project is licensed under the MIT License.

We encourage community involvement through:

- **Bug Reports**: If you encounter any issues, please report them on the [GitHub Issues page](https://github.com/deadstudios/add-on-utilities/issues).
- **Feature Requests**: Have an idea for a new feature? Suggest it on the [GitHub Issues page](https://github.com/deadstudios/add-on-utilities/issues).
- **Pull Requests**: If you'd like to contribute code, please fork the repository, make your changes, and submit a pull request. Ensure your code adheres to the existing style and includes relevant tests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

**Developed by**: Dead Studios

**Key Technologies & Libraries**:
- Electron
- Tailwind CSS
- JavaScript Obfuscator
- Archiver
- electron-builder
- electron-updater
- electron-log
- Node.js Standard Libraries (fs, path, util, https)