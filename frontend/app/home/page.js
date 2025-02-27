'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Home.css';

export default function Home() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            setIsAuthenticated(true);
        }
    }, []);

    const handleNavigate = (path) => router.push(path);

    return (
        <main>
            {/* Navbar */}
            <nav className="navbar navbar-light bg-white shadow-sm px-4">
                <span className="navbar-brand fw-bold" onClick={() => handleNavigate('/')} style={{ cursor: 'pointer' }}>
                    Terrastack AI
                </span>
                {/* User Info or Sign In / Dashboard Button */}
                {isAuthenticated ? (
                    <div className="d-flex align-items-center">
                        <button className="btn btn-dark me-3 p-6" onClick={() => handleNavigate('/dashboard')}>
                            Go to Dashboard
                        </button>
                    </div>
                ) : (
                    <button className="btn btn-dark" onClick={() => handleNavigate('/signin')}>
                        Sign In
                    </button>
                )}
            </nav>

            {/* Hero Section */}
            <section className="hero-section d-flex align-items-center">
                <div className="image-container fade-in"></div>
                <div className="content-wrapper fade-in">
                    <h1 className="display-4">Welcome to Terrastack AI</h1>
                    <p className="lead">Your trustworthy agent for rural land mapping and evaluation</p>
                    <div className="info-box shadow-sm mb-4" onClick={() => handleNavigate('/report')}>
                        <h3>Plot Assessments</h3>
                        <p>Search for a plot by coordinates or ID and get a comprehensive evaluation report</p>
                    </div>
                    <div className="info-box shadow-sm" onClick={() => handleNavigate('/mapview')}>
                        <h3>Map Explorer</h3>
                        <p>View, filter, and rate plots by water access, connectivity, land activity, and more.</p>
                    </div>
                </div>
            </section>
        </main>
    );
}
