'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import './LogInPage.css'; // Ensure the CSS is imported
import axios from 'axios'; // For making API calls

// LoginPage Component
export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post('http://65.2.140.129:8000/api/users/login/', {
                user: {
                    email,
                    password,
                },
            });
            const { token } = response.data;

            if (token) {
                console.log('Login successful!', token);
                localStorage.setItem('authToken', token); // Save token in frontend storage
                router.push('/dashboard'); // Redirect to dashboard
            }
        } catch (err) {
            const defaultError = 'Invalid credentials. Please try again.';
            setError(err.response?.data?.message || defaultError);
        }
    };

    return (
        <section className="login-section">
            <div className="login-content">
                <h1>Login to Your Account</h1>
                <form onSubmit={handleLogin} className="login-form">
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="login-input"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="login-input"
                        required
                    />
                    <button type="submit" className="login-button">Login</button>
                </form>
                {error && <p className="login-error">{error}</p>}
            </div>
        </section>
    );
}
