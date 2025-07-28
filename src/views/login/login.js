import { getFriendlyErrorMessage } from '../../error-dictionary.js';

export function init(status, shadowRoot) {
    const loginBtn = shadowRoot.getElementById('login-btn');
    loginBtn?.addEventListener('click', () => handleLogin(shadowRoot));
}

async function handleLogin(shadowRoot) {
    const emailInput = shadowRoot.getElementById('email-input');
    const passwordInput = shadowRoot.getElementById('password-input');
    const errorEl = shadowRoot.getElementById('error-message');
    const loginBtn = shadowRoot.getElementById('login-btn');

    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
        errorEl.textContent = getFriendlyErrorMessage('all-fields-required');
        errorEl.style.display = 'block';
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    errorEl.style.display = 'none';

    const response = await chrome.runtime.sendMessage({ type: 'LOGIN', payload: { email, password } });

    if (response.success) {
        const event = new CustomEvent('auth-state-update', {
            detail: response.status,
            bubbles: true,
            composed: true
        });
        loginBtn.dispatchEvent(event);
    } else {
        errorEl.textContent = response.error;
        errorEl.style.display = 'block';
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }
}