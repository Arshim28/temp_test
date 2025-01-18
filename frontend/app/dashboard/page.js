'use client';

import './DashBoard.css';
import { FaTachometerAlt, FaClipboardList, FaBoxOpen, FaCog, FaGlobe, FaFileDownload, FaMap, FaSearch } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
export default function Dashboard() {
    const router = useRouter();
    return (
        <div className="dashboard-container">
            {/* Top Navbar */}
            <div className="dashboard-top-navbar">
                <div className="user-profile-circle">U</div>
            </div>

            {/* Main Content */}
            <div className="dashboard-main">
                {/* Left Sidebar */}
                <div className="dashboard-sidebar">
                    <div className="profile-section">
                        <img
                            src="/images.jpeg"
                            alt="Profile"
                            className="profile-picture"
                        />
                        <h3 className="user-name">John Doe</h3>
                    </div>
                    <ul className="sidebar-menu">
                        <li className="menu-item">
                            <FaTachometerAlt className="menu-icon" /> Dashboard
                        </li>
                        <li className="menu-item">
                            <FaClipboardList className="menu-icon" /> All Plans
                        </li>
                        <li className="menu-item">
                            <FaBoxOpen className="menu-icon" /> My Orders
                        </li>
                        <li className="menu-item">
                            <FaCog className="menu-icon" /> My Settings
                        </li>
                    </ul>
                </div>

                {/* Middle Section */}
                <div className="dashboard-middle">
                    <h2 className="plans-heading">Welcome To your Terrastack account!</h2>

                    <h2 className="plans-heading">Your Registered Plans</h2>
                    <div className="plans-container">
                        <div className="plan-card">
                            <h3>Taluka Trial</h3>
                            <p>Details about the Taluka Trial plan.</p>
                        </div>
                        <div className="plan-card">
                            <h3>District Trial</h3>
                            <p>Details about the District Trial plan.</p>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="dashboard-rightbar">
                    <ul className="rightbar-menu">
                        <li
                            className="menu-item"
                            onClick={() => router.push('/mapview')}
                        >
                            <FaGlobe className="menu-icon" /> Map View
                        </li>
                        <li
                            className="menu-item"
                            onClick={() => router.push('/report')}
                        >
                            <FaFileDownload className="menu-icon" /> Download Report
                        </li>

                        <li className="menu-item">
                            <FaMap className="menu-icon" /> Download Heatmap
                        </li>
                        <li className="menu-item">
                            <FaSearch className="menu-icon" /> Search by Taluka ID
                        </li>
                        <li className="menu-item">
                            FAQ
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
