'use client';

import { FaGlobe, FaFileDownload, FaMap, FaSearch } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

export default function RightSidebar() {
    const router = useRouter();

    const handleNavigation = (path) => {
        router.push(path); // Navigate to the specified path
    };

    return (
        <div className="dashboard-rightbar">
            <ul className="rightbar-menu">
                <li className="menu-item" onClick={() => handleNavigation('/mapview')}>
                    <FaGlobe className="menu-icon" /> Map View
                </li>
                <li className="menu-item" onClick={() => handleNavigation('/report')}>
                    <FaFileDownload className="menu-icon" /> Download Report
                </li>
                <li className="menu-item">
                    <FaMap className="menu-icon" /> Download Heatmap
                </li>
                <li className="menu-item">
                    <FaSearch className="menu-icon" /> Search by Taluka ID
                </li>
            </ul>
        </div>
    );
}
