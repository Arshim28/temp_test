'use client';
import './ReportPage.css';
import { FaSearch } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

    const [hierarchy, setHierarchy] = useState([]);
    const [khataNumbers, setKhataNumbers] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showLoginPopup, setShowLoginPopup] = useState(false);
    const [isSearchingLatLong, setIsSearchingLatLong] = useState(false);

    const router = useRouter();
    const token = localStorage.getItem('authToken');


    useEffect(() => {
        if (!token) {
            setShowLoginPopup(true);
            setTimeout(() => {
                setShowLoginPopup(false);
                router.push('/login');
            }, 2000);
        }
    }, [token]);

    useEffect(() => {
        const fetchHierarchy = async () => {
            try {
                const res = await axios.get('http://65.2.140.129:8000/api/maharashtra-hierarchy/');
                setHierarchy(res.data);
            } catch (error) {
                console.error('Error fetching hierarchy:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchHierarchy();
    }, []);

    useEffect(() => {
        if (filters.district && filters.taluka && filters.village) {
            const fetchKhataNumbers = async () => {
                try {
                    const res = await axios.get(`http://65.2.140.129:8000/api/khata-numbers/`, {
                        params: {
                            district: filters.district,
                            taluka_name: filters.taluka,
                            village_name: filters.village
                        }
                    });

                    console.log('Khata Numbers Response:', res.data);

                    // Extract khata_numbers array and set state
                    setKhataNumbers(Array.isArray(res.data.khata_numbers) ? res.data.khata_numbers : []);
                } catch (error) {
                    console.error('Error fetching khata numbers:', error);
                    setKhataNumbers([]); // Ensure fallback to an empty array
                }
            };
            fetchKhataNumbers();
        } else {
            setKhataNumbers([]); // Reset when filters change
        }
    }, [filters.district, filters.taluka, filters.village]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value,
            ...(field === 'district' && { taluka: '', village: '', khataNumber: '' }),
            ...(field === 'taluka' && { village: '', khataNumber: '' }),
            ...(field === 'village' && { khataNumber: '' }),
        }));
    };

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

    const downloadReportPDF = async (surveyNumber, district, taluka, village) => {
        if (!surveyNumber) {
            alert("Please enter a valid Survey Number.");
            return;
        }
        try {
            const response = await axios.get(`http://65.2.140.129:8000/api/report-gen/`, {
                params: {
                    state: 'maharashtra',
                    district: district.toLowerCase(),
                    taluka: taluka.toLowerCase(),
                    village: village.toLowerCase(),
                    survey_no: surveyNumber
                },
                responseType: 'blob',
            });

            saveAs(response.data, `Report_${surveyNumber}.pdf`);
        } catch (error) {
            console.error('Error downloading report:', error);
            alert('Download failed.');
        }
    };

    const downloadReportBySurveyNumber = async () => {
        if (!filters.khataNumber) {
            alert("Please enter a valid survey number.");
            return;
        }

        try {
            const params = new URLSearchParams({
                state: 'maharashtra',
                district: filters.district.toLowerCase(),
                taluka: filters.taluka.toLowerCase(),
                village: filters.village.toLowerCase(),
                survey_no: filters.khataNumber
            });

            const response = await fetch(`http://65.2.140.129:8000/api/report-gen/?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            saveAs(blob, `Report_${filters.khataNumber}.pdf`);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF. Please try again.');
        }
    };

    if (loading) {
        return <LoadingScreen />;
    }


    const selectedDistrict = hierarchy.find(d => d.name === filters.district);
    const selectedTaluka = selectedDistrict?.talukas?.find(t => t.name === filters.taluka);

    return (
        <div className="report-page-container">
            {showLoginPopup && (
                <div className="popup">
                    <div className="popup-content">
                        <p>🔒 Please login to continue</p>
                    </div>
                </div>
            )}

            <div className="top-navbar">
                <div className="user-profile-circle">U</div>
            </div>

            <div className="filter-section">
                <h2 className="filter-heading">Filter Reports</h2>
                <div className="filters-container">
                    <select className="dropdown" disabled>
                        <option value="Maharashtra" selected>Maharashtra</option>
                    </select>
                    <select className="dropdown" onChange={e => handleFilterChange('district', e.target.value)}>
                        <option value="">Select District</option>
                        {hierarchy.map(d => <option key={d.code} value={d.name}>{d.name}</option>)}
                    </select>

                    <select className="dropdown" onChange={e => handleFilterChange('taluka', e.target.value)} disabled={!filters.district}>
                        <option value="">Select Taluka</option>
                        {hierarchy.find(d => d.name === filters.district)?.talukas?.map(t => (
                            <option key={t.code} value={t.name}>{t.name}</option>
                        ))}
                    </select>

                    <select className="dropdown" onChange={e => handleFilterChange('village', e.target.value)} disabled={!filters.taluka}>
                        <option value="">Select Village</option>
                        {hierarchy.find(d => d.name === filters.district)?.talukas?.find(t => t.name === filters.taluka)?.villages?.map(v => (
                            <option key={v.code} value={v.name}>{v.name}</option>
                        ))}
                    </select>
                    <select className="dropdown" disabled>
                        <option value="Maharashtra" selected>Coming Soon</option>
                    </select>

                    <select className="dropdown" onChange={e => handleFilterChange('khataNumber', e.target.value)} disabled={!filters.village}>
                        <option value="">Select Khata Number</option>
                        {khataNumbers.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                </div>

                <div className="download-section">
                    <button
                        className="download-button"
                        onClick={downloadReportBySurveyNumber}
                        disabled={!filters.district || !filters.taluka || !filters.village || !filters.khataNumber}
                    >
                        Download Report by Khata Number
                    </button>
                </div>

                <div className="text-center" style={{ marginTop: "15px", fontSize: "16px" }}>
                    <p>OR</p>
                </div>

                <div className="search-lat-long-container">
                    <input
                        type="text"
                        className="search-lat-long-bar"
                        placeholder="Eg. 18.9750° N, 72.8233° E"
                        defaultValue={filters.longitude}
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
                        {reports.map((report, index) => (
                            <div key={index} className="report-card-row">
                                <div>
                                    <h3>Khata Number: {report.khata_no}</h3>
                                    <p>District Name: {report.district}</p>
                                    <p>Village Name: {report.village_name}</p>
                                    <p>Owner Name(s): {report.owner_names}</p>
                                </div>
                                <button className="download-button" onClick={() => downloadReportPDF(report.khata_no, report.district, report.taluka, report.village_name)}>
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
            {/* Styles for the popup */}
            <style jsx>{`
                .popup {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.8);
                    padding: 20px;
                    border-radius: 10px;
                    color: white;
                    font-size: 18px;
                    text-align: center;
                    animation: fadeIn 0.3s ease-in-out;
                    z-index: 1000;
                    width: 300px;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
                }

                .popup-content {
                    padding: 10px;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translate(-50%, -55%); }
                    to { opacity: 1; transform: translate(-50%, -50%); }
                }
            `}</style>
        </div>
    );
}