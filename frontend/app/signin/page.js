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
    const [error, setError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const router = useRouter();

    const handleSignIn = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setPasswordError('Passwords do not match.');
            return;
        }

        setPasswordError('');

        try {
            const response = await axios.post('http://65.2.140.129:8000/api/users/', {
                user: {
                    name,
                    email,
                    password,
                },
            });
            if (response.status === 201) {
                console.log('Sign-up successful!');
                router.push('/login');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
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
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="signin-input"
                        required
                    />
                    {passwordError && <p className="signin-error">{passwordError}</p>}
                    <button type="submit" className="signin-button">Sign Up</button>
                </form>
                {error && <p className="signin-error">{error}</p>}
                <p className="signin-switch">
                    Already have an account?{' '}
                    <span onClick={() => router.push('/login')} className="signin-link">Login here</span>
                </p>
            </div>
        </section>
    );
}
