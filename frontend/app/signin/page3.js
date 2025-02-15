"use client";
import { useState } from "react";
import EmailVerification from "./components/EmailVerification";
import SignIn from "./components/SignInForm";

export default function SignInPage() {
    const [verifiedEmail, setVerifiedEmail] = useState(null);
    const [verificationToken, setVerificationToken] = useState(null);

    return (
        <div>
            {!verifiedEmail ? (
                <EmailVerification onVerified={(email, token) => {
                    setVerifiedEmail(email);
                    setVerificationToken(token);
                }} />
            ) : (
                <SignIn prefilledEmail={verifiedEmail} verificationToken={verificationToken} />
            )}
        </div>
    );
}
