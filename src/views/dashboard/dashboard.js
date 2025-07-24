export function init(status, shadowRoot) {
    // Listen for custom navigation events from any sub-view
    shadowRoot.addEventListener('change-dashboard-view', (e) => {
        const { viewName, context } = e.detail;
        loadSubView(viewName, status, shadowRoot, context);
    });

    // Load the main features view by default when the dashboard initializes
    loadSubView('features', status, shadowRoot);
}

// The context parameter is used to pass data between views
async function loadSubView(viewName, status, shadowRoot, context = {}) {
    const contentContainer = shadowRoot.getElementById('dashboard-content');
    if (!contentContainer) return;

    contentContainer.innerHTML = '';
    const messageBox = shadowRoot.getElementById('message-box');
    if (messageBox) messageBox.style.display = 'none';

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