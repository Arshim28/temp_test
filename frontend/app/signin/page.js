// app/components/SignInPage.js
'use client';
import { useState } from 'react';
import './SignInPage.css'; // Ensure the CSS is imported

export default function SignInPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle sign-in logic here
        console.log("Signed in with", email, password);
    };

    return (
        <section className="signin-section">
            <div className="signin-content">
                <h1>Sign In to Terrastack</h1>
                <form onSubmit={handleSubmit} className="signin-form">
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="signin-input"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="signin-input"
                        required
                    />
                    <button type="submit" className="signin-button">Sign In</button>
                </form>
            </div>
        </section>
    );
}
