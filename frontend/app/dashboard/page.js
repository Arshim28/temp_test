'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';
import './DashBoard.css';

export default function Dashboard() {
    const router = useRouter();
    const [userDetails, setUserDetails] = useState(null);
    const [plans, setPlans] = useState([]); // Initialize as an empty array
    const [reportUsage, setReportUsage] = useState({ used: 0, quantity: 0 }); // State for report usage
    const [loading, setLoading] = useState(true);
    const [showDropdown, setShowDropdown] = useState(false);

    const token = localStorage.getItem('authToken');

    useEffect(() => {
        if (!token) {
            router.push('/signin');
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch User Data
                const userResponse = await axios.get('http://65.2.140.129:8000/api/user/', {
                    headers: { Authorization: `Bearer ${token}` },
                });

                // Fetch Plans Data
                const plansResponse = await axios.get('http://65.2.140.129:8000/api/plans/', {
                    headers: { Authorization: `Bearer ${token}` },
                });

                // Fetch Reports Usage Data
                const reportsResponse = await axios.get('http://65.2.140.129:8000/api/reports-info/', {
                    headers: { Authorization: `Bearer ${token}` },
                });

                setUserDetails(userResponse.data.user);
                setPlans(plansResponse.data.results || []);
                setReportUsage({
                    used: reportsResponse.data.used || 0,
                    quantity: reportsResponse.data.quantity || 0,
                });

                console.log('Plans:', plansResponse.data.results);
                console.log('Report Usage:', reportsResponse.data);
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token]);

    if (loading) return <div>Loading...</div>;

    return (
        <main>
            {/* Navbar */}
            <nav className="navbar navbar-light bg-white shadow-sm px-4">
                <span className="navbar-brand fw-bold" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
                    Terrastack AI
                </span>
                {userDetails && (
                    <div className="user-circle" onClick={() => setShowDropdown(!showDropdown)}>
                        {userDetails.name.charAt(0).toUpperCase()}
                        {showDropdown && (
                            <div className="dropdown-menu show">
                                <button className="dropdown-item" onClick={() => router.push('/account')}>My Account</button>
                                <button className="dropdown-item" onClick={() => {
                                    localStorage.removeItem('authToken');
                                    router.push('/signin');
                                }}>Log Out</button>
                            </div>
                        )}
                    </div>
                )}
            </nav>

            {/* Dashboard Layout with Three Sections */}
            <div className="dashboard-container">
                {/* Left Sidebar */}
                <aside className="left-section">
                    <div className="profile-circle">{userDetails?.name?.charAt(0).toUpperCase()}</div>
                    <div className="user-name">{userDetails?.name}</div>
                    <p className="clickable" onClick={() => router.push('/dashboard')}>Dashboard</p>
                    <p className="clickable" onClick={() => router.push('/settings')}>Settings</p>
                </aside>

                {/* Center Section */}
                <section className="center-section">
                    <h2 className="greeting">Hello, {userDetails?.name}!</h2>

                    <div className="plans-wrapper">
                        {/* Report Plan */}
                        <div className="plan-box">
                            <div className="plan-header">
                                <img src="/report-icon.png" alt="Report Plan" className="plan-icon" />
                                <h4>Report Plan</h4>
                            </div>
                            <p className="report-usage">
                                <strong>{reportUsage.used}</strong> / <strong>{reportUsage.quantity}</strong> reports used
                            </p>
                            {/* Scrollable Purchased Plans */}
                            <div className="scrollable-plans">

                            </div>
                            <button className="btn btn-dark" onClick={() => router.push('/plans')}>
                                Buy More
                            </button>

                        </div>

                        {/* Explorer Plan */}
                        <div className="plan-box">
                            <div className="plan-header">
                                <img src="/explorer-icon.png" alt="Explorer Plan" className="plan-icon" />
                                <h4>Explorer Plan</h4>
                            </div>

                            {/* Scrollable Purchased Plans */}
                            <div className="scrollable-plans">
                                {Array.isArray(plans) && plans.length > 0 ? (
                                    plans.map((plan) => (
                                        <div className="plan-card" key={plan.id}>
                                            <p className="plan-type">{plan.plan_type} : {plan.entity_name}</p>
                                            <p className="valid-till">Valid Till: {new Date(plan.valid_till).toLocaleDateString('en-GB')}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="no-plans">No plans registered yet.</p>
                                )}
                            </div>
                            <button className="btn btn-dark" onClick={() => router.push('/plans')}>
                                Buy More
                            </button>

                        </div>
                    </div>
                </section>

                {/* Right Section */}
                <section className="right-section">
                    <h3 className="applications-heading">Applications</h3>
                    <div className="right-buttons-container">
                        <button className="app-button" onClick={() => router.push('/report')}>
                            <img src="/download-report.png" alt="Download Report" />
                            Download Report
                        </button>
                        <button className="app-button" onClick={() => router.push('/mapview')}>
                            <img src="/mapview.png" alt="MapView" />
                            MapView
                        </button>
                        <button className="app-button" onClick={() => router.push('')}>
                            <img src="/heatmap.png" alt="Download Heatmap" />
                            Download Heatmap
                        </button>
                        <button className="app-button" onClick={() => router.push('')}>
                            <img src="/taluka-search.png" alt="Search by Taluka ID" />
                            Search by Taluka ID
                        </button>
                    </div>
                </section>
            </div>
        </main>
    );
}
