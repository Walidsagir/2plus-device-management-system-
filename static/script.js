// Backend API base URL
const API_BASE_URL = "http://localhost:5000/api/auth";

// State tracker for Forgot Password 2FA step
let resetStep = 1;

// Helper: Allow pressing 'Enter' key inside inputs to trigger actions
function handleEnterKey(event, callbackFunction) {
    if (event.key === 'Enter') {
        callbackFunction();
    }
}
const signupTog = document.getElementById('tab-signup')
const loginTog = document.getElementById('tab-login')

const login = document.getElementById('view-login')
const signup = document.getElementById('view-signup')

// Switch between Login and Sign Up Tabs
// Switch between Login and Sign Up Tabs
function switchTab(tab) {
    const isSignup = (tab === 'signup');

    // Toggle active classes on the view containers
    login.classList.toggle('active', !isSignup);
    signup.classList.toggle('active', isSignup);

    // Toggle active classes on the tab buttons for visual feedback
    loginTog.classList.toggle('active', !isSignup);
    signupTog.classList.toggle('active', isSignup);

    // Ensure forgot password view is closed when switching tabs
    toggleForgotPassword(false);
}

// Event Listeners for Tab Buttons
loginTog.addEventListener('click', () => switchTab('login'));
signupTog.addEventListener('click', () => switchTab('signup'));

// Toggle Forgot Password View On/Off
function toggleForgotPassword(show) {
    document.getElementById('view-login').classList.toggle('active', !show);
    document.getElementById('view-forgot').classList.toggle('active', show);
    
    document.querySelector('.tab-switcher').style.display = show ? 'none' : 'flex';

    if (show) {
        resetForgotFormState();
    }
}

// Reset Forgot Password State
function resetForgotFormState() {
    resetStep = 1;
    document.getElementById('forgot-title').innerText = "Reset Your Password";
    document.getElementById('forgot-subtitle').innerText = "Enter your registered email address to receive a 2FA verification code.";
    
    const emailInput = document.getElementById('reset-email');
    emailInput.disabled = false;
    emailInput.value = '';
    
    document.getElementById('otp-step-fields').classList.toggle('hidden', true);
    document.getElementById('reset-otp').value = '';
    document.getElementById('reset-new-password').value = '';
    
    document.getElementById('btn-forgot-submit').innerText = "Send Verification Code";
}

// Toggle between Individual and Corporate Sign Up fields
function toggleAccountType(type) {
    const isCorporate = type === 'corporate';

    document.getElementById('label-individual').classList.toggle('active', !isCorporate);
    document.getElementById('label-corporate').classList.toggle('active', isCorporate);
    document.getElementById('corporate-fields').classList.toggle('hidden', !isCorporate);
}

// ================= FETCH API CALLS =================

// 1. Handle Login
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert("Please fill in all required fields.");
        return;
    }

    const payload = { email, password };

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
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
    const email = emailInput.value.trim();

    if (!email) {
        alert("Please enter your email address.");
        return;
    }

    if (resetStep === 1) {
        // STEP 1: Request OTP
        try {
            const response = await fetch(`${API_BASE_URL}/request-reset-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                resetStep = 2;
                document.getElementById('forgot-title').innerText = "Verify 2FA Code";
                document.getElementById('forgot-subtitle').innerText = `We've sent a 6-digit code to ${email}.`;
                
                emailInput.disabled = true;
                document.getElementById('otp-step-fields').classList.toggle('hidden', false);
                document.getElementById('btn-forgot-submit').innerText = "Verify & Reset Password";
            } else {
                alert(data.message || "Email address not found.");
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            alert("Server connection failed.");
        }

    } else if (resetStep === 2) {
        // STEP 2: Verify OTP and Reset Password
        const otpCode = document.getElementById('reset-otp').value.trim();
        const newPassword = document.getElementById('reset-new-password').value;

        if (!otpCode || !newPassword) {
            alert("Please provide both the OTP code and your new password.");
            return;
        }

        const payload = { email, otp_code: otpCode, new_password: newPassword };

        try {
            const response = await fetch(`${API_BASE_URL}/verify-reset-password`, {
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
    const email = document.getElementById('reset-email').value.trim();
    try {
        const response = await fetch(`${API_BASE_URL}/request-reset-otp`, {
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
    const accountType = document.querySelector('input[name="account_type"]:checked').value;
    const fullName = document.getElementById('signup-fullname').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const phone = document.getElementById('signup-phone').value.trim();
    const password = document.getElementById('signup-password').value;

    const orgName = document.getElementById('signup-orgname').value.trim();
    const orgReg = document.getElementById('signup-orgreg').value.trim();

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
        const response = await fetch(`${API_BASE_URL}/signup`, {
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
    
