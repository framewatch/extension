
// src/views/dashboard/choose_description_type/choose_description_type.js
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

    const proceedBtn = shadowRoot.getElementById('proceed-to-select-items-btn');

    proceedBtn?.addEventListener('click', () => {
        // Find the selected radio button
        const selectedType = shadowRoot.querySelector('input[name="desc_type"]:checked').value;
        
        // Navigate to the item selection screen, passing the chosen type in the context
        const event = new CustomEvent('change-dashboard-view', {
            detail: {
                viewName: 'select_items',
                context: {
                    featureName: 'aiDescriptions', // Keep passing the original feature name
                    descriptionType: selectedType  // Add the newly selected type
                }
            },
            bubbles: true,
            composed: true
        });
        proceedBtn.dispatchEvent(event);
    });
}