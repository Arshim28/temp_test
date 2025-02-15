'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaGoogle, FaFacebook, FaApple, FaArrowLeft } from 'react-icons/fa';

export default function SigninRegisterPage() {
    const [step, setStep] = useState('signIn');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [purpose, setPurpose] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [verificationToken, setVerificationToken] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [previousStep, setPreviousStep] = useState(null); // Track previous step

    const router = useRouter();

    const handleBack = () => {
        if (step === 'enterOtp') {
            setStep('forgotPassword');
        } else if (step === 'resetPassword') {
            setStep('enterOtp');
        } else if (step === 'forgotPassword') {
            setStep('signIn');
        } else if (step === 'registerForm') {
            setStep('registerOtp');
        } else if (step === 'registerOtp') {
            setStep('register');
        } else {
            setStep('signIn');
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const response = await axios.post('http://65.2.140.129:8000/api/users/login/', {
                user: { email, password },
            });
            localStorage.setItem('authToken', response.data.token);
            router.push('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://65.2.140.129:8000/api/users/forgot-password/', { email });
            setStep('enterOtp');
        } catch (err) {
            setError('Error sending OTP. Try again.');
        }
    };

    const handleGetOtp = async () => {
        try {
            const response = await axios.post('http://65.2.140.129:8000/api/otp/request/', { email });

            if (response.status === 200) {
                setPreviousStep(step);
                setStep('enterOtp'); // Move to Enter OTP step on success
            }
        } catch (error) {
            console.error('Error requesting OTP:', error);
            alert('Failed to send OTP. Please try again.');
        }
    };

    const handleVerifyOtp = async () => {
        console.log('Verifying OTP:', otp, email); // Debugging
        try {
            const response = await axios.post('http://65.2.140.129:8000/api/otp/verify/', { email, otp });

            if (response.status === 200) {
                setVerificationToken(response.data.verification_token); // Store verification token
                if (previousStep === 'forgotPassword') {
                    setStep('resetPassword'); // If from Forgot Password, go to Reset Password
                } else if (previousStep === 'register') {
                    setStep('fillForm'); // If from Register, go to Fill Form
                }// Move to Reset Password screen
            }
        } catch (error) {
            console.error('OTP verification failed:', error);
            alert('Invalid OTP. Please try again.');
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        try {
            await axios.post('http://65.2.140.129:8000/api/users/reset-password/', { email, password });
            setStep('signIn');
        } catch (err) {
            setError('Error resetting password.');
        }
    };



    const handleRegisterSubmit = async (e) => {
        e.preventDefault();

        // Validation checks
        if (password !== confirmPassword) {
            setError({ password: ['Passwords do not match.'] });
            return;
        }
        if (!name) {
            setError({ name: ['Name is required.'] });
            return;
        }
        if (!address) {
            setError({ address: ['Address is required.'] });
            return;
        }
        if (!purpose) {
            setError({ purpose: ['Purpose of use is required.'] });
            return;
        }

        setError({});
        setError('');

        try {
            const response = await axios.post('http://65.2.140.129:8000/api/users/', {
                user: {
                    name,
                    email,
                    password,
                    verification_token: verificationToken,
                    profile: {
                        address,
                        purpose_of_use: purpose,
                    }
                }
            });

            if (response.status === 201) {
                const token = response.data.user.token;
                console.log("Registration successful! Token:", token);

                if (token) {
                    localStorage.setItem('authToken', token);
                    router.push('/dashboard'); // Redirect after successful registration
                }
            }
        } catch (err) {
            if (err.response?.data?.user) {
                setError(err.response.data.user);
            } else {
                setError(err.response?.data?.message || 'Something went wrong. Please try again.');
            }
        }
    };

    const renderForm = () => {
        return (
            <div className="shadow-none p-4 w-100 text-center" style={{ maxWidth: '400px' }}>
                <h1 className="mb-4">Terrastack AI</h1>

                {(step === 'signIn' || step === 'register') && (
                    <div
                        className="d-flex justify-content-between mb-3"
                        style={{
                            backgroundColor: '#D9D9D9',
                            borderRadius: '8px',
                            width: '100%',
                            height: '48px',  // Matches button height
                            display: 'flex',
                            alignItems: 'center',  // Centers the buttons inside
                        }}
                    >
                        <h3
                            className="w-50 text-center m-0"
                            style={{
                                cursor: 'pointer',
                                borderRadius: '8px',
                                backgroundColor: step === 'signIn' ? 'white' : 'transparent',
                                fontWeight: step === 'signIn' ? 'bold' : 'normal',
                                lineHeight: '47px',  // Ensures the button text aligns
                            }}
                            onClick={() => setStep('signIn')}
                        >
                            Sign In
                        </h3>
                        <h3
                            className="w-50 text-center m-0"
                            style={{
                                cursor: 'pointer',
                                borderRadius: '8px',
                                backgroundColor: step === 'register' ? 'white' : 'transparent',
                                fontWeight: step === 'register' ? 'bold' : 'normal',
                                lineHeight: '47px',
                            }}
                            onClick={() => setStep('register')}
                        >
                            Register
                        </h3>
                    </div>
                )}



                {step === 'signIn' && (
                    <>
                        <form onSubmit={handleLogin} style={{ width: '100%' }}>
                            <label className="mb-1 d-block text-start">Email</label>
                            <input
                                type="email"
                                className="form-control mb-3"
                                style={{
                                    backgroundColor: '#D9D9D9',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'black',
                                    textAlign: 'left',
                                    height: '48px',  // Matches the toggle button height
                                }}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />

                            <label className="mb-1 d-block text-start">Password</label>
                            <input
                                type="password"
                                className="form-control mb-2"
                                style={{
                                    backgroundColor: '#D9D9D9',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'black',
                                    textAlign: 'left',
                                    height: '48px',
                                }}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />

                            <p
                                className="text-end"
                                style={{ cursor: 'pointer', color: 'black' }}
                                onClick={() => setStep('forgotPassword')}
                            >
                                Forgot Password?
                            </p>

                            <button
                                className="btn btn-dark w-100"
                                type="submit"
                                style={{
                                    borderRadius: '8px',
                                    width: '100%',
                                    height: '48px',
                                    paddingTop: '10px',
                                    paddingBottom: '10px',  // Ensures proper vertical spacing
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                }}
                            >
                                Sign In
                            </button>
                        </form>
                        <p className="text-center mt-3">Other Sign-in Options</p>
                        <div className="d-flex justify-content-center gap-3">
                            <img
                                src="/google.png"
                                alt="Google Sign-In"
                                width={30}
                                height={30}
                                style={{ cursor: 'pointer' }}
                            />
                            <img
                                src="/facebook.png"
                                alt="Facebook Sign-In"
                                width={30}
                                height={30}
                                style={{ cursor: 'pointer' }}
                            />
                            <img
                                src="/apple.png"
                                alt="Apple Sign-In"
                                width={30}
                                height={30}
                                style={{ cursor: 'pointer' }}
                            />
                        </div>

                    </>
                )}

                {step === 'forgotPassword' && (
                    <>
                        <h3 className="text-start">Forgot Password?</h3>

                        <label className="mb-1 d-block text-start">Enter Email</label>
                        <input
                            type="email"
                            className="form-control mb-3"
                            style={{
                                backgroundColor: '#D9D9D9',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'black',
                                textAlign: 'left',
                                height: '48px',
                            }}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <button
                            className="btn btn-dark w-100"
                            onClick={handleGetOtp}
                            style={{
                                borderRadius: '8px',
                                width: '100%',
                                height: '48px',
                                paddingTop: '10px',
                                paddingBottom: '10px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                            }}
                        >
                            Get OTP
                        </button>

                        <button
                            className="btn w-100 mt-3"
                            onClick={handleBack}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '8px',
                                width: '100%',
                                height: '48px',
                                paddingTop: '10px',
                                paddingBottom: '10px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                border: '1px solid black',
                            }}
                        >
                            Back
                        </button>
                    </>
                )}


                {step === 'enterOtp' && (
                    <>
                        <h3 className="text-start">Enter OTP</h3>

                        <label className="mb-1 d-block text-start">OTP</label>
                        <input
                            type="text"
                            className="form-control mb-3"
                            style={{
                                backgroundColor: '#D9D9D9',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'black',
                                textAlign: 'left',
                                height: '48px',
                            }}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                        />

                        <button
                            className="btn btn-dark w-100"
                            onClick={handleVerifyOtp}  // Calls the OTP verification API
                            style={{
                                borderRadius: '8px',
                                width: '100%',
                                height: '48px',
                                paddingTop: '10px',
                                paddingBottom: '10px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                            }}
                        >
                            Submit
                        </button>
                        <button
                            className="btn btn-light w-100 mt-2"
                            onClick={handleGetOtp}  // Calls the Get OTP API again
                            style={{
                                borderRadius: '8px',
                                width: '100%',
                                height: '48px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                border: '1px solid black',
                                color: 'black',
                            }}
                        >
                            Resend OTP
                        </button>

                    </>
                )}

                {step === 'resetPassword' && (
                    <>
                        <h3 className="text-start">Reset Password</h3>

                        <label className="mb-1 d-block text-start">New Password</label>
                        <input
                            type="password"
                            className="form-control mb-3"
                            style={{
                                backgroundColor: '#D9D9D9',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'black',
                                textAlign: 'left',
                                height: '48px',
                            }}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <label className="mb-1 d-block text-start">Confirm Password</label>
                        <input
                            type="password"
                            className="form-control mb-3"
                            style={{
                                backgroundColor: '#D9D9D9',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'black',
                                textAlign: 'left',
                                height: '48px',
                            }}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />

                        <button
                            className="btn btn-dark w-100"
                            onClick={handleResetPassword}
                            style={{
                                borderRadius: '8px',
                                width: '100%',
                                height: '48px',
                                paddingTop: '10px',
                                paddingBottom: '10px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                            }}
                        >
                            Reset
                        </button>
                    </>
                )}


                {step === 'register' && (
                    <>
                        <label className="mb-1 d-block text-start">Email</label>
                        <input
                            type="email"
                            className="form-control mb-3"
                            style={{
                                backgroundColor: '#D9D9D9',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'black',
                                textAlign: 'left',
                                height: '48px',
                            }}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <label className="mb-1 d-block text-start">Phone Number</label>
                        <input
                            type="tel"
                            className="form-control mb-3"
                            style={{
                                backgroundColor: '#D9D9D9',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'black',
                                textAlign: 'left',
                                height: '48px',
                                marginBottom: '12px',
                            }}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                        />

                        <button
                            className="btn btn-dark w-100"
                            onClick={handleGetOtp}
                            style={{
                                borderRadius: '8px',
                                width: '100%',
                                height: '48px',
                                paddingTop: '10px',
                                paddingBottom: '10px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                            }}
                        >
                            Send OTP
                        </button>
                        <p className="text-center mt-3">Other Sign-in Options</p>
                        <div className="d-flex justify-content-center gap-3">
                            <img
                                src="/google.png"
                                alt="Google Sign-In"
                                width={30}
                                height={30}
                                style={{ cursor: 'pointer' }}
                            />
                            <img
                                src="/facebook.png"
                                alt="Facebook Sign-In"
                                width={30}
                                height={30}
                                style={{ cursor: 'pointer' }}
                            />
                            <img
                                src="/apple.png"
                                alt="Apple Sign-In"
                                width={30}
                                height={30}
                                style={{ cursor: 'pointer' }}
                            />
                        </div>
                    </>
                )}
                {step === 'fillForm' && (
                    <>
                        <label className="mb-1 d-block text-start">Name</label>
                        <input
                            type="text"
                            className="form-control mb-3"
                            style={{
                                backgroundColor: '#D9D9D9',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'black',
                                textAlign: 'left',
                                height: '48px',
                            }}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />

                        <label className="mb-1 d-block text-start">Address</label>
                        <input
                            type="text"
                            className="form-control mb-3"
                            style={{
                                backgroundColor: '#D9D9D9',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'black',
                                textAlign: 'left',
                                height: '48px',
                            }}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            required
                        />

                        <label className="mb-1 d-block text-start">Purpose of Use</label>
                        <input
                            type="text"
                            className="form-control mb-3"
                            style={{
                                backgroundColor: '#D9D9D9',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'black',
                                textAlign: 'left',
                                height: '48px',
                            }}
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            required
                        />

                        <label className="mb-1 d-block text-start">Password</label>
                        <input
                            type="password"
                            className="form-control mb-3"
                            style={{
                                backgroundColor: '#D9D9D9',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'black',
                                textAlign: 'left',
                                height: '48px',
                            }}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <label className="mb-1 d-block text-start">Confirm Password</label>
                        <input
                            type="password"
                            className="form-control mb-3"
                            style={{
                                backgroundColor: '#D9D9D9',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'black',
                                textAlign: 'left',
                                height: '48px',
                            }}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />

                        <button
                            className="btn btn-dark w-100"
                            onClick={handleRegisterSubmit}
                            style={{
                                borderRadius: '8px',
                                width: '100%',
                                height: '48px',
                                paddingTop: '10px',
                                paddingBottom: '10px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                            }}
                        >
                            Register
                        </button>

                    </>
                )}




            </div>
        );
    };

    return (
        <div className="d-flex vh-100">
            {/* Left Side (Image) */}
            <div className="w-50 d-flex align-items-center justify-content-center">
                <img src="/land.png" alt="Terrastack" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>

            {/* Right Side (Form) */}
            <div className="w-50 d-flex flex-column justify-content-center align-items-center p-5 position-relative">
                {/* Back Arrow at the top left of the right div */}
                {step !== "signIn" && step !== "register" && (
                    <FaArrowLeft
                        size={24}
                        onClick={handleBack}
                        className="position-absolute"
                        style={{ top: "20px", left: "20px", cursor: "pointer" }}
                    />
                )}

                {renderForm()}
            </div>
        </div>
    );

}
