

// State tracker for Forgot Password 2FA step
let resetStep = 1;

// Top-level DOM references (initialized on DOMContentLoaded to avoid timing races)
let signupTog = null;
let loginTog = null;
let login = null;
let signup = null;

// Helper: Allow pressing 'Enter' key inside inputs to trigger actions
function handleEnterKey(event, callbackFunction) {
    if (event.key === 'Enter') {
        callbackFunction();
    }
}

// Switch between Login and Sign Up Tabs
// Switch between Login and Sign Up Tabs
function switchTab(tab) {
    const isSignup = (tab === 'signup');

    // Toggle active classes on the view containers
    if (login) login.classList.toggle('active', tab === 'login');
    if (signup) signup.classList.toggle('active', tab === 'signup');

    // Toggle active classes on the tab buttons for visual feedback
    if (loginTog) loginTog.classList.toggle('active', tab === 'login');
    if (signupTog) signupTog.classList.toggle('active', tab === 'signup');

    // Ensure forgot password view is closed when switching tabs
    toggleForgotPassword(false);
}

// Initialization after DOM is ready to avoid null element references
document.addEventListener('DOMContentLoaded', () => {
    signupTog = document.getElementById('tab-signup');
    loginTog = document.getElementById('tab-login');

    login = document.getElementById('view-login');
    signup = document.getElementById('view-signup');

    // Event Listeners for Tab Buttons (attach only if elements exist)
    if (loginTog) loginTog.addEventListener('click', () => switchTab('login'));
    if (signupTog) signupTog.addEventListener('click', () => switchTab('signup'));
});

// Toggle Forgot Password View On/Off
function toggleForgotPassword(show) {
    const viewLogin = document.getElementById('view-login');
    const viewForgot = document.getElementById('view-forgot');
    if (viewLogin) viewLogin.classList.toggle('active', !show);
    if (viewForgot) viewForgot.classList.toggle('active', show);
    
    const tabSwitcher = document.querySelector('.tab-switcher');
    if (tabSwitcher) tabSwitcher.style.display = show ? 'none' : 'flex';

    if (show) {
        resetForgotFormState();
    }
}

// Reset Forgot Password State
function resetForgotFormState() {
    resetStep = 1;
    const forgotTitle = document.getElementById('forgot-title');
    const forgotSubtitle = document.getElementById('forgot-subtitle');
    if (forgotTitle) forgotTitle.innerText = "Reset Your Password";
    if (forgotSubtitle) forgotSubtitle.innerText = "Enter your registered email address to receive a 2FA verification code.";
    
    const emailInput = document.getElementById('reset-email');
    if (emailInput) {
        emailInput.disabled = false;
        emailInput.value = '';
    }
    
    const otpFields = document.getElementById('otp-step-fields');
    if (otpFields) otpFields.classList.toggle('hidden', true);

    const resetOtp = document.getElementById('reset-otp');
    if (resetOtp) resetOtp.value = '';
    const resetNewPassword = document.getElementById('reset-new-password');
    if (resetNewPassword) resetNewPassword.value = '';
    
    const btnForgot = document.getElementById('btn-forgot-submit');
    if (btnForgot) btnForgot.innerText = "Send Verification Code";
}

// Toggle between Individual and Corporate Sign Up fields
function toggleAccountType(type) {
    const isCorporate = type === 'corporate';

    const labelIndividual = document.getElementById('label-individual');
    const labelCorporate = document.getElementById('label-corporate');
    const corporateFields = document.getElementById('corporate-fields');

    if (labelIndividual) labelIndividual.classList.toggle('active', !isCorporate);
    if (labelCorporate) labelCorporate.classList.toggle('active', isCorporate);
    if (corporateFields) corporateFields.classList.toggle('hidden', !isCorporate);
}

// ================= FETCH API CALLS =================

// 1. Handle Login
async function handleLogin() {
    const emailEl = document.getElementById('login-email');
    const pwdEl = document.getElementById('login-password');
    const email = emailEl ? emailEl.value.trim() : '';
    const password = pwdEl ? pwdEl.value : '';

    if (!email || !password) {
        alert("Please fill in all required fields.");
        return;
    }

    const payload = { email, password };

    try {
        const response = await fetch(`${API_BASE_URL || ''}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            console.log("Login Successful:", data);
            alert("Login successful!");
            // Redirect to dashboard or store auth token (e.g., localStorage.setItem('token', data.token))
        } else {
            alert(data.message || "Login failed. Please check your credentials.");
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        alert("Unable to connect to the server.");
    }
}

// 2. Handle 2-Step Forgot Password Flow
async function handleForgotPassword() {
    const emailInput = document.getElementById('reset-email');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email) {
        alert("Please enter your email address.");
        return;
    }

    if (resetStep === 1) {
        // STEP 1: Request OTP
        try {
            const response = await fetch('/request-reset-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                resetStep = 2;
                const forgotTitle = document.getElementById('forgot-title');
                const forgotSubtitle = document.getElementById('forgot-subtitle');
                if (forgotTitle) forgotTitle.innerText = "Verify 2FA Code";
                if (forgotSubtitle) forgotSubtitle.innerText = `We've sent a 6-digit code to ${email}.`;
                
                if (emailInput) emailInput.disabled = true;
                const otpFields = document.getElementById('otp-step-fields');
                if (otpFields) otpFields.classList.toggle('hidden', false);
                const btnForgot = document.getElementById('btn-forgot-submit');
                if (btnForgot) btnForgot.innerText = "Verify & Reset Password";
            } else {
                alert(data.message || "Email address not found.");
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            alert("Server connection failed.");
        }

    } else if (resetStep === 2) {
        // STEP 2: Verify OTP and Reset Password
        const otpEl = document.getElementById('reset-otp');
        const newPwdEl = document.getElementById('reset-new-password');
        const otpCode = otpEl ? otpEl.value.trim() : '';
        const newPassword = newPwdEl ? newPwdEl.value : '';

        if (!otpCode || !newPassword) {
            alert("Please provide both the OTP code and your new password.");
            return;
        }

        const payload = { email, otp_code: otpCode, new_password: newPassword };

        try {
            const response = await fetch('/verify-reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                alert("Password successfully reset! You can now log in.");
                toggleForgotPassword(false);
            } else {
                alert(data.message || "Invalid OTP or request failed.");
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            alert("Server connection failed.");
        }
    }
}

// 3. Handle Resend OTP
async function resendOTP() {
    const emailEl = document.getElementById('reset-email');
    const email = emailEl ? emailEl.value.trim() : '';
    try {
        const response = await fetch('/request-reset-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (response.ok) {
            alert(`A new verification code has been sent to ${email}`);
        } else {
            alert("Failed to resend code.");
        }
    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

// 4. Handle Sign Up
async function handleSignUp() {
    const accountTypeEl = document.querySelector('input[name="account_type"]:checked');
    const accountType = accountTypeEl ? accountTypeEl.value : 'individual';
    const fullNameEl = document.getElementById('signup-fullname');
    const emailEl = document.getElementById('signup-email');
    const phoneEl = document.getElementById('signup-phone');
    const passwordEl = document.getElementById('signup-password');
    const fullName = fullNameEl ? fullNameEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';
    const phone = phoneEl ? phoneEl.value.trim() : '';
    const password = passwordEl ? passwordEl.value : '';

    const orgNameEl = document.getElementById('signup-orgname');
    const orgRegEl = document.getElementById('signup-orgreg');
    const orgName = orgNameEl ? orgNameEl.value.trim() : '';
    const orgReg = orgRegEl ? orgRegEl.value.trim() : '';

    if (!fullName || !email || !phone || !password || (accountType === 'corporate' && !orgName)) {
        alert("Please complete all required fields.");
        return;
    }

    const payload = {
        account_type: accountType,
        full_name: fullName,
        email: email,
        phone: phone,
        password: password,
        organization_name: accountType === 'corporate' ? orgName : null,
        registration_no: accountType === 'corporate' ? orgReg : null
    };

    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            alert("Account created successfully!");
            switchTab('login');
        } else {
            alert(data.message || "Sign up failed.");
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        alert("Unable to connect to the server.");
    }
}
    
