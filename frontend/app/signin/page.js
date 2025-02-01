'use client';
import './SignInPage.css';
import { useState } from 'react';
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
    const [verificationToken, setVerificationToken] = useState(''); // Store verification_token
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpTimer, setOtpTimer] = useState(60);
    const [showOtpPopup, setShowOtpPopup] = useState(false);
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
            startOtpTimer();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP. Try again.');
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 6) {
            setFieldErrors({ otp: ['Please enter a valid 6-digit OTP.'] });
            return;
        }

        try {
            const response = await axios.post('http://65.2.140.129:8000/api/otp/verify/', {
                email,
                otp,
            });

            if (response.status === 200) {
                setIsEmailVerified(true);
                setVerificationToken(response.data.verification_token); // Store token
                setShowOtpPopup(false);
                setOtp('');
            } else {
                setFieldErrors({ otp: ['Invalid OTP. Please try again.'] });
            }
        } catch (err) {
            setFieldErrors({ otp: [err.response?.data?.message || 'Invalid OTP.'] });
        }
    };

    const startOtpTimer = () => {
        const interval = setInterval(() => {
            setOtpTimer((prev) => {
                if (prev === 1) clearInterval(interval);
                return prev - 1;
            });
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
                    verification_token: verificationToken, // Send stored token
                    profile: {
                        login_as: loginAs,
                        user_type: userType,
                    }
                }
            });

            if (response.status === 201) {
                console.log('Sign-up successful!');
                router.push('/login');
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
                    <input
                        type="text"
                        placeholder="Username"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="signin-input"
                        required
                    />

                    <div className="email-container">
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="signin-input"
                            required
                        />
                        <button
                            type="button"
                            className="otp-button"
                            onClick={handleSendOtp}
                            disabled={otpSent && otpTimer > 0}
                        >
                            {otpSent && otpTimer > 0 ? `Resend OTP in ${otpTimer}s` : 'Send OTP'}
                        </button>
                    </div>
                    {fieldErrors.email && <p className="signin-error">{fieldErrors.email[0]}</p>}

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="signin-input"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="signin-input"
                        required
                    />

                    <select
                        value={loginAs}
                        onChange={(e) => {
                            setLoginAs(e.target.value);
                            setUserType('');
                        }}
                        className="signin-input"
                        required
                    >
                        <option value="">Login As</option>
                        <option value="Individual">Individual</option>
                        <option value="Organization">Organization</option>
                    </select>

                    {loginAs && (
                        <select
                            value={userType}
                            onChange={(e) => setUserType(e.target.value)}
                            className="signin-input"
                            required
                        >
                            <option value="">Select Type of User</option>
                            {(loginAs === 'Individual' ? individualUserTypes : organizationUserTypes).map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    )}

                    <button type="submit" className="signin-button">Sign Up</button>
                </form>
                {error && <p className="signin-error">{error}</p>}

                {showOtpPopup && (
                    <div className="otp-popup">
                        <h2>Enter OTP</h2>
                        <input
                            type="text"
                            placeholder="6-digit OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="otp-input"
                            maxLength="6"
                        />
                        {fieldErrors.otp && <p className="signin-error">{fieldErrors.otp[0]}</p>}
                        <button className="verify-otp-button" onClick={handleVerifyOtp}>Verify OTP</button>
                        {otpSent && otpTimer > 0 ? (
                            <p>Resend OTP in {otpTimer}s</p>
                        ) : (
                            <button className="resend-otp-button" onClick={handleSendOtp}>Resend OTP</button>
                        )}
                    </div>
                )}

                <p className="signin-switch">
                    Already have an account?{' '}
                    <span onClick={() => router.push('/login')} className="signin-link">Login here</span>
                </p>
            </div>
        </section>
    );
}
