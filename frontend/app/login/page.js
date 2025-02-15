'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css'; // Bootstrap import
import LoadingScreen from '../loader/page';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post('http://65.2.140.129:8000/api/users/login/', {
                user: { email, password },
            });

            const { token } = response.data;
            if (token) {
                localStorage.setItem('authToken', token);
                setLoading(true); // Only show loading screen on success
                setTimeout(() => router.push('/dashboard'), 100);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
        }
    };

    if (loading) {
        return <LoadingScreen message="Logging in, please wait..." />;
    }

    return (
        <div className="container d-flex justify-content-center align-items-center vh-100">
            <div className="card shadow-lg p-4" style={{ maxWidth: "400px", width: "100%" }}>
                <h2 className="text-center mb-4">Login</h2>
                <form onSubmit={handleLogin}>
                    <div className="mb-3">
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            className="form-control"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-control"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <p className="text-danger text-center">{error}</p>}
                    <button type="submit" className="btn btn-dark w-100">Login</button>
                </form>
                <p className="text-center mt-3">
                    Don't have an account?{' '}
                    <span onClick={() => router.push('/signin')} className="text-primary" style={{ cursor: "pointer" }}>
                        Sign up here
                    </span>
                </p>
            </div>
        </div>
    );
}
