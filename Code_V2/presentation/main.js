const { app, BrowserWindow, globalShortcut, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

let mainWindow;

// Auto-copy cartoon images from the AI brain directory into our assets folder
// Only runs in development mode — in packaged apps, images are already bundled
function copyCartoonImages() {
    try {
        // Skip in packaged apps (asar is read-only)
        if (app.isPackaged) {
            console.log('📦 Packaged mode — skipping image copy (already bundled)');
            return;
        }

        const brainDir = path.join(require('os').homedir(), '.gemini/antigravity/brain/3d70f80c-bca0-4a02-9169-9a60a349b469');
        const imgDir = path.join(__dirname, 'assets', 'images');
        
        fs.mkdirSync(imgDir, { recursive: true });
        
        const mapping = {
            'problem_gaps_1775864426077.png': 'problem_gaps.png',
            'sarah_confused_1775864569635.png': 'sarah_confused.png',
            'mike_overwhelmed_1775864373113.png': 'mike_overwhelmed.png',
            'sarah_journey_comic_1775864385202.png': 'sarah_journey.png',
            'mike_journey_comic_1775864414148.png': 'mike_journey.png',
        };
        
        for (const [src, dst] of Object.entries(mapping)) {
            const srcPath = path.join(brainDir, src);
            const dstPath = path.join(imgDir, dst);
            if (!fs.existsSync(dstPath) && fs.existsSync(srcPath)) {
                fs.copyFileSync(srcPath, dstPath);
                console.log(`✅ Copied cartoon: ${dst}`);
            }
        }
    } catch (e) {
        console.log(`⚠️ copyCartoonImages skipped: ${e.message}`);
    }
}

function createWindow() {
    const isMac = process.platform === 'darwin';
    const isWin = process.platform === 'win32';

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        fullscreen: false,
        frame: true,
        // macOS: native translucent glass | Windows: solid dark background
        ...(isMac ? {
            vibrancy: 'under-window',
            visualEffectState: 'active',
            backgroundColor: '#00000000',
        } : {
            backgroundColor: '#150a00',
        }),
        webPreferences: {
            nodeIntegration: true, 
            contextIsolation: false,
            webviewTag: true 
        }
    });

    // Temporarily disabled to prevent macOS Spaces segregation issues
    // mainWindow.setAlwaysOnTop(true, "screen-saver");

    mainWindow.loadFile('index.html');

    // Emergency Exit: Hit ESC to quit the presentation
    globalShortcut.register('Escape', () => {
        killScrcpy(); // Cross-platform cleanup
        app.quit();
    });
}

// Cross-platform helper to kill scrcpy
function killScrcpy() {
    if (process.platform === 'win32') {
        exec('taskkill /F /IM scrcpy.exe', () => {});
    } else {
        exec('pkill -9 scrcpy', () => {});
    }
}

// Resolve scrcpy binary path: bundled vendor → system PATH
function getScrcpyPath() {
    const isMac = process.platform === 'darwin';
    const isWin = process.platform === 'win32';
    const exe = isWin ? 'scrcpy.exe' : 'scrcpy';
    const vendorSubdir = isWin ? 'win' : 'mac';

    // Check 1: Bundled in packaged app (electron-builder extraResources)
    const packagedPath = path.join(process.resourcesPath, 'vendor', vendorSubdir, exe);
    if (fs.existsSync(packagedPath)) {
        console.log(`✅ Using bundled scrcpy: ${packagedPath}`);
        return packagedPath;
    }

    // Check 2: Local vendor folder (dev mode)
    const devPath = path.join(__dirname, 'vendor', vendorSubdir, exe);
    if (fs.existsSync(devPath)) {
        console.log(`✅ Using local vendor scrcpy: ${devPath}`);
        return devPath;
    }

    // Check 3: Fall back to system PATH
    console.log(`⚠️ No bundled scrcpy found, falling back to system PATH: ${exe}`);
    return exe;
}

const { spawn } = require('child_process');
let scrcpyProcess = null;

// 1. Launch the Native App (Hidden beneath our presentation)
ipcMain.on('launch-scrcpy', (event) => {
    console.log("Launching scrcpy hidden buffer...");
    
    // First kill any ghost scrcpy processes (cross-platform)
    killScrcpy();
    
    setTimeout(() => {
        const scrcpyCmd = getScrcpyPath();
        const args = [
            '--window-title=vsms-scrcpy-hidden',
            '--max-size=1080',
            '--window-borderless',
            '--window-x=-3000',    // Move window far off-screen so user never sees it
            '--window-y=-3000',
        ];
        
        scrcpyProcess = spawn(scrcpyCmd, args);
        
        scrcpyProcess.stdout.on('data', (data) => console.log(`scrcpy: ${data}`));
        scrcpyProcess.stderr.on('data', (data) => console.log(`scrcpy info: ${data}`));
        scrcpyProcess.on('close', (code) => console.log(`scrcpy exited with code ${code}`));
        scrcpyProcess.on('error', (err) => console.error(`scrcpy launch error: ${err.message}`));
    }, 500);
});

// 2. The Native Bridge: Find the hidden window and rip its video stream ID
ipcMain.handle('get-scrcpy-source', async () => {
    const sources = await desktopCapturer.getSources({ types: ['window'] });
    
    const names = sources.map(s => s.name);
    console.log(`[DesktopCapturer] Found ${sources.length} windows: `, names);
    
    // ONLY match our exact custom window title — no fuzzy matching!
    // Fuzzy matching caused it to accidentally capture a browser tab named
    // "Releases · Genymobile/scrcpy" before the real scrcpy window appeared.
    for (const source of sources) {
        if (source.name === 'vsms-scrcpy-hidden') {
            console.log("✅ Found scrcpy window:", source.id);
            return source.id;
        }
    }
    
    return null;
});

ipcMain.on('kill-scrcpy', () => {
    killScrcpy();
});

app.whenReady().then(() => {
    copyCartoonImages(); // Copy cartoon images before the window loads
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
