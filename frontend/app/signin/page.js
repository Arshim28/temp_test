'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation'; // For programmatic navigation
import './SignInPage.css'; // Ensure the CSS is imported

export default function SignInPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(''); // For displaying error messages
    const router = useRouter();

    const handleSubmit = (e) => {
        e.preventDefault();

        // Standard credentials
        // const standardEmail = 'user@terrastack.com';
        // const standardPassword = 'password123';
        const standardEmail = 'amit@gmail.com';
        const standardPassword = 'amit';

        // Validate credentials
        if (email === standardEmail && password === standardPassword) {
            console.log('Signed in successfully!');
            router.push('/dashboard'); // Redirect to dashboard
        } else {
            setError('Invalid email or password. Please try again.');
        }
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
                {error && <p className="signin-error">{error}</p>} {/* Display error */}
            </div>
        </section>
    );
}
