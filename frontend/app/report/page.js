'use client';

import './ReportPage.css';
import { FaSearch } from 'react-icons/fa';

export default function ReportPage() {
    const states = ["Maharashtra", "Gujarat", "Rajasthan", "Karnataka"]; // Example states
    const districts = ["District 1", "District 2", "District 3"];
    const talukas = ["Taluka 1", "Taluka 2"];
    const villages = ["Village 1", "Village 2"];
    const reportTypes = ["Type 1", "Type 2", "Type 3"];
    const languages = ["English", "Hindi", "Marathi"];

    return (
        <div className="report-page-container">
            {/* Top Navbar */}
            <div className="top-navbar">
                <div className="user-profile-circle">U</div>
            </div>

            {/* Filter Section */}
            <div className="filter-section">
                <h2 className="filter-heading">Filter Reports</h2>
                <div className="filters-container">
                    <select className="dropdown">
                        <option>Select State</option>
                        {states.map((state, index) => (
                            <option key={index} value={state}>
                                {state}
                            </option>
                        ))}
                    </select>

                    <select className="dropdown">
                        <option>Select District</option>
                        {districts.map((district, index) => (
                            <option key={index} value={district}>
                                {district}
                            </option>
                        ))}
                    </select>

                    <select className="dropdown">
                        <option>Select Taluka</option>
                        {talukas.map((taluka, index) => (
                            <option key={index} value={taluka}>
                                {taluka}
                            </option>
                        ))}
                    </select>

                    <select className="dropdown">
                        <option>Select Village</option>
                        {villages.map((village, index) => (
                            <option key={index} value={village}>
                                {village}
                            </option>
                        ))}
                    </select>

                    <select className="dropdown">
                        <option>Select Report Type</option>
                        {reportTypes.map((type, index) => (
                            <option key={index} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>

                    <select className="dropdown">
                        <option>Select Language</option>
                        {languages.map((language, index) => (
                            <option key={index} value={language}>
                                {language}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="search-bar-container">
                    <input
                        type="text"
                        className="search-bar"
                        placeholder="Search by Plot ID or Name..."
                    />
                    <button className="search-button">
                        <FaSearch />
                    </button>
                </div>
            </div>

            {/* Report Results */}
            <div className="report-results">
                <h2 className="results-heading">Available Reports</h2>
                <div className="reports-container">
                    <div className="report-card">
                        <h3>Report Title 1</h3>
                        <p>Details about Report 1...</p>
                    </div>
                    <div className="report-card">
                        <h3>Report Title 2</h3>
                        <p>Details about Report 2...</p>
                    </div>
                    <div className="report-card">
                        <h3>Report Title 3</h3>
                        <p>Details about Report 3...</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
