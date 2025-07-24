export function init(status, shadowRoot) {
    const backBtn = shadowRoot.getElementById('dashboard-back-btn');
    const accountBtn = shadowRoot.getElementById('dashboard-account-btn');
    const closeBtn = shadowRoot.getElementById('dashboard-close-btn');
    const titleEl = shadowRoot.getElementById('dashboard-title');

    // Robustness Check: Ensure all header elements were found
    if (!backBtn || !accountBtn || !closeBtn || !titleEl) {
        console.error("Dashboard header elements not found. Aborting init.");
        return;
    }

    // Listen for custom navigation events from any sub-view
    shadowRoot.addEventListener('change-dashboard-view', (e) => {
        const { viewName, context } = e.detail;
        loadSubView(viewName, status, shadowRoot, context);
    });

    // --- UPDATED: Back button always goes to features ---
    backBtn.addEventListener('click', () => {
        const event = new CustomEvent('change-dashboard-view', {
            detail: { viewName: 'features' },
            bubbles: true,
            composed: true
        });
        backBtn.dispatchEvent(event);
    });

    accountBtn.addEventListener('click', () => {
        const event = new CustomEvent('change-dashboard-view', {
            detail: { viewName: 'account_details' },
            bubbles: true,
            composed: true
        });
        shadowRoot.dispatchEvent(event);
    });
    
    closeBtn.addEventListener('click', () => {
        const appHost = shadowRoot.host;
        if (appHost) {
            appHost.style.display = 'none';
        }
    });

    // Load the main features view by default
    loadSubView('features', status, shadowRoot);

    async function loadSubView(viewName, status, shadowRoot, context = {}) {
        const contentContainer = shadowRoot.getElementById('dashboard-content');
        if (!contentContainer) return;

        contentContainer.innerHTML = '';
        const messageBox = shadowRoot.getElementById('message-box');
        if (messageBox) messageBox.style.display = 'none';

        // --- UPDATED: Header visibility logic ---
        const viewsWithoutBackButton = [
            'features',
            'progress_screen',
            'action_finished',
            'accept_description',
            'auto_message_active'
        ];

        if (viewsWithoutBackButton.includes(viewName)) {
            backBtn.style.display = 'none';
        } else {
            backBtn.style.display = 'flex';
        }

        accountBtn.style.display = viewName === 'features' ? 'block' : 'none';
        
        // Generate dynamic title
        let newTitle = "Dashboard"; // Default
        if (viewName === 'features') newTitle = 'Features';
        else if (viewName === 'account_details') newTitle = 'Account';
        else if (viewName === 'select_items' && context.featureName) newTitle = 'Select Items';
        else if (viewName === 'choose_description_type') newTitle = 'Choose Style';
        else if (viewName === 'start_message') newTitle = 'Auto Message';
        else if (viewName === 'start_action_generic' && context.featureName) {
                newTitle = context.featureName === 'autoLikes' ? 'Auto Like' : 'Auto Follow';
        }
        titleEl.textContent = newTitle;


        try {
            const viewHtmlUrl = chrome.runtime.getURL(`src/views/dashboard/${viewName}/${viewName}.html`);
            const response = await fetch(viewHtmlUrl);
            if (!response.ok) throw new Error(`Failed to fetch ${viewName}.html`);

            contentContainer.innerHTML = await response.text();

            const viewJsUrl = chrome.runtime.getURL(`src/views/dashboard/${viewName}/${viewName}.js`);
            const viewModule = await import(viewJsUrl);
            
            if (viewModule && typeof viewModule.init === 'function') {
                viewModule.init(status, shadowRoot, context);
            }
        } catch (error) {
            console.error(`Error loading sub-view ${viewName}:`, error);
            contentContainer.innerHTML = `<p class="error">Could not load this section.</p>`;
        }
    }
}