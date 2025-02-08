'use client';

import { FaTachometerAlt, FaClipboardList, FaBoxOpen, FaCog } from 'react-icons/fa';

export default function Sidebar({ userDetails, handleAllPlansClick, handleDashboardClick }) {
    const userName = userDetails?.user?.name || 'User';
    const profilePic = userDetails?.user?.name?.charAt(0).toUpperCase() || 'U';

    return (
        <div className="dashboard-sidebar">
            <div className="profile-section">
                <div className="profile-picture-circle">{profilePic}</div>
                <h3 className="user-name">{userName}</h3>
            </div>
            <ul className="sidebar-menu">
                <li className="menu-item" onClick={handleDashboardClick}>
                    <FaTachometerAlt className="menu-icon" /> Dashboard
                </li>
                <li className="menu-item" onClick={handleAllPlansClick}>
                    <FaClipboardList className="menu-icon" /> All Plans
                </li>
                {/* <li className="menu-item">
                    <FaBoxOpen className="menu-icon" /> My Orders
                </li> */}
                <li className="menu-item">
                    <FaCog className="menu-icon" /> My Settings
                </li>
            </ul>
        </div>
    );
}
