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
        khata_no: '', // Added survey number
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

        // setIsSearchingLatLong(true);
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
    const [searchType, setSearchType] = useState("khata")

    const handleSearchTypeChange = (type) => {
        setSearchType(type);
    };



    const downloadReportPDF = async (khata_no, district, taluka, village) => {
        if (!khata_no) {
            alert("Please enter a valid Khata.");
            return;
        }
        try {
            const response = await axios.get(`http://65.2.140.129:8000/api/report-gen/`, {
                params: {
                    state: 'maharashtra',
                    district: district.toLowerCase(),
                    taluka: taluka.toLowerCase(),
                    village: village.toLowerCase(),
                    khata_no: khata_no
                },
                responseType: 'blob',
            });

            saveAs(response.data, `Report_${khata_no}.pdf`);
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
                khata_no: filters.khataNumber
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
        <div className="container-fluid report-page-container px-4">
            {showLoginPopup && (
                <div className="position-fixed top-50 start-50 translate-middle bg-dark text-white p-3 rounded shadow-lg" style={{ zIndex: 1000, width: '300px' }}>
                    <p className="text-center">🔒 Please login to continue</p>
                </div>
            )}

            {/* Upper Container: Search & Filtering */}
            <div className="card p-4 mt-3 w-100" style={{ maxWidth: "100vw" }}>
                <h2 className="text-center">Worried about the land you're investing in? Let the Terrastack AI agent take care of it.</h2>

                {/* Selection Options */}
                <div className="d-flex justify-content-center gap-3 mt-3">
                    <button className={`btn ${searchType === 'khata' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setSearchType('khata')}>Khata Number</button>
                    <button className={`btn ${searchType === 'coordinates' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setSearchType('coordinates')}>Coordinates</button>
                    <button className={`btn ${searchType === 'owner' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setSearchType('owner')}>Owner Name</button>
                </div>

                {/* Filters (Only for Khata & Owner) */}
                {(searchType === 'khata' || searchType === 'owner') && (
                    <div className="row g-3 mt-3">
                        <div className="col-md-3">
                            <select className="form-select" disabled>
                                <option selected>Maharashtra</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <select className="form-select" onChange={e => handleFilterChange('district', e.target.value)}>
                                <option value="">Select District</option>
                                {hierarchy.map(d => <option key={d.code} value={d.name}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <select className="form-select" onChange={e => handleFilterChange('taluka', e.target.value)} disabled={!filters.district}>
                                <option value="">Select Taluka</option>
                                {hierarchy.find(d => d.name === filters.district)?.talukas?.map(t => (
                                    <option key={t.code} value={t.name}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <select className="form-select" onChange={e => handleFilterChange('village', e.target.value)} disabled={!filters.taluka}>
                                <option value="">Select Village</option>
                                {hierarchy.find(d => d.name === filters.district)?.talukas?.find(t => t.name === filters.taluka)?.villages?.map(v => (
                                    <option key={v.code} value={v.name}>{v.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Search Bar */}
                <div className="input-group mt-3">
                    {searchType === 'khata' && (
                        <input type="text" className="form-control" placeholder="Enter Khata Number" onChange={(e) => handleFilterChange('khataNumber', e.target.value)} />
                    )}
                    {searchType === 'owner' && (
                        <input type="text" className="form-control" placeholder="Enter Owner Name" onChange={(e) => handleFilterChange('ownerName', e.target.value)} />
                    )}
                    {searchType === 'coordinates' && (
                        <>
                            <input type="text" className="form-control" placeholder="Latitude" onChange={(e) => handleFilterChange('latitude', e.target.value)} />
                            <input type="text" className="form-control" placeholder="Longitude" onChange={(e) => handleFilterChange('longitude', e.target.value)} />
                        </>
                    )}
                    <button className="btn btn-dark" onClick={searchType === 'coordinates' ? searchByLatLong : downloadReportBySurveyNumber}>
                        Search
                    </button>
                </div>

                {/* Search Results */}
                <div className="mt-3 overflow-auto" style={{ maxHeight: "250px" }}>
                    {reports.slice(0, 5).map((report, index) => (
                        <div key={index} className="card mb-2 shadow-sm">
                            <div className="card-body d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 className="card-title">Khata Number: {report.khata_no}</h5>
                                    <p className="card-text"><strong>District:</strong> {report.district}</p>
                                    <p className="card-text"><strong>Village:</strong> {report.village_name}</p>
                                    <p className="card-text"><strong>Owner(s):</strong> {report.owner_names}</p>
                                </div>
                                <button className="btn btn-dark" onClick={() => downloadReportPDF(report.khata_no, report.district, report.taluka, report.village_name)}>
                                    Download Report
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Lower Container: Placeholder Images */}
            <div className="content-section mt-4 w-100 p-4" style={{ maxWidth: "100vw" }}>
                {!isSearchingLatLong && (
                    <div className="d-flex justify-content-center gap-4">
                        <div className="text-center">
                            <img
                                src="/india.jpeg"
                                alt="Placeholder 1"
                                className="img-fluid rounded shadow"
                                style={{ width: "100%", maxWidth: "500px", height: "auto", objectFit: "cover" }}
                            />
                            <p className="mt-2 text-muted">6 districts covered across MH, Rajasthan, Telangana so far, and rapidly expanding.</p>
                        </div>
                        <div className="text-center">
                            <img
                                src="/report.png"
                                alt="Placeholder 2"
                                className="img-fluid rounded shadow"
                                style={{ width: "100%", maxWidth: "500px", height: "auto", objectFit: "cover" }}
                            />
                            <p className="mt-2 text-muted">A sample valuation report - generated for an arbitrary khata number.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );


}