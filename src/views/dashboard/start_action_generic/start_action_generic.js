// src/views/dashboard/start_action_generic/start_action_generic.js
export function init(status, shadowRoot, viewContext) {
    const { featureName } = viewContext;

    const startBtn = shadowRoot.getElementById('start-generic-action-btn');
    const targetInput = shadowRoot.getElementById('target-input');
    const quantityInput = shadowRoot.getElementById('quantity-input'); // Get quantity input
    const targetInputLabel = shadowRoot.getElementById('target-input-label');
    const errorEl = shadowRoot.getElementById('generic-action-error'); // Get error element
    const targetTypeRadios = shadowRoot.querySelectorAll('input[name="target_type"]');

    const actionWord = featureName === 'autoLikes' ? 'Like' : 'Follow';
    
    startBtn.textContent = `Start ${actionWord}`;

    function updateTargetInput(targetType) {
        if (targetType === 'user') {
            targetInputLabel.textContent = 'Username';
            targetInput.placeholder = 'Enter username...';
        } else {
            targetInputLabel.textContent = 'Keyword';
            targetInput.placeholder = 'Enter keyword...';
        }
    }

    targetTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => updateTargetInput(radio.value));
    });

    startBtn?.addEventListener('click', () => {
        const targetValue = targetInput.value.trim();
        const quantityValue = quantityInput.value;

        // --- NEW: Validation Check ---
        if (!targetValue || !quantityValue) {
            errorEl.textContent = 'All fields are required.';
            errorEl.style.display = 'block';
            return; // Stop the function
        }
        
        // Hide error if validation passes
        errorEl.style.display = 'none';

        const settings = {
            targetType: shadowRoot.querySelector('input[name="target_type"]:checked').value,
            targetValue: targetValue,
            quantity: quantityValue
        };

        const event = new CustomEvent('change-dashboard-view', {
            detail: {
                viewName: 'progress_screen',
                context: {
                    featureName,
                    actionType: 'finalUpdate',
                    apiResponse: {
                        success: true,
                        data: { message: `${actionWord} action has started.` }
                    }
                }
            },
            bubbles: true, composed: true
        });
        startBtn.dispatchEvent(event);
    });

    // Initial setup
    updateTargetInput('user');
}