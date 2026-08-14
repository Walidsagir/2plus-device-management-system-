
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

        function handleLogin() {
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            if (!email || !password) {
                alert('❌ Please fill in all fields');
                return;
            }

            alert('✅ Login successful!');
        }

        function handleSignUp() {
            console.log('✍️ Signup clicked');
            
            const accountType = document.querySelector('input[name="account_type"]:checked').value;
            const fullName = document.getElementById('signup-fullname').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const phone = document.getElementById('signup-phone').value.trim();
            const password = document.getElementById('signup-password').value;

            if (!fullName || !email || !phone || !password) {
                alert('❌ Please fill in all required fields');
                return;
            }

            if (accountType === 'corporate') {
                const orgName = document.getElementById('signup-orgname').value.trim();
                const orgReg = document.getElementById('signup-orgreg').value.trim();
                if (!orgName || !orgReg) {
                    alert('❌ Please provide business details');
                    return;
                }
            }

            alert('✅ Account created!\n\n' + fullName + '\n' + email);
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
                                           
