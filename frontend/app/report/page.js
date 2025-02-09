'use client';
import './ReportPage.css';
import 'bootstrap/dist/css/bootstrap.min.css';
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
        const { latitude, longitude } = filters;

        if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
            alert('Please enter valid Latitude and Longitude values.');
            return;
        }

        setIsSearchingLatLong(true);
        const latLongQuery = `${latitude},${longitude}`;

        try {
            const params = new URLSearchParams({ lat: latitude, lng: longitude });

            const response = await fetch(`http://65.2.140.129:8000/api/plot/?${params}`);

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            console.log('Search Results:', data);
            setReports(data);

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
        <div className="container-fluid report-page-container">
            {showLoginPopup && (
                <div className="position-fixed top-50 start-50 translate-middle bg-dark text-white p-3 rounded shadow-lg" style={{ zIndex: 1000, width: '300px' }}>
                    <p className="text-center">🔒 Please login to continue</p>
                </div>
            )}

            <nav className="navbar navbar-light bg-light">
                <div className="container-fluid">
                    <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: "40px", height: "40px" }}>
                        U
                    </div>
                </div>
            </nav>

            <div className="card p-4 mt-3">
                <h2 className="mb-3 text-center">Filter Reports</h2>
                <div className="row g-3">
                    <div className="col-md-4">
                        <select className="form-select" disabled>
                            <option value="Maharashtra" selected>Maharashtra</option>
                        </select>
                    </div>
                    <div className="col-md-4">
                        <select className="form-select" onChange={e => handleFilterChange('district', e.target.value)}>
                            <option value="">Select District</option>
                            {hierarchy.map(d => <option key={d.code} value={d.name}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="col-md-4">
                        <select className="form-select" onChange={e => handleFilterChange('taluka', e.target.value)} disabled={!filters.district}>
                            <option value="">Select Taluka</option>
                            {hierarchy.find(d => d.name === filters.district)?.talukas?.map(t => (
                                <option key={t.code} value={t.name}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-4">
                        <select className="form-select" onChange={e => handleFilterChange('village', e.target.value)} disabled={!filters.taluka}>
                            <option value="">Select Village</option>
                            {hierarchy.find(d => d.name === filters.district)?.talukas?.find(t => t.name === filters.taluka)?.villages?.map(v => (
                                <option key={v.code} value={v.name}>{v.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-4">
                        <select className="form-select" disabled>
                            <option value="Maharashtra" selected>Coming Soon</option>
                        </select>
                    </div>
                    <div className="col-md-4">
                        <select className="form-select" onChange={e => handleFilterChange('khataNumber', e.target.value)} disabled={!filters.village}>
                            <option value="">Select Khata Number</option>
                            {khataNumbers.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>
                </div>

                <div className="text-center mt-3">
                    <button
                        className="btn btn-dark"
                        onClick={downloadReportBySurveyNumber}
                        disabled={!filters.district || !filters.taluka || !filters.village || !filters.khataNumber}
                    >
                        Download Report by Khata Number
                    </button>
                </div>

                <div className="text-center mt-3 fw-bold">
                    <p>OR</p>
                </div>

                <div className="d-flex justify-content-center gap-5">
                    <input
                        type="text"
                        className="form-control mx-2"
                        placeholder="Latitude (e.g., 18.9750)"
                        value={filters.latitude || ""}
                        onChange={(e) => handleFilterChange('latitude', e.target.value)}
                    />
                    <input
                        type="text"
                        className="form-control mx-2"
                        placeholder="Longitude (e.g., 72.8233)"
                        value={filters.longitude || ""}
                        onChange={(e) => handleFilterChange('longitude', e.target.value)}
                    />
                </div>
                <div className="text-center mt-3">
                    <button className="btn btn-secondary" onClick={searchByLatLong}>
                        Search by Latitude and Longitude
                    </button>
                </div>


            </div>

            <div className="content-section mt-4">
                {isSearchingLatLong ? (
                    <div className="list-group">
                        {reports.map((report, index) => (
                            <div key={index} className="card mb-3 shadow-sm">
                                <div className="card-body d-flex justify-content-between align-items-center">
                                    <div>
                                        <h5 className="card-title">Khata Number: {report.khata_no}</h5>
                                        <p className="card-text"><strong>District Name:</strong> {report.district}</p>
                                        <p className="card-text"><strong>Village Name:</strong> {report.village_name}</p>
                                        <p className="card-text"><strong>Owner Name(s):</strong> {report.owner_names}</p>
                                    </div>
                                    <button className="btn btn-dark" onClick={() => downloadReportPDF(report.khata_no, report.district, report.taluka, report.village_name)}>
                                        Download Report
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="d-flex justify-content-center gap-4">
                        <div className="text-center">
                            <img
                                src="/india.jpeg"
                                alt="Placeholder 1"
                                className="img-fluid rounded shadow"
                                style={{ width: "300px", height: "200px", objectFit: "cover" }}
                            />
                            <p className="mt-2 text-muted">6 districts covered across MH, Rajasthan, Telangana so far, and rapidly expanding.</p>
                        </div>
                        <div className="text-center">
                            <img
                                src="/report.png"
                                alt="Placeholder 2"
                                className="img-fluid rounded shadow"
                                style={{ width: "300px", height: "200px", objectFit: "cover" }}
                            />
                            <p className="mt-2 text-muted">A sample valuation report - generated for an arbitrary khata number.</p>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );

}