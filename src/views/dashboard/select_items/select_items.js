// src/views/dashboard/select_items/select_items.js
export function init(status, shadowRoot, viewContext) {
    // --- NEW: Back button logic ---
    const backBtn = shadowRoot.getElementById('back-to-main-btn');
    backBtn?.addEventListener('click', () => {
        const event = new CustomEvent('change-dashboard-view', {
            detail: { viewName: 'features' },
            bubbles: true, composed: true
        });
        backBtn.dispatchEvent(event);
    });
    // --- End of new logic ---

    const titleEl = shadowRoot.getElementById('select-items-title');
    if (titleEl && viewContext.featureName) {
        // Example: "Select Items for Auto Likes"
        const featureText = viewContext.featureName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        titleEl.textContent = `Select Items for ${featureText}`;
    }

    const performBtn = shadowRoot.getElementById('perform-action-btn');
    performBtn?.addEventListener('click', () => {
        // Dispatch an event to tell the dashboard router to change views
        const event = new CustomEvent('change-dashboard-view', {
            detail: { 
                viewName: 'progress_screen', 
                context: { featureName: viewContext.featureName }
            },
            bubbles: true,
            composed: true
        });
        performBtn.dispatchEvent(event);
    });
}