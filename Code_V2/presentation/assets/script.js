document.addEventListener("DOMContentLoaded", () => {
    
    // Electron IPC Bridge for Native OS calls (like launching scrcpy)
    let ipcRenderer = null;
    try {
        ipcRenderer = require('electron').ipcRenderer;
    } catch(e) {
        console.log("Running in standard browser. Native Electron IPC disabled.");
    }

    const dockItems = document.querySelectorAll('.desktop-card');
    const closeBtns = document.querySelectorAll('.close-btn');

    dockItems.forEach(item => {
        item.addEventListener('click', (e) => {
            
            // 1. Get the physical app icon inside the dock item

            
            // 2. Get the exact screen coordinates of the card
            const rect = item.getBoundingClientRect();
            
            // Calculate center of the card relative to the viewport
            const originX = rect.left + (rect.width / 2);
            const originY = rect.top + (rect.height / 2);

            // 3. Identify which window to open
            const targetId = item.getAttribute('data-target');
            const targetWindow = document.getElementById(targetId);

            // Handle Restore from Minimize explicitly
            if (targetWindow.classList.contains('minimized')) {
                // If it was minimized, just remove the minimized class to snap it back
                targetWindow.classList.remove('minimized');
                return; // skip the origin setting below since it's already "open"
            }

            // SPECIAL NATIVE CALL: DOM Video Stream Integration
            if (targetId === 'win-mobile' && ipcRenderer) {
                // Tell backend to launch the hidden scrcpy
                ipcRenderer.send('launch-scrcpy');
                
                const videoEl = document.getElementById('mobile-cast-stream');
                const loaderEl = document.getElementById('mobile-cast-loader');
                loaderEl.style.display = 'block';

                // Try to find the scrcpy window source ID every 500ms
                let attempts = 0;
                const pollInterval = setInterval(async () => {
                    attempts++;
                    console.log("Polling for scrcpy window source...");
                    const sourceId = await ipcRenderer.invoke('get-scrcpy-source');
                    
                    if (sourceId) {
                        clearInterval(pollInterval);
                        console.log("Got Source ID:", sourceId);
                        
                        try {
                            // Extract stream from Mac WindowServer 
                            const stream = await navigator.mediaDevices.getUserMedia({
                                audio: false,
                                video: {
                                    mandatory: {
                                        chromeMediaSource: 'desktop',
                                        chromeMediaSourceId: sourceId
                                    }
                                }
                            });
                            
                            // Feed stream directly into our CSS Box!
                            videoEl.srcObject = stream;
                            
                            // Hide loader once video is playing
                            videoEl.onloadedmetadata = () => {
                                loaderEl.style.display = 'none';
                                videoEl.play();
                            };

                        } catch (err) {
                            console.error("Failed to capture scrcpy stream:", err);
                        }
                    } else if (attempts > 30) { // Timeout after 15 seconds
                        clearInterval(pollInterval);
                        console.error("Scrcpy window never appeared.");
                    }
                }, 500);
            }

            // 4. Set the transform-origin of the window EXACTLY to the icon's coordinate
            const winLeft = window.innerWidth * 0.10;
            const winTop = window.innerHeight * 0.05;

            const relativeOriginX = originX - winLeft;
            const relativeOriginY = originY - winTop;

            targetWindow.style.transformOrigin = `${relativeOriginX}px ${relativeOriginY}px`;

            // 5. Close any already open windows first and remove dock active dots
            document.querySelectorAll('.magic-window.open').forEach(w => w.classList.remove('open'));
            document.querySelectorAll('.dock-item.open').forEach(d => d.classList.remove('open'));

            // 6. Trigger the macroscopic ease curve
            targetWindow.classList.add('open');
        });
    });

    // Close Button logic
    closeBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            // Find the parent window
            const win = e.target.closest('.magic-window');
            if (win) {
                win.classList.remove('open');
                win.classList.remove('maximized'); // reset max state on close
                
                // If closing the mobile window, kill scrcpy and stop the stream!
                if (win.id === 'win-mobile' && ipcRenderer) {
                    ipcRenderer.send('kill-scrcpy');
                    const videoEl = document.getElementById('mobile-cast-stream');
                    if (videoEl && videoEl.srcObject) {
                        const tracks = videoEl.srcObject.getTracks();
                        tracks.forEach(track => track.stop()); // Release camera resources
                        videoEl.srcObject = null;
                    }
                }

                // Turn off active state
                const winId = win.getAttribute('id');
                const matchingCard = document.querySelector(`.desktop-card[data-target="${winId}"]`);
                if (matchingCard) matchingCard.classList.remove('open');
            }
        });
    });

    // Minimize Button logic
    const minimizeBtns = document.querySelectorAll('.yellow');
    minimizeBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const win = e.target.closest('.magic-window');
            if (win) {
                // Shrink it down to the dock visually without closing or killing processes
                win.classList.remove('maximized');
                win.classList.add('minimized');
            }
        });
    });

    // Mac OS Native Drag & Drop Logic for Windows
    const windows = document.querySelectorAll('.magic-window');
    windows.forEach((win) => {
        const header = win.querySelector('.window-header');
        
        let isDragging = false;
        let offsetX = 0, offsetY = 0;

        header.addEventListener('mousedown', (e) => {
            // Prevent dragging if they clicked a traffic light button
            if (e.target.closest('.traffic-lights')) return;
            // Prevent dragging if maximized
            if (win.classList.contains('maximized')) return;

            isDragging = true;
            
            // Bring to absolute front
            const allWin = document.querySelectorAll('.magic-window');
            allWin.forEach(w => w.style.zIndex = 10);
            win.style.zIndex = 100;

            const rect = win.getBoundingClientRect();
            // Calculate exact grip offset relative to the window top-left
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            
            // Strip out smooth CSS transitions instantly so dragging feels instantaneous and native
            win.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            // Literally map mouse pointer coordinate onto the screen
            win.style.left = (e.clientX - offsetX) + 'px';
            win.style.top = (e.clientY - offsetY) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                // Restore the smooth spring transitions so maximize/minimize operations work again
                win.style.transition = '';
            }
        });
    });

    // Green Mac OS Maximize Logic(Green Button) logic
    const maxBtns = document.querySelectorAll('.tl-btn.green');
    maxBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const win = e.target.closest('.magic-window');
            if (win) {
                win.classList.toggle('maximized');
            }
        });
    });
});
