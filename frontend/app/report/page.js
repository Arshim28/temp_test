'use client'
import './ReportPage.css';
import { FaSearch } from 'react-icons/fa';
import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function ReportPage() {
    const [filters, setFilters] = useState({
        state: '',
        district: '',
        taluka: '',
        village: '',
        reportType: '',
        ownerName: '',
    });

    const handleFilterChange = (field, value) => {
        setFilters((prevFilters) => ({
            ...prevFilters,
            [field]: value,
        }));
    };

    const states = ["Maharashtra", "Gujarat", "Rajasthan", "Karnataka"];
    const districts = ["District 1", "District 2", "District 3"];
    const talukas = ["Taluka 1", "Taluka 2"];
    const villages = ["Village 1", "Village 2"];
    const reportTypes = ["Type 1", "Type 2", "Type 3"];
    const ownerNames = ["Sarvesh Patil", "Ramesh Patil", "Anjali Sharma", "Rahul Mehta"];

    const reports = [
        {
            khataNumber: "125",
            surveyNumber: "23/2",
            villageName: "Village 1",
            districtName: "District 1",
            talukaName: "Taluka 1",
            ownerNames: "Sarvesh Patil",
        },
        {
            khataNumber: "126",
            surveyNumber: "45/7",
            villageName: "Village 2",
            districtName: "District 2",
            talukaName: "Taluka 2",
            ownerNames: "Rahul Mehta",
        },
    ];

    const filteredReports = reports.filter((report) => {
        if (filters.district && report.districtName !== filters.district) return false;
        if (filters.taluka && report.talukaName !== filters.taluka) return false;
        if (filters.village && report.villageName !== filters.village) return false;
        if (filters.reportType && report.reportType !== filters.reportType) return false;
        if (filters.ownerName && !report.ownerNames.includes(filters.ownerName)) return false;
        return true;
    });

    const downloadDummyPDF = (report) => {
        const docContent = `
            Khata Number: ${report.khataNumber}
            Survey Number: ${report.surveyNumber}
            Village Name: ${report.villageName}
            Owner Name(s): ${report.ownerNames}
        `;
        const blob = new Blob([docContent], { type: 'application/pdf' });
        saveAs(blob, `Report_${report.khataNumber}.pdf`);
    };

    const downloadAllReportsAsZip = () => {
        const zip = new JSZip();
        filteredReports.forEach((report) => {
            const docContent = `
                Khata Number: ${report.khataNumber}
                Survey Number: ${report.surveyNumber}
                Village Name: ${report.villageName}
                Owner Name(s): ${report.ownerNames}
            `;
            zip.file(`Report_${report.khataNumber}.pdf`, docContent);
        });
        zip.generateAsync({ type: 'blob' }).then((content) => {
            saveAs(content, 'All_Reports.zip');
        });
    };

    return (
        <div className="report-page-container">
            <div className="top-navbar">
                <div className="user-profile-circle">U</div>
            </div>

            <div className="filter-section">
                <h2 className="filter-heading">Filter Reports</h2>
                <div className="filters-container">
                    <select
                        className="dropdown"
                        onChange={(e) => handleFilterChange('state', e.target.value)}
                    >
                        <option value="">Select State</option>
                        {states.map((state, index) => (
                            <option key={index} value={state}>
                                {state}
                            </option>
                        ))}
                    </select>
                    <select
                        className="dropdown"
                        onChange={(e) => handleFilterChange('district', e.target.value)}
                    >
                        <option value="">Select District</option>
                        {districts.map((district, index) => (
                            <option key={index} value={district}>
                                {district}
                            </option>
                        ))}
                    </select>
                    <select
                        className="dropdown"
                        onChange={(e) => handleFilterChange('taluka', e.target.value)}
                    >
                        <option value="">Select Taluka</option>
                        {talukas.map((taluka, index) => (
                            <option key={index} value={taluka}>
                                {taluka}
                            </option>
                        ))}
                    </select>
                    <select
                        className="dropdown"
                        onChange={(e) => handleFilterChange('village', e.target.value)}
                    >
                        <option value="">Select Village</option>
                        {villages.map((village, index) => (
                            <option key={index} value={village}>
                                {village}
                            </option>
                        ))}
                    </select>
                    <select
                        className="dropdown"
                        onChange={(e) => handleFilterChange('reportType', e.target.value)}
                    >
                        <option value="">Select Report Type</option>
                        {reportTypes.map((type, index) => (
                            <option key={index} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                    <select
                        className="dropdown"
                        onChange={(e) => handleFilterChange('ownerName', e.target.value)}
                    >
                        <option value="">Select Owner Name</option>
                        {ownerNames.map((owner, index) => (
                            <option key={index} value={owner}>
                                {owner}
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
            {/* Content Section */}
            <div className="content-section">
                {filters.district === '' ? (
                    <div className="placeholder-content">
                        <div className="placeholder-images">
                            <div className="image-description-container">
                                <img
                                    src="/india.jpeg"
                                    alt="Placeholder 1"
                                    className="placeholder-image"
                                />
                                <p className="image-description">
                                    6 districts covered across MH, Rajasthan, Telangana so far,
                                    and rapidly expanding.
                                </p>
                            </div>
                            <div className="image-description-container">
                                <img
                                    src="/report.png"
                                    alt="Placeholder 2"
                                    className="placeholder-image"
                                />
                                <p className="image-description">
                                    A sample valuation report - generated for an arbitrary khata number.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="report-list">
                        <button
                            className="download-all-button"
                            onClick={downloadAllReportsAsZip}
                        >
                            Download All ({filteredReports.length})
                        </button>
                        {filteredReports.map((report, index) => (
                            <div key={index} className="report-card-row">
                                <div>
                                    <h3>Khata Number: {report.khataNumber}</h3>
                                    <p>Survey Number: {report.surveyNumber}</p>
                                    <p>Village Name: {report.villageName}</p>
                                    <p>Owner Name(s): {report.ownerNames}</p>
                                </div>
                                <button
                                    className="download-button"
                                    onClick={() => downloadDummyPDF(report)}
                                >
                                    Download Report
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
