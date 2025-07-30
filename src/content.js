// src/content.js
(async () => {
    console.log("CONTENT: Script injected and running."); // <-- ADD THIS LOG

    // This flag prevents the entire script from running more than once.
    if (window.myVintedAppInitialized) {
        return;
    }
    window.myVintedAppInitialized = true;

    // --- 1. DEFINE AND MANAGE ALL APP ELEMENTS ---
    let appHost;
    let reopenBtnHost; // A separate host for the button

    function createElements() {
        // --- Main App Window ---
        if (!document.getElementById('my-auth-extension-container')) {
            appHost = document.createElement('div');
            appHost.id = 'my-auth-extension-container';
            document.body.prepend(appHost);
        } else {
            appHost = document.getElementById('my-auth-extension-container');
        }

        // --- Reopen Button Host and its Shadow DOM ---
        if (!document.getElementById('my-reopen-btn-container')) {
            reopenBtnHost = document.createElement('div');
            reopenBtnHost.id = 'my-reopen-btn-container';
            document.body.appendChild(reopenBtnHost);

            // Create a Shadow DOM for the button to isolate its styles
            const buttonShadowRoot = reopenBtnHost.attachShadow({ mode: 'open' });

            // Link the same stylesheet inside the button's Shadow DOM
            const buttonStyleLink = document.createElement('link');
            buttonStyleLink.rel = 'stylesheet';
            buttonStyleLink.href = chrome.runtime.getURL('styles/main.css');
            buttonShadowRoot.appendChild(buttonStyleLink);

            // Create the actual button and place it inside its Shadow DOM
            const reopenBtn = document.createElement('button');
            reopenBtn.id = 'reopen-app-btn';
            reopenBtn.innerHTML = `<svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>`;
            buttonShadowRoot.appendChild(reopenBtn);

            // Add the click listener to the button
            reopenBtn.onclick = () => {
                appHost.style.display = 'block';
                reopenBtnHost.style.display = 'none';
            };
        } else {
            reopenBtnHost = document.getElementById('my-reopen-btn-container');
        }

        // Initially hide the reopen button's host
        reopenBtnHost.style.display = 'none';

        // Add the listener for the 'close-app' event from the main app
        appHost.addEventListener('close-app', () => {
            appHost.style.display = 'none';
            reopenBtnHost.style.display = 'block';
        });
    }

    createElements(); // Initial creation

    // --- 2. SETUP THE MAIN APP'S SHADOW DOM AND UI ---
    const shadowRoot = appHost.attachShadow({ mode: 'open' });
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = chrome.runtime.getURL('styles/main.css');
    shadowRoot.appendChild(styleLink);

    const appContainer = document.createElement('div');
    appContainer.id = 'auth-app-content-wrapper';
    // **MODIFIED**: Start with a loading message immediately.
    appContainer.innerHTML = '<div id="auth-app-content"><p>Loading...</p></div>';
    shadowRoot.appendChild(appContainer);

    const loadView = async (viewName, status) => {
        try {
            // **MODIFIED**: The container is cleared and replaced, so the loading message is temporary.
            const viewHtmlUrl = chrome.runtime.getURL(`src/views/${viewName}/${viewName}.html`);
            const response = await fetch(viewHtmlUrl);
            if (!response.ok) throw new Error(`Failed to fetch ${viewName}.html: ${response.statusText}`);
            appContainer.innerHTML = await response.text();

            const viewJsUrl = chrome.runtime.getURL(`src/views/${viewName}/${viewName}.js`);
            const viewModule = await import(viewJsUrl);
            if (viewModule && typeof viewModule.init === 'function') {
                viewModule.init(status, shadowRoot);
            }
        } catch (error) {
            console.error(`Error loading view ${viewName}:`, error);
            appContainer.innerHTML = `<div id="auth-app-content"><p class="error">Error loading view. Please refresh.</p></div>`;
        }
    };

    // --- 3. UI ROUTER AND STATE MANAGEMENT ---
    let uiUpdater = (status) => {
        if (!status || !status.user) {
            loadView('login', status);
            return;
        }
        if (status.isEmailVerified === false) {
            loadView('verify_email', status);
        } else if (status.isSubscribed === false && status.hasHadTrial === false) {
            loadView('start_trial', status);
        } else if (status.isSubscribed === false && status.hasHadTrial === true) {
            loadView('no_subscription', status);
        } else if (status.isVintedVerified === false) {
            loadView('verify_account', status);
        } else {
            loadView('dashboard', status);
        }
    };

    appHost.addEventListener('auth-state-update', (e) => {
        uiUpdater(e.detail);
    });

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'USER_STATUS_CHANGED' && typeof uiUpdater === 'function') {
            uiUpdater(message.payload);
        }
    });

    // **MODIFIED**: The initial status check is now the single source of truth for the first load.
    try {
        console.log("CONTENT: Sending GET_USER_STATUS message to background."); // <-- ADD THIS LOG

        // MODIFIED: Added forceRefresh: true to the initial status request.
        const initialStatus = await chrome.runtime.sendMessage({ type: 'GET_USER_STATUS', forceRefresh: true });
        console.log("CONTENT: Received initial status from background:", initialStatus);

        uiUpdater(initialStatus);
    } catch (error) {

        console.warn("Could not get initial status. This is often normal on first load.", error.message);
        appContainer.innerHTML = `<div id="auth-app-content"><p class="error">Could not connect to services. Please refresh the page.</p></div>`;
    }


    // --- 4. FALLBACK/HEALING LOGIC ---
    setInterval(() => {
        if (!document.getElementById('my-auth-extension-container') || !document.getElementById('my-reopen-btn-container')) {
            console.log('Extension element missing, re-creating...');
            createElements();
        }
    }, 2000);
})();