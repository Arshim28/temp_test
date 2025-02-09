"use client";
import { useState } from "react";
import { useRouter } from 'next/navigation';
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css"; // Import Bootstrap locally

export default function EmailVerification({ onVerified }) {
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [showOtpPopup, setShowOtpPopup] = useState(false);
    const router = useRouter();


    const handleSendOtp = async () => {
        if (!email) {
            setError("Please enter your email.");
            return;
        }
        try {
            await axios.post("http://65.2.140.129:8000/api/otp/request/", { email });
            setOtpSent(true);
            setSuccessMessage("OTP Sent! Check your email.");
            setError("");
            setShowOtpPopup(true); // Show OTP popup after sending OTP
        } catch (err) {
            setError(err.response?.data?.message || "Failed to send OTP.");
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 6) {
            setError("Please enter a valid 6-digit OTP.");
            return;
        }
        try {
            const response = await axios.post("http://65.2.140.129:8000/api/otp/verify/", { email, otp });

            if (response.status === 200 && response.data.verification_token) {
                const verificationToken = response.data.verification_token;
                setSuccessMessage("OTP Verified! Redirecting...");
                setTimeout(() => onVerified(email, verificationToken), 1500);
            } else {
                setError("Invalid OTP. Try again.");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Invalid OTP.");
        }
    };

    return (
        <div className="container d-flex justify-content-center align-items-center vh-100">
            <div className="card p-4 text-center shadow-sm" style={{ maxWidth: "400px", width: "100%" }}>
                <h3 className="mb-3">Email Verification</h3>

                {/* Email Input */}
                <input
                    type="email"
                    className="form-control mb-3"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                {/* Send OTP Button */}
                <button className="btn btn-dark w-100" onClick={handleSendOtp}>
                    Send OTP
                </button>
                <p className="text-center mt-3">
                    Already have an account?{' '}
                    <span onClick={() => router.push('/login')} className="text-primary" style={{ cursor: "pointer" }}>
                        Login here
                    </span>
                </p>

                {/* Error & Success Messages */}
                {error && <p className="text-danger mt-2">{error}</p>}
                {successMessage && <p className="text-success mt-2">{successMessage}</p>}

                {/* OTP Verification Popup */}
                {showOtpPopup && (
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content p-4 shadow-lg rounded">
                                <div className="modal-header border-0">
                                    <h5 className="modal-title mx-auto fw-bold">Enter OTP</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowOtpPopup(false)}></button>
                                </div>
                                <div className="modal-body text-center">
                                    <p className="text-muted">A 6-digit OTP has been sent to your email.</p>
                                    <input
                                        type="text"
                                        className="form-control text-center fw-bold fs-4 my-3 p-2"
                                        placeholder="XXXXXX"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        maxLength="6"
                                        style={{ letterSpacing: "8px" }}
                                    />
                                    <button className="btn btn-dark w-100 py-2" onClick={handleVerifyOtp}>
                                        Verify OTP
                                    </button>
                                    <p className="mt-3">
                                        Didn’t receive it?{" "}
                                        <button className="btn btn-link p-0 text-decoration-none fw-bold" onClick={handleSendOtp}>
                                            Resend OTP
                                        </button>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Overlay */}
                {showOtpPopup && <div className="modal-backdrop fade show"></div>}
            </div>
        </div>
    );
}
