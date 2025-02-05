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
    const [isSearchingLatLong, setIsSearchingLatLong] = useState(false); // Track if user searched by lat/long

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

    const searchByLatLong = async () => {
        const latLongInput = filters.longitude;
        const latLongParts = latLongInput.split(',').map(part => part.trim());

        if (latLongParts.length !== 2 || isNaN(latLongParts[0]) || isNaN(latLongParts[1])) {
            alert('Please enter a valid Latitude and Longitude in the format: "latitude,longitude"');
            return;
        }

        setIsSearchingLatLong(true); // Mark that lat/long search has occurred
        const lat = latLongParts[0];
        const long = latLongParts[1];

        try {
            const params = new URLSearchParams({
                lat: lat,
                lng: long,
            });

            const response = await fetch(`http://65.2.140.129:8000/api/plot/?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Search Results:', data);
            // Handle the response and update the UI as necessary
            setReports(data); // Assuming the API returns the reports based on the lat/long search

        } catch (error) {
            console.error('Error searching by Latitude and Longitude:', error);
            alert('Failed to search by Latitude and Longitude. Please try again.');
        }
    };

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

    const downloadReportBySurveyNumber = async () => {
        if (!filters.surveyNumber) {
            alert("Please enter a valid survey number.");
            return;
        }

        try {
            const params = new URLSearchParams({
                state: 'maharashtra',
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
                    <select className="dropdown" onChange={(e) => handleFilterChange('state', e.target.value)}>
                        <option value="">Select State</option>
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Gujarat">Gujarat</option>
                        <option value="Rajasthan">Rajasthan</option>
                        <option value="Karnataka">Karnataka</option>
                    </select>

                    <select className="dropdown" onChange={(e) => handleFilterChange('district', e.target.value)}>
                        <option value="">Select District</option>
                        {hierarchy.map(district => (
                            <option key={district.code} value={district.name}>{district.name}</option>
                        ))}
                    </select>

                    <select className="dropdown" onChange={(e) => handleFilterChange('taluka', e.target.value)} disabled={!filters.district}>
                        <option value="">Select Taluka</option>
                        {selectedDistrict?.talukas?.map(taluka => (
                            <option key={taluka.code} value={taluka.name}>{taluka.name}</option>
                        ))}
                    </select>

                    <select className="dropdown" onChange={(e) => handleFilterChange('village', e.target.value)} disabled={!filters.taluka}>
                        <option value="">Select Village</option>
                        {selectedTaluka?.villages?.map(village => (
                            <option key={village.code} value={village.name}>{village.name}</option>
                        ))}
                    </select>

                    <select className="dropdown" onChange={(e) => handleFilterChange('reportType', e.target.value)}>
                        <option value="">Select Report Type</option>
                        {reportTypes.map((type, index) => (
                            <option key={index} value={type}>{type}</option>
                        ))}
                    </select>
                    <select className="dropdown" onChange={(e) => handleFilterChange('village', e.target.value)} disabled={!filters.taluka}>
                        <option value="">Select Khata Number</option>
                        {selectedTaluka?.villages?.map(village => (
                            <option key={village.code} value={village.name}>{village.name}</option>
                        ))}
                    </select>

                    {/* <input
                        type="text"
                        className="survey-number-input"
                        placeholder="Enter Khata Number"
                        value={filters.surveyNumber}
                        onChange={(e) => handleFilterChange('surveyNumber', e.target.value)}
                    /> */}
                </div>

                <div className="download-section">
                    <button className="download-button" onClick={downloadReportBySurveyNumber}>Download Report by Khata Number</button>
                </div>

                <div className="text-center" style={{ marginTop: "15px", fontSize: "16px" }}>
                    <p>OR</p>
                </div>

                <div className="search-lat-long-container">
                    <input
                        type="text"
                        className="search-lat-long-bar"
                        placeholder="Eg. 18.9750° N, 72.8233° E"
                        value={filters.longitude}
                        onChange={(e) => handleFilterChange('longitude', e.target.value)}
                    />
                    <button className="search-button-lat-long" onClick={searchByLatLong}>
                        Search by Latitude and Longitude
                    </button>
                </div>
            </div>

            <div className="content-section">
                {isSearchingLatLong ? (
                    <div className="report-list">
                        {filteredReports.map((report, index) => (
                            <div key={index} className="report-card-row">
                                <div>
                                    <h3>Khata Number: {report.khata_number}</h3>
                                    <p>Survey Number: {report.survey_number}</p>
                                    <p>Village Name: {report.village_name}</p>
                                    <p>Owner Name(s): {report.owner_names}</p>
                                </div>
                                <button className="download-button" onClick={() => downloadReportPDF(report)}>
                                    Download Report
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
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
                )}
            </div>
        </div>
    );
}
