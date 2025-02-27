'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Settings.css';

export default function Settings() {
    const router = useRouter();
    const [userDetails, setUserDetails] = useState(null);
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        if (!token) {
            router.push('/signin');
            return;
        }

        const fetchUserData = async () => {
            try {
                const response = await axios.get('http://65.2.140.129:8000/api/user/', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setUserDetails(response.data.user);
            } catch (err) {
                console.error('Error fetching user data:', err);
            }
        };

        fetchUserData();
    }, [token]);

    if (!userDetails) return <div>Loading...</div>;

    return (
        <main>
            {/* Navbar */}
            <nav className="navbar">
                <span className="navbar-brand" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
                    Terrastack AI
                </span>
            </nav>

            {/* Main Container with Sidebar & Content */}
            <div className="main-container">
                {/* Left Sidebar */}
                <aside className="left-sidebar">
                    <div className="profile-circle">{userDetails?.name?.charAt(0).toUpperCase()}</div>
                    <div className="user-name">{userDetails?.name}</div>
                    <p className="clickable" onClick={() => router.push('/dashboard')}>Dashboard</p>
                    <p className="clickable active">Settings</p>
                </aside>

                {/* Right Content Section */}
                <section className="settings-container">
                    <h2 className="settings-heading">My Settings</h2>
                    <div className="settings-info">
                        <div className="info-row">
                            <span>Name</span>
                            <span>{userDetails.name}</span>
                            <button className="btn-edit">Edit</button>
                        </div>
                        <div className="info-row">
                            <span>Username</span>
                            <span>{userDetails.username}</span>
                        </div>
                        <div className="info-row">
                            <span>Organization</span>
                            <span>{userDetails.organization || 'N/A'}</span>
                        </div>
                        <div className="info-row">
                            <span>Country</span>
                            <span>{userDetails.country || 'N/A'}</span>
                        </div>
                        <div className="info-row">
                            <span>Email</span>
                            <span>{userDetails.email}</span>
                            <button className="btn-edit">Reset Password</button>
                        </div>
                        <div className="info-row">
                            <span>API Key</span>
                            <span>************</span>
                        </div>
                        <div className="info-row">
                            <span>Enable MFA</span>
                            <button className="btn-edit">Enable MFA</button>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
