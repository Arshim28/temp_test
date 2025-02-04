'use client';
import './SignInPage.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function SignInPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loginAs, setLoginAs] = useState('');
    const [userType, setUserType] = useState('');
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [verificationToken, setVerificationToken] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpTimer, setOtpTimer] = useState(60);
    const [showOtpPopup, setShowOtpPopup] = useState(false);
    const [resendDisabled, setResendDisabled] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');

    const router = useRouter();
    const individualUserTypes = ['Interest', 'Investor'];
    const organizationUserTypes = ['NBFC', 'Banker', 'Land Broker'];

    const handleSendOtp = async () => {
        if (!email) {
            setFieldErrors({ email: ['Please enter your email first.'] });
            return;
        }

        try {
            await axios.post('http://65.2.140.129:8000/api/otp/request/', { email });
            setOtpSent(true);
            setShowOtpPopup(true);
            setOtpTimer(60);
            setResendDisabled(true);
            startOtpTimer();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP. Try again.');
        }
    };

    const handleVerifyOtp = async () => {
        console.log('Verifying OTP:', otp); // Debugging

        if (!otp || otp.length !== 6) {
            setFieldErrors({ otp: ['Please enter a valid 6-digit OTP.'] });
            return;
        }

        try {
            const response = await axios.post('http://65.2.140.129:8000/api/otp/verify/', { email, otp });

            if (response.status === 200) {
                setIsEmailVerified(true);
                setVerificationToken(response.data.verification_token);
                setSuccessMessage('OTP Verified Successfully!'); // ✅ Show success message
                setOtp(''); // Clear OTP field

                // ✅ Wait for 2 seconds before closing the popup
                setTimeout(() => {
                    setShowOtpPopup(false);
                    setSuccessMessage('');
                }, 2000);
            } else {
                setFieldErrors({ otp: ['Invalid OTP. Please try again.'] });
            }
        } catch (err) {
            setFieldErrors({ otp: [err.response?.data?.message || 'Invalid OTP.'] });
        }
    };


    const startOtpTimer = () => {
        let countdown = 60;
        const interval = setInterval(() => {
            countdown -= 1;
            setOtpTimer(countdown);
            if (countdown === 0) {
                clearInterval(interval);
                setResendDisabled(false);
            }
        }, 1000);
    };

    const handleSignIn = async (e) => {
        e.preventDefault();
        if (!isEmailVerified) {
            setFieldErrors({ email: ['Please verify your email before signing up.'] });
            return;
        }
        if (password !== confirmPassword) {
            setFieldErrors({ password: ['Passwords do not match.'] });
            return;
        }
        if (!loginAs) {
            setFieldErrors({ loginAs: ['Please select an option.'] });
            return;
        }
        if (!userType) {
            setFieldErrors({ userType: ['Please select a type of user.'] });
            return;
        }

        setFieldErrors({});
        setError('');

        try {
            const response = await axios.post('http://65.2.140.129:8000/api/users/', {
                user: {
                    name,
                    email,
                    password,
                    verification_token: verificationToken,
                    profile: {
                        login_as: loginAs,
                        user_type: userType,
                    }
                }
            });

            if (response.status === 201) {

                const token = response.data.user.token;
                console.log("token", token);
                if (token) {
                    console.log('Login successful!', token);
                    localStorage.setItem('authToken', token);
                    router.push('/dashboard');
                }
            }
        } catch (err) {
            if (err.response?.data?.user) {
                setFieldErrors(err.response.data.user);
            } else {
                setError(err.response?.data?.message || 'Something went wrong. Please try again.');
            }
        }
    };

    return (
        <section className="signin-section">
            <div className="signin-content">
                <h1>Create Your Account</h1>
                <form onSubmit={handleSignIn} className="signin-form">
                    <input type="text" placeholder="Username" value={name} onChange={(e) => setName(e.target.value)} className="signin-input" required />
                    <div className="email-container">
                        <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="signin-input" required />
                        <button type="button" className="otp-button" onClick={handleSendOtp}>Send OTP</button>
                    </div>
                    {fieldErrors.email && <p className="signin-error">{fieldErrors.email[0]}</p>}
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="signin-input" required />
                    <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="signin-input" required />
                    <select value={loginAs} onChange={(e) => { setLoginAs(e.target.value); setUserType(''); }} className="signin-input" required>
                        <option value="">Login As</option>
                        <option value="Individual">Individual</option>
                        <option value="Organization">Organization</option>
                    </select>
                    {loginAs && <select value={userType} onChange={(e) => setUserType(e.target.value)} className="signin-input" required>
                        <option value="">Select Type of User</option>
                        {(loginAs === 'Individual' ? individualUserTypes : organizationUserTypes).map((type) => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>}
                    <button type="submit" className="signin-button">Sign Up</button>
                </form>

                {showOtpPopup && (
                    <>
                        <div className="otp-overlay" />
                        <div className="otp-popup">
                            <button className="close-button" onClick={() => setShowOtpPopup(false)}>×</button>
                            <h2>Enter OTP</h2>
                            <p>OTP sent to {email}</p>

                            {/* ✅ Show success message OR OTP input */}
                            {successMessage ? (
                                <p className="otp-success">{successMessage}</p>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        placeholder="6-digit OTP"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="otp-input"
                                        maxLength="6"
                                    />
                                    <button className="verify-otp-button" onClick={handleVerifyOtp}>
                                        Verify OTP
                                    </button>
                                </>
                            )}

                            {/* ✅ Hide buttons if success message is showing */}
                            {!successMessage && (
                                resendDisabled ? (
                                    <p className="resend-otp-text">Resend OTP in {otpTimer}s</p>
                                ) : (
                                    <button className="resend-otp-button" onClick={handleSendOtp}>Resend OTP</button>
                                )
                            )}

                        </div>
                    </>
                )}
                <p className="signin-switch">
                    Already have an account?{' '}
                    <span onClick={() => router.push('/login')} className="signin-link">Login here</span>
                </p>

            </div>
        </section>
    );
}
