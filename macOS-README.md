# Operator OS - macOS User Guide

Welcome to **Operator OS**! This guide will help you install, run, and package the Operator OS application natively on your macOS environment.

## 🛠️ Prerequisites
Before you begin, ensure you have the following installed on your Mac:
1. **Node.js** (v16 or higher)
   - Download from [nodejs.org](https://nodejs.org/) or install via Homebrew:
     ```bash
     brew install node
     ```
2. **Git** (Optional, for cloning the repository)
   - Comes pre-installed on macOS or can be installed via Homebrew:
     ```bash
     brew install git
     ```

## 🚀 Installation & Running

1. **Open Terminal** (You can find this in Applications > Utilities > Terminal, or by searching with Spotlight).
2. **Navigate to the project folder:**
   ```bash
   cd /path/to/Operator-OS
   ```
3. **Install the dependencies:**
   ```bash
   npm install
   ```
4. **Start the Application:**
   ```bash
   npm start
   ```
   *Operator OS will now launch. You can click the "Desktop OS" toggle in the top left to switch into the macOS Virtual Desktop mode.*

## 📦 Packaging as a Native macOS App (.app)

If you want to compile Operator OS into a standalone, clickable `.app` file that you can place in your `Applications` folder:

1. **Install Electron Packager globally** (if you haven't already):
   ```bash
   npm install -g electron-packager
   ```
2. **Build the macOS App:**
   Run the following command inside the project directory:
   ```bash
   electron-packager . OperatorOS --platform=darwin --arch=x64 --out=dist/ --overwrite
   ```
   *(Note: If you are using an Apple Silicon Mac (M1/M2/M3), change `--arch=x64` to `--arch=arm64`)*
3. **Run your App:**
   - Navigate to the newly created `dist/OperatorOS-darwin-x64` (or `arm64`) folder.
   - Drag the `OperatorOS.app` file into your Mac's `Applications` folder.
   - Double-click to run!

## ⚠️ Troubleshooting
- **"App is damaged and can't be opened"**: This is a common macOS security feature (Gatekeeper) for unsigned apps. To fix this, open your Terminal and run:
  ```bash
  xattr -cr /Applications/OperatorOS.app
  ```
- **Port Conflicts**: Operator OS starts a local LLM server on port `8080`. If you have another application running on this port, ensure you close it before starting Operator OS.
