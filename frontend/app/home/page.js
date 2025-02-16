'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Home.css';

export default function Home() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userInitial, setUserInitial] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));
        if (token && user) {
            setIsAuthenticated(true);
            setUserInitial(user.name.charAt(0).toUpperCase());
        }
    }, []);

    const handleSignInClick = () => router.push('/signin');
    const handleNavigate = (path) => router.push(path);
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        router.push('/');
    };

    return (
        <main>
            {/* Navbar */}
            <nav className="navbar navbar-light bg-white shadow-sm px-4">
                <span className="navbar-brand fw-bold" onClick={() => handleNavigate('/')} style={{ cursor: 'pointer' }}>
                    Terrastack AI
                </span>
                {isAuthenticated ? (
                    <div className="user-circle" onClick={() => setShowDropdown(!showDropdown)}>
                        {userInitial}
                        {showDropdown && (
                            <div className="dropdown-menu show">
                                <button className="dropdown-item" onClick={() => handleNavigate('/account')}>My Account</button>
                                <button className="dropdown-item" onClick={handleLogout}>Log Out</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button className="btn btn-dark" onClick={handleSignInClick}>Sign In</button>
                )}
            </nav>

            {/* Hero Section */}
            <section className="hero-section d-flex align-items-center">
                <div className="image-container fade-in"></div>
                <div className="content-wrapper fade-in">
                    <h1 className="display-4">Welcome to Terrastack AI</h1>
                    <p className="lead">Your trustworthy agent for rural land mapping and evaluation</p>
                    <div className="info-box shadow-sm" onClick={() => handleNavigate('')}>
                        <h3>Plot Assessments</h3>
                        <p>Search for a plot by coordinates or ID and get a comprehensive evaluation report</p>
                    </div>
                    <div className="info-box shadow-sm" onClick={() => handleNavigate('')}>
                        <h3>Map Explorer</h3>
                        <p>View, filter, and rate plots by water access, connectivity, land activity, and more.</p>
                    </div>
                </div>
            </section>
        </main>
    );
}
