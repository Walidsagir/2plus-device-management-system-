// State tracker for Forgot Password 2FA step
let resetStep = 1; // Step 1: Request OTP, Step 2: Verify OTP & Change Password

// Switch between Login and Sign Up Tabs using .toggle()
function switchTab(tab) {
    const isLogin = tab === 'login';

    // Toggle Tab Button Active States
    document.getElementById('tab-login').classList.toggle('active', isLogin);
    document.getElementById('tab-signup').classList.toggle('active', !isLogin);

    // Toggle Form Visibility
    document.getElementById('form-login').classList.toggle('active', isLogin);
    document.getElementById('form-signup').classList.toggle('active', !isLogin);

    // Reset forgot password view whenever switching main tabs
    toggleForgotPassword(false);
}

// Toggle Forgot Password View On/Off using .toggle()
function toggleForgotPassword(show) {
    const loginForm = document.getElementById('form-login');
    const forgotForm = document.getElementById('form-forgot');
    const tabSwitcher = document.querySelector('.tab-switcher');

    loginForm.classList.toggle('active', !show);
    forgotForm.classList.toggle('active', show);
    
    // Hide/Show Tab Switcher
    tabSwitcher.style.display = show ? 'none' : 'flex';

    if (show) {
        resetForgotFormState(); // Reset form to Step 1 upon opening
    }
}

// Reset Forgot Password Form to Step 1 state
function resetForgotFormState() {
    resetStep = 1;
    document.getElementById('forgot-title').innerText = "Reset Your Password";
    document.getElementById('forgot-subtitle').innerText = "Enter your registered email address to receive a 2FA verification code.";
    
    document.getElementById('group-reset-email').style.display = "block";
    document.getElementById('reset-email').removeAttribute('disabled');
    
    // Hide OTP fields using toggle
    document.getElementById('otp-step-fields').classList.toggle('hidden', true);
    
    document.getElementById('reset-otp').removeAttribute('required');
    document.getElementById('reset-new-password').removeAttribute('required');
    
    document.getElementById('btn-forgot-submit').innerText = "Send Verification Code";
}

// Handle 2-Step Forgot Password Submission
function handleForgotPassword(event) {
    event.preventDefault();

    const emailInput = document.getElementById('reset-email');
    const email = emailInput.value;

    if (resetStep === 1) {
        // STEP 1: Request 2FA OTP Payload
        const payload = { email: email };
        console.log("STEP 1: Requesting 2FA OTP Payload:", payload);
        // TODO: fetch('POST /api/auth/request-reset-otp', { body: JSON.stringify(payload) })

        // Transition UI to Step 2
        resetStep = 2;
        document.getElementById('forgot-title').innerText = "Verify 2FA Code";
        document.getElementById('forgot-subtitle').innerText = `We've sent a 6-digit code to ${email}. Check your inbox.`;
        
        // Lock email input and reveal OTP/Password fields using toggle
        emailInput.setAttribute('disabled', 'true');
        document.getElementById('otp-step-fields').classList.toggle('hidden', false);
        
        document.getElementById('reset-otp').setAttribute('required', 'true');
        document.getElementById('reset-new-password').setAttribute('required', 'true');
        
        document.getElementById('btn-forgot-submit').innerText = "Verify & Reset Password";

    } else if (resetStep === 2) {
        // STEP 2: Submit OTP & New Password to Backend
        const otpCode = document.getElementById('reset-otp').value;
        const newPassword = document.getElementById('reset-new-password').value;

        const payload = {
            email: email,
            otp_code: otpCode,
            new_password: newPassword
        };

        console.log("STEP 2: Reset Password Payload:", payload);
        // TODO: fetch('POST /api/auth/verify-reset-password', { body: JSON.stringify(payload) })

        alert("Password successfully reset! Please login with your new password.");
        toggleForgotPassword(false);
    }
}

// Resend OTP Action
function resendOTP() {
    const email = document.getElementById('reset-email').value;
    console.log("Resending 2FA OTP to:", email);
    alert(`A new verification code has been sent to ${email}`);
}

// Toggle between Individual and Corporate Sign Up fields using .toggle()
function toggleAccountType(type) {
    const isCorporate = type === 'corporate';

    // Toggle active state classes on option pill labels
    document.getElementById('label-individual').classList.toggle('active', !isCorporate);
    document.getElementById('label-corporate').classList.toggle('active', isCorporate);

    // Toggle corporate extra input fields visibility
    document.getElementById('corporate-fields').classList.toggle('hidden', !isCorporate);

    // Handle required attributes
    const orgNameInput = document.getElementById('signup-orgname');
    const orgRegInput = document.getElementById('signup-orgreg');

    if (isCorporate) {
        orgNameInput.setAttribute('required', 'true');
    } else {
        orgNameInput.removeAttribute('required');
        orgNameInput.value = '';
        orgRegInput.value = '';
    }
}

// Handle Login Submission -> Send Payload to Python API
function handleLogin(event) {
    event.preventDefault();
    
    const payload = {
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
    };

    console.log("Sending Login Payload to Backend:", payload);
    // TODO: Connect fetch API -> POST /api/auth/login
}

// Handle Sign Up Submission -> Send Payload to Python API
function handleSignUp(event) {
    event.preventDefault();

    const accountType = document.querySelector('input[name="account_type"]:checked').value;

    const payload = {
        account_type: accountType, // 'individual' or 'corporate'
        full_name: document.getElementById('signup-fullname').value,
        email: document.getElementById('signup-email').value,
        phone: document.getElementById('signup-phone').value,
        password: document.getElementById('signup-password').value,
        organization_name: accountType === 'corporate' ? document.getElementById('signup-orgname').value : null,
        registration_no: accountType === 'corporate' ? document.getElementById('signup-orgreg').value : null
    };

    console.log("Sending Sign Up Payload to Backend:", payload);
    // TODO: Connect fetch API -> POST /api/auth/signup
}
