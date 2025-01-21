'use client';
import './ReportPage.css';
import { FaSearch } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import axios from 'axios'; // Import axios

export default function ReportPage() {
    const [filters, setFilters] = useState({
        state: '',
        district: '',
        taluka: '',
        village: '',
        reportType: '', // reportType will be handled separately
        ownerName: '',
    });

    const [reports, setReports] = useState([]); // State for reports data
    const [loading, setLoading] = useState(true); // State for loading status

    useEffect(() => {
        // Fetch the metadata when the component mounts
        axios
            .get('http://localhost:8000/api/maharashtra_metadata/') // API endpoint
            .then((response) => {
                setReports(response.data); // Store the fetched data
                setLoading(false); // Set loading to false after data is fetched
            })
            .catch((error) => {
                console.error('Error fetching data:', error);
                setLoading(false);
            });
    }, []); // Empty dependency array ensures this runs once when the component mounts

    const handleFilterChange = (field, value) => {
        setFilters((prevFilters) => ({
            ...prevFilters,
            [field]: value,
        }));
    };

    const filteredReports = reports.filter((report) => {
        if (filters.district && report.district_name !== filters.district) return false;
        if (filters.taluka && report.taluka_name !== filters.taluka) return false;
        if (filters.village && report.village_name !== filters.village) return false;
        if (filters.reportType && report.reportType !== filters.reportType) return false;
        if (filters.ownerName && !report.owner_names.includes(filters.ownerName)) return false;
        return true;
    });

    const downloadDummyPDF = (report) => {
        const docContent = `
            Khata Number: ${report.khata_number}
            Survey Number: ${report.survey_number}
            Village Name: ${report.village_name}
            Owner Name(s): ${report.owner_names}
        `;
        const blob = new Blob([docContent], { type: 'application/pdf' });
        saveAs(blob, `Report_${report.khata_number}.pdf`);
    };

    const downloadAllReportsAsZip = () => {
        const zip = new JSZip();
        filteredReports.forEach((report) => {
            const docContent = `
                Khata Number: ${report.khata_number}
                Survey Number: ${report.survey_number}
                Village Name: ${report.village_name}
                Owner Name(s): ${report.owner_names}
            `;
            zip.file(`Report_${report.khata_number}.pdf`, docContent);
        });
        zip.generateAsync({ type: 'blob' }).then((content) => {
            saveAs(content, 'All_Reports.zip');
        });
    };

    // Loading screen while data is being fetched
    if (loading) {
        return <div>Loading...</div>;
    }

    // Static report types (as you wanted)
    const reportTypes = ["Type 1", "Type 2", "Type 3"];

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
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Gujarat">Gujarat</option>
                        <option value="Rajasthan">Rajasthan</option>
                        <option value="Karnataka">Karnataka</option>
                    </select>
                    <select
                        className="dropdown"
                        onChange={(e) => handleFilterChange('district', e.target.value)}
                    >
                        <option value="">Select District</option>
                        {reports.map((report, index) => (
                            <option key={index} value={report.district_name}>
                                {report.district_name}
                            </option>
                        ))}
                    </select>
                    <select
                        className="dropdown"
                        onChange={(e) => handleFilterChange('taluka', e.target.value)}
                    >
                        <option value="">Select Taluka</option>
                        {reports.map((report, index) => (
                            <option key={index} value={report.taluka_name}>
                                {report.taluka_name}
                            </option>
                        ))}
                    </select>
                    <select
                        className="dropdown"
                        onChange={(e) => handleFilterChange('village', e.target.value)}
                    >
                        <option value="">Select Village</option>
                        {reports.map((report, index) => (
                            <option key={index} value={report.village_name}>
                                {report.village_name}
                            </option>
                        ))}
                    </select>
                    {/* Static report type selection */}
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
                        {reports.map((report, index) => (
                            <option key={index} value={report.owner_names}>
                                {report.owner_names}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Content Section */}
            <div className="content-section">
                {filters.district === '' ? (
                    <div className="placeholder-content">
                        {/* Placeholder content */}
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
                                    <h3>Khata Number: {report.khata_number}</h3>
                                    <p>Survey Number: {report.survey_number}</p>
                                    <p>Village Name: {report.village_name}</p>
                                    <p>Owner Name(s): {report.owner_names}</p>
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
