'use client';
import './ReportPage.css';
import { FaSearch } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import axios from 'axios';
import LoadingScreen from '../loader/page';

export default function ReportPage() {
    const [filters, setFilters] = useState({
        state: '',
        district: '',
        taluka: '',
        village: '',
        reportType: '',
        ownerName: '',
        surveyNumber: '', // Added survey number
    });

    const [reports, setReports] = useState([]);
    const [hierarchy, setHierarchy] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [hierarchyRes, reportsRes] = await Promise.all([
                    axios.get('http://65.2.140.129:8000/api/maharashtra-hierarchy/'),
                    axios.get('http://65.2.140.129:8000/api/maharashtra_metadata/')
                ]);
                setHierarchy(hierarchyRes.data);
                setReports(reportsRes.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value,
            ...(field === 'district' && { taluka: '', village: '' }),
            ...(field === 'taluka' && { village: '' })
        }));
    };

    const filteredReports = reports.filter((report) => {
        if (filters.district && report.district_name !== filters.district) return false;
        if (filters.taluka && report.taluka_name !== filters.taluka) return false;
        if (filters.village && report.village_name !== filters.village) return false;
        if (filters.reportType && report.reportType !== filters.reportType) return false;
        if (filters.ownerName && !report.owner_names.includes(filters.ownerName)) return false;
        if (filters.surveyNumber && report.survey_number !== filters.surveyNumber) return false; // Filter by survey number
        return true;
    });

    const downloadReportPDF = async (report) => {
        try {
            const params = new URLSearchParams({
                state: 'maharashtra', // Assuming all reports are from Maharashtra
                district: report.district_name,
                taluka: report.taluka_name,
                village: report.village_name,
                survey_no: filters.surveyNumber || report.survey_number // Use the user-provided survey number if available
            });

            const response = await fetch(`http://65.2.140.129:8000/api/report-gen/?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            saveAs(blob, `Report_${report.khata_number}.pdf`);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF. Please try again.');
        }
    };

    const downloadAllReportsAsZip = async () => {
        const zip = new JSZip();
        const downloadPromises = filteredReports.map(async (report) => {
            try {
                const params = new URLSearchParams({
                    state: 'maharashtra',
                    district: report.district_name,
                    taluka: report.taluka_name,
                    village: report.village_name,
                    survey_no: filters.surveyNumber || report.survey_number // Use the user-provided survey number if available
                });

                const response = await fetch(`http://65.2.140.129:8000/report-gen/?${params}`);
                if (!response.ok) throw new Error(`Failed to fetch ${report.khata_number}`);
                const blob = await response.blob();
                zip.file(`Report_${report.khata_number}.pdf`, blob);
            } catch (error) {
                console.error(`Error fetching report ${report.khata_number}:`, error);
            }
        });

        await Promise.all(downloadPromises);
        zip.generateAsync({ type: 'blob' }).then((content) => {
            saveAs(content, 'All_Reports.zip');
        });
    };

    const downloadReportBySurveyNumber = async () => {
        if (!filters.surveyNumber) {
            alert("Please enter a valid survey number.");
            return;
        }

        try {
            // Add additional parameters (district, taluka, village, state)
            const params = new URLSearchParams({
                state: 'maharashtra', // Assuming all reports are from Maharashtra
                district: filters.district.toLowerCase(),
                taluka: filters.taluka.toLowerCase(),
                village: filters.village.toLowerCase(),
                survey_no: filters.surveyNumber
            });

            const response = await fetch(`http://65.2.140.129:8000/api/report-gen/?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            saveAs(blob, `Report_${filters.surveyNumber}.pdf`);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF. Please try again.');
        }
    };

    if (loading) {
        return <LoadingScreen />;
    }


    const reportTypes = ["Type 1", "Type 2", "Type 3"];
    const selectedDistrict = hierarchy.find(d => d.name === filters.district);
    const selectedTaluka = selectedDistrict?.talukas?.find(t => t.name === filters.taluka);

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
                        {hierarchy.map(district => (
                            <option key={district.code} value={district.name}>
                                {district.name}
                            </option>
                        ))}
                    </select>

                    <select
                        className="dropdown"
                        onChange={(e) => handleFilterChange('taluka', e.target.value)}
                        disabled={!filters.district}
                    >
                        <option value="">Select Taluka</option>
                        {selectedDistrict?.talukas?.map(taluka => (
                            <option key={taluka.code} value={taluka.name}>
                                {taluka.name}
                            </option>
                        ))}
                    </select>

                    <select
                        className="dropdown"
                        onChange={(e) => handleFilterChange('village', e.target.value)}
                        disabled={!filters.taluka}
                    >
                        <option value="">Select Village</option>
                        {selectedTaluka?.villages?.map(village => (
                            <option key={village.code} value={village.name}>
                                {village.name}
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
                        {reports.map((report, index) => (
                            <option key={index} value={report.owner_names}>
                                {report.owner_names}
                            </option>
                        ))}
                    </select>

                    {/* Added survey number input field */}
                    <input
                        type="text"
                        className="survey-number-input"
                        placeholder="Enter Survey Number"
                        value={filters.surveyNumber}
                        onChange={(e) => handleFilterChange('surveyNumber', e.target.value)}
                    />

                    {/* Added Download Button */}
                    <button
                        className="download-button"
                        onClick={downloadReportBySurveyNumber}
                    >
                        Download Report by Survey Number
                    </button>
                </div>
            </div>

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
                                    <h3>Khata Number: {report.khata_number}</h3>
                                    <p>Survey Number: {report.survey_number}</p>
                                    <p>Village Name: {report.village_name}</p>
                                    <p>Owner Name(s): {report.owner_names}</p>
                                </div>
                                <button
                                    className="download-button"
                                    onClick={() => downloadReportPDF(report)}
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
