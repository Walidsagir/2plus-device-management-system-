
        let resetStep = 1;

        console.log('✅ 2PT-DMS Auth System Loaded');
        
        const loginBtn = document.getElementById('tab-login');
        
        const signupBtn = document.getElementById('tab-signup');
        
        const  tabSwitcherBtns = document.getElementsByClassName('tab-switcher')[0];
        
        const forgotPasswordBtn = document.getElementById('forgot-password');
        
        
        
        
        const login = document.getElementById('view-login');
        
        const signup = document.getElementById('view-signup');
        
        const forgotPassword = document.getElementById('view-forgot');
        
        
        
        signupBtn.addEventListener('click',()=>{
            switchTab('signup');
        })
        
        loginBtn.addEventListener('click',()=>{
            switchTab('login');
            
        })
        forgotPasswordBtn.addEventListener('click',()=>{
            switchTab('forgot-password');
            
        })
        
        function switchTab(tab){
            signup.classList.toggle('hidden',tab !== 'signup');
            signupBtn.classList.toggle('active',tab === 'signup');
            
            login.classList.toggle('hidden',tab !== 'login');
               loginBtn.classList.toggle('active',tab === 'login');
               forgotPassword.classList.toggle('hidden',tab !== 'forgot-password');
               
               tabSwitcherBtns.classList.toggle('hidden',(tab !== 'login') && (tab !== 'signup'));
        }


        function toggleAccountType(type) {
            console.log('👤 Toggle account type:', type);
            
            const individual = document.getElementById('label-individual');
            const corporate = document.getElementById('label-corporate');
            const fields = document.getElementById('corporate-fields');

            if (type === 'corporate') {
                individual.classList.remove('active');
                corporate.classList.add('active');
                fields.classList.remove('hidden');
            } else {
                corporate.classList.remove('active');
                individual.classList.add('active');
                fields.classList.add('hidden');
            }
        }

        function resetForgotFormState() {
            resetStep = 1;
            document.getElementById('forgot-title').innerText = 'Reset Password';
            document.getElementById('forgot-subtitle').innerText = 'Enter your email to receive a verification code.';
            document.getElementById('step-1-group').classList.remove('hidden');
            document.getElementById('step-2-group').classList.add('hidden');
            document.getElementById('btn-forgot-submit').innerText = 'Send Code';
            document.getElementById('reset-email').disabled = false;
            document.getElementById('reset-email').value = '';
            document.getElementById('reset-otp').value = '';
            document.getElementById('reset-new-password').value = '';
        }

        async function handleLogin() {
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            if (!email || !password) {
                errorMsg('❌ Please fill in all fields');
                return;
            }
            const payload = {email:email,password:password}
            const headers ={"Content-Type":"application/json"}
            const res = await fetch("/login",{
                    method:"post",
                    body:JSON.stringify(payload),
                    headers:headers
            });
            if (res.ok){
                    const data = await res.json()
                    if(data.status =='success'){
                            successMsg(data.message);
                            window.location.href = "/dashboard";
                    }else{
                         errorMsg(data.message);
                    }
            }else{
                    err= await res.text
                    errorMsg(err);
            }
        }

        async function handleSignUp() {
            console.log('✍️ Signup clicked');
            
            const accountType = document.querySelector('input[name="account_type"]:checked').value;
            const firstName = document.getElementById('signup-firstname').value.trim();
            const lastName = document.getElementById('signup-lastname').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const phone = document.getElementById('signup-phone').value.trim();
            const password = document.getElementById('signup-password').value;
            const address = document.getElementById('address').value.trim();
            
            let is_organization = false;
            let orgName = '';
            let orgReg = '';

            if (!firstName ||!lastName || !email || !phone || !password || !address) {
                alert('❌ Please fill in all required fields');
                return;
            };

            if (accountType === 'corporate') {
                is_organization = true;
                orgName = document.getElementById('signup-orgname').value.trim();
                orgReg = document.getElementById('signup-orgreg').value.trim();
                if (!orgName || !orgReg) {
                    alert('❌ Please provide business details');
                    return;
                }
            }
            const payload = {
                    email:email,
                    address: address,
                    first_name:firstName,
                    last_name:lastName,
                    password:password,
                    is_organization:is_organization,
                    phone_number:phone,
                    account_type:accountType,
                    organization_name: orgName,
                    organization_registration:orgReg
            }
            const header = {
                    "Content-Type":"application/json"
            }
            const res = await fetch("/signup",{
                    method:'post',
                    body : JSON.stringify(payload),
                    headers:header
            })
            if (res.ok){
                    successMsg("Account created successfully");
            }else{
                    errorMsg(res.text);
            }
            //alert('✅ Account created!\n\n' + fullName + '\n' + email);
            switchTab('login');
        }

        function handleForgotPassword() {
            const email = document.getElementById('reset-email').value.trim();

            if (!email) {
                alert('❌ Please enter your email');
                return;
            }

            if (resetStep === 1) {
                alert('✅ Code sent to ' + email);
                resetStep = 2;
                document.getElementById('forgot-title').innerText = 'Verify Code';
                document.getElementById('forgot-subtitle').innerText = 'Enter the 6-digit code';
                document.getElementById('step-1-group').classList.add('hidden');
                document.getElementById('step-2-group').classList.remove('hidden');
                document.getElementById('reset-email').disabled = true;
                document.getElementById('btn-forgot-submit').innerText = 'Verify & Reset';
            } else if (resetStep === 2) {
                const otp = document.getElementById('reset-otp').value.trim();
                const newPassword = document.getElementById('reset-new-password').value;

                if (!otp || !newPassword) {
                    alert('❌ Please fill in all fields');
                    return;
                }

                alert('✅ Password reset successful!');
                switchTab('login');
            }
        }

        function resendOTP() {
            alert('✅ Code resent');
        }
// Create a reusable toast function
function showToast(message, type = "success") {
    // Create container if it doesn't exist
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = message;

    // Append to container
    container.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add("fade-out");
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Success and error wrappers
function successMsg(message) {
    showToast(message, "success");
}

function errorMsg(message) {
    showToast(message, "error");
}

                                           
