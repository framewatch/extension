// Replace all code in src/views/dashboard/accept_description/accept_description.js

export function init(status, shadowRoot, viewContext) {
    // Get the items passed from the progress screen
    const items = viewContext.itemsToReview || [];
    let currentIndex = 0;

    // If there are no items, show an error and stop.
    if (items.length === 0) {
        shadowRoot.innerHTML = `<p class="feedback error" style="display: block; margin-top: 20px;">No descriptions were generated to review.</p>`;
        return;
    }

    const counterEl = shadowRoot.getElementById('item-counter');
    const descriptionEl = shadowRoot.getElementById('ai-description-text');
    const imageEl = shadowRoot.getElementById('item-image-mock');
    const errorEl = shadowRoot.getElementById('review-error-message');

    const backBtn = shadowRoot.getElementById('back-btn');
    const forwardBtn = shadowRoot.getElementById('forward-btn');
    const acceptBtn = shadowRoot.getElementById('accept-btn');
    const denyBtn = shadowRoot.getElementById('deny-btn');
    const finishBtn = shadowRoot.getElementById('finish-review-btn');

    function renderItem() {
        const item = items[currentIndex];

        // Update item details
        counterEl.textContent = `Item ${currentIndex + 1}/${items.length}`;
        descriptionEl.textContent = item.generatedDescription; // Display the AI description

        // Update visual feedback based on choice (if any)
        imageEl.style.borderColor = item.choice === 'accepted' ? '#0095f6' : (item.choice === 'denied' ? '#ed4956' : 'transparent');

        // Update navigation button states
        backBtn.disabled = currentIndex === 0;
        forwardBtn.disabled = currentIndex === items.length - 1;

        errorEl.style.display = 'none';
    }

    acceptBtn?.addEventListener('click', () => {
        items[currentIndex].choice = 'accepted';
        renderItem();
    });

    denyBtn?.addEventListener('click', () => {
        items[currentIndex].choice = 'denied';
        renderItem();
    });

    backBtn?.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            renderItem();
        }
    });

    forwardBtn?.addEventListener('click', () => {
        if (currentIndex < items.length - 1) {
            currentIndex++;
            renderItem();
        }
    });

    finishBtn?.addEventListener('click', () => {
        const unselectedItem = items.find(item => !item.choice);
        if (unselectedItem) {
            const itemNumber = items.indexOf(unselectedItem) + 1;
            errorEl.textContent = `A choice has not been made for item ${itemNumber}.`;
            errorEl.style.display = 'block';
        } else {
            // All items reviewed, proceed to the final update screen
            const event = new CustomEvent('change-dashboard-view', {
                detail: {
                    viewName: 'action_finished',
                    context: {
                       apiResponse: {
                           success: true,
                           data: { message: "All descriptions have been processed." }
                       }
                    }
                },
                bubbles: true,
                composed: true
            });
            finishBtn.dispatchEvent(event);
        }
    });

    // Initial render of the first item
    renderItem();
}