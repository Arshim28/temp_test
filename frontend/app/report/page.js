"use client";
import "./ReportPage.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaSearch, FaDownload } from "react-icons/fa";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import axios from "axios";
import LoadingScreen from "../loader/page";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

// Reusable SearchBar component with autocomplete
function SearchBar({ 
  searchType, 
  suggestionsData, 
  onSelectSuggestion, 
  placeholder 
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    
    // Ensure suggestionsData is an array
    if (!Array.isArray(suggestionsData) || suggestionsData.length === 0) {
      console.log(`${searchType} search: No suggestions data available`);
      setSuggestions([]);
      return;
    }
    
    console.log(`${searchType} search: Filtering ${suggestionsData.length} suggestions with query "${query}"`);
    
    // Filter suggestions based on query (case-insensitive) and take top 5
    const filtered = suggestionsData.filter(item => {
      // Convert item to string to prevent TypeError if item is a number
      const itemStr = String(item);
      return itemStr.toLowerCase().includes(query.toLowerCase());
    });
    
    console.log(`${searchType} search: Found ${filtered.length} matching suggestions`);
    setSuggestions(filtered.slice(0, 5));
  }, [query, suggestionsData, searchType]);

  return (
    <div className="search-bar" style={{ position: "relative" }}>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => setQuery(e.target.value)}
        className="form-control"
      />
      {suggestions.length > 0 && (
        <ul 
          className="dropdown-menu show" 
          style={{ width: "100%", position: "absolute", zIndex: 1000 }}
        >
          {suggestions.map((item, index) => (
            <li
              key={index}
              onClick={() => {
                onSelectSuggestion(item);
                setQuery(String(item));
                setSuggestions([]);
              }}
              style={{ cursor: "pointer", padding: "5px 10px" }}
            >
              {String(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ReportPage() {
    const [filters, setFilters] = useState({
        state: "",
        district: "",
        taluka: "",
        village: "",
        reportType: "",
        ownerName: "",
        khataNumber: "", // For khata search
        gatNumber: "",   // For gat search
        surveyNumber: "", // For survey search
        latitude: "",
        longitude: ""
    });

    const [hierarchy, setHierarchy] = useState([]);
    const [khataNumbers, setKhataNumbers] = useState([]);
    const [gatNumbers, setGatNumbers] = useState([]);
    const [surveyNumbers, setSurveyNumbers] = useState([]);
    const [reports, setReports] = useState([]);
    const [reports1, setReports1] = useState([]);
    const [searchType, setSearchType] = useState("khata");
    const [loading, setLoading] = useState(true);
    const [showLoginPopup, setShowLoginPopup] = useState(false);
    const [isSearchingLatLong, setIsSearchingLatLong] = useState(false);
    const [loadingmessage, setLoadingMessage] = useState("Loading...");
    const [userDetails, setUserDetails] = useState(null);
    const router = useRouter();
    const token = localStorage.getItem("authToken");
    const [isLoading, setIsLoading] = useState(false);

    // useEffect(() => {
    //     if (!token) {
    //         setShowLoginPopup(true);
    //         setTimeout(() => {
    //             setShowLoginPopup(false);
    //             router.push('/signin');
    //         }, 2000);
    //     }
    // }, [token]);





    useEffect(() => {
        const fetchHierarchy = async () => {
            try {
                const res = await axios.get(
                    `${BASE_URL}/maharashtra-hierarchy/`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    },
                );

                const userResponse = await axios.get(`${BASE_URL}/user/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setUserDetails(userResponse.data.user);

                console.log("User Details:", userResponse.data.user);


                setHierarchy(res.data);
            } catch (error) {
                console.error("Error fetching hierarchy:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHierarchy();
        const fetchPlans = async () => {
            try {
                const userResponse = await axios.get(`${BASE_URL}/user/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const plansResponse = await axios.get(
                    `${BASE_URL}/plans/reports/`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    },
                );
                console.log("Plans:", plansResponse.data);

                setUserDetails(userResponse.data.user);

                console.log("User Details:", userResponse.data.user);

                setPlans(plansResponse.data || []);
                setSelectedPlan(plansResponse.data?.[0] || null); // Default selection
            } catch (err) {
                console.error("Error fetching plans:", err);
            } finally {
                setLoading(false);
            }
        };
    }, []);

    useEffect(() => {
        if (filters.district && filters.taluka && filters.village) {
            fetchKhataNumbersAndReports();
        } else {
            setKhataNumbers([]);
            setGatNumbers([]);
            setSurveyNumbers([]);
            setReports([]); // Reset reports when filters change
        }
    }, [filters.district, filters.taluka, filters.village]);
    
    // This effect allows linkage between search types (survey -> khata)
    useEffect(() => {
        if (searchType === "survey" && filters.surveyNumber && filters.district && filters.taluka && filters.village) {
            // When a user selects a survey number, we can optionally fetch the corresponding khata numbers
            // This creates a link between search types
            fetchKhataFromSurvey(filters.surveyNumber);
        }
    }, [searchType, filters.surveyNumber, filters.district, filters.taluka, filters.village]);

    const fetchKhataNumbersAndReports = async () => {
        try {
            // setLoading(true);
            setIsLoading(true);
            const res = await axios.get(`${BASE_URL}/khata-numbers/`, {
                params: {
                    district: filters.district,
                    taluka_name: filters.taluka,
                    village_name: filters.village,
                },
                headers: { Authorization: `Bearer ${token}` },
            });

            console.log("Khata Numbers Response:", res.data);
            setKhataNumbers(
                Array.isArray(res.data.khata_numbers)
                    ? res.data.khata_numbers
                    : [],
            );
            // Debug logging for gat numbers
            console.log("Raw gat numbers from API:", res.data.gat_numbers);
            const formattedGatNumbers = Array.isArray(res.data.gat_numbers) ? res.data.gat_numbers : [];
            console.log("Formatted gat numbers:", formattedGatNumbers);
            setGatNumbers(formattedGatNumbers);
            setSurveyNumbers(
                Array.isArray(res.data.survey_numbers)
                    ? res.data.survey_numbers
                    : [],
            );

            const params = new URLSearchParams({
                district: filters.district,
                taluka: filters.taluka,
                village: filters.village,
            });

            const resp = await fetch(`${BASE_URL}/khata-preview/?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);

            const data = await resp.json();
            console.log("Khata Preview Response:", data);
            setReports(data); // Set reports from khata preview API
            
            // Check if we got gat and survey numbers from the backend
            const hasGatNumbersFromAPI = Array.isArray(res.data.gat_numbers) && res.data.gat_numbers.length > 0;
            const hasSurveyNumbersFromAPI = Array.isArray(res.data.survey_numbers) && res.data.survey_numbers.length > 0;
            
            console.log("Has gat numbers from API:", hasGatNumbersFromAPI);
            console.log("Has survey numbers from API:", hasSurveyNumbersFromAPI);
            
            // If not available from the direct API or we got empty arrays, extract from preview data
            if (!hasGatNumbersFromAPI) {
                // Extract from preview data as a fallback
                console.log("Extracting gat numbers from preview data...");
                const gatNumbersFromPreview = data
                    .map(item => item.gat_no)
                    .filter(Boolean)
                    .map(item => String(item)); // Convert all to strings for consistency
                
                console.log(`Found ${gatNumbersFromPreview.length} gat numbers from preview data`);
                
                if (gatNumbersFromPreview.length > 0) {
                    setGatNumbers(gatNumbersFromPreview);
                }
            }
            
            if (!hasSurveyNumbersFromAPI) {
                // Extract from preview data as a fallback
                console.log("Extracting survey numbers from preview data...");
                const surveyNumbersFromPreview = data
                    .map(item => item.survey_no)
                    .filter(Boolean)
                    .map(item => String(item)); // Convert all to strings for consistency
                
                console.log(`Found ${surveyNumbersFromPreview.length} survey numbers from preview data`);
                
                if (surveyNumbersFromPreview.length > 0) {
                    setSurveyNumbers(surveyNumbersFromPreview);
                }
            }
        } catch (error) {
            console.error("Error fetching khata numbers:", error);
            setKhataNumbers([]);
            setGatNumbers([]);
            setSurveyNumbers([]);
            setReports([]);
        } finally {
            setIsLoading(false); // Stop loading when done
        }
    };
    
    // State to hold related khata numbers for a survey
    const [relatedKhataNumbers, setRelatedKhataNumbers] = useState([]);
    
    // New function to get khata numbers associated with a survey number
    const fetchKhataFromSurvey = async (surveyNumber) => {
        if (!surveyNumber || !filters.district || !filters.taluka || !filters.village) return;
        
        try {
            const params = new URLSearchParams({
                district: filters.district,
                taluka: filters.taluka,
                village: filters.village,
                survey_no: surveyNumber
            });
            
            const response = await fetch(`${BASE_URL}/khata-from-survey/?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            console.log("Khata from Survey Response:", data);
            
            if (data.khata_numbers && data.khata_numbers.length > 0) {
                // Store the khata numbers for reference, but don't automatically switch to khata search
                setRelatedKhataNumbers(data.khata_numbers);
                console.log(`Survey ${surveyNumber} is associated with Khatas:`, data.khata_numbers);
            } else {
                setRelatedKhataNumbers([]);
            }
        } catch (error) {
            console.error("Error fetching khata from survey:", error);
            setRelatedKhataNumbers([]);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
            ...(field === "district" && {
                taluka: "",
                village: "",
                khataNumber: "",
                gatNumber: "",
                surveyNumber: "",
            }),
            ...(field === "taluka" && { village: "", khataNumber: "", gatNumber: "", surveyNumber: "" }),
            ...(field === "village" && { khataNumber: "", gatNumber: "", surveyNumber: "" }),
        }));
    };

    const searchByLatLong = async () => {
        const { latitude, longitude } = filters;

        if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
            alert("Please enter valid Latitude and Longitude values.");
            return;
        }
        setIsLoading(true);
        // console.log(isLoading)
        setReports([]);
        // setIsSearchingLatLong(true);
        const latLongQuery = `${latitude},${longitude}`;

        try {
            const params = new URLSearchParams({
                lat: latitude,
                lng: longitude,
            });

            const response = await fetch(`${BASE_URL}/plot/?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok)
                throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            console.log("Search by lat lang");
            console.log("Search Results:", data);
            setReports(data);
        } catch (error) {
            console.error("Error searching by Latitude and Longitude:", error);
            alert(
                "Failed to search by Latitude and Longitude. Please try again.",
            );
        } finally {
            setIsLoading(false); // Stop loading when done
        }
    };

    const handleSearchTypeChange = (type) => {
        setSearchType(type);
    };

    // Changes by saurabh - just tryin; revert  later
    // const fetchReportsByKhata = async (khata_no, district, taluka, village) => {
    //     if (!khata_no || khata_no.trim() === "") {
    //         alert("Please enter a valid Khata.");
    //         return;
    //     }

    //     try {
    //         setIsLoading(true);
    //         const response = await axios.get(`${BASE_URL}/khata/report-info`, {
    //             params: {
    //                 state: "maharashtra",
    //                 district: district.toLowerCase(),
    //                 taluka: taluka.toLowerCase(),
    //                 village: village.toLowerCase(),
    //                 khata_no: khata_no.trim(),
    //             },
    //             responseType: "blob", // Expecting binary data
    //             headers: { Authorization: `Bearer ${token}` },
    //         });

    //         // Convert blob data to text or JSON if needed
    //         const blob = response.data;
    //         const textData = await blob.text();
    //         const data = JSON.parse(textData);

    //         console.log("Khata Preview Response:", data);
    //         setReports(data);
    //     } catch (error) {
    //         console.error("Error in fetching reports by khata:", error);
    //         alert("Fetching Reports Failed");
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };

    // end of changes
    const fetchReportsByKhata = async (khata_no, district, taluka, village) => {
        // Convert khata_no to string to prevent TypeError
        const khataStr = String(khata_no || "");
        
        if (!khataStr || khataStr.trim() === "") {
            alert("Please enter a valid Khata.");
            return;
        }
    
        try {
            setIsLoading(true);
            // Use the khata/report-info endpoint instead of khata-preview
            const params = new URLSearchParams({
                number: khataStr,
                type: "khata",
                district: district,
                taluka: taluka,
                village: village
            });
    
            const response = await fetch(`${BASE_URL}/khata/report-info/?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
            console.log("Khata Report Info Response:", data);
            setReports(data);
        } catch (error) {
            console.error("Error in fetching reports by khata:", error);
            alert("Fetching Reports Failed");
        } finally {
            setIsLoading(false);
        }
    };
    const fetchReportsByGat = async (gat_no, district, taluka, village) => {
        // Convert gat_no to string to prevent TypeError
        const gatStr = String(gat_no || "");
        
        if (!gatStr || gatStr.trim() === "") {
            alert("Please enter a valid Gat Number.");
            return;
        }
    
        try {
            setIsLoading(true);
            // Use the same endpoint with type=gat
            const params = new URLSearchParams({
                number: gatStr,
                type: "gat",
                district: district,
                taluka: taluka,
                village: village
            });
    
            const response = await fetch(`${BASE_URL}/khata/report-info/?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
            console.log("Gat Report Info Response:", data);
            setReports(data);
        } catch (error) {
            console.error("Error in fetching reports by gat:", error);
            alert("Fetching Reports Failed");
        } finally {
            setIsLoading(false);
        }
    };

const fetchReportsBySurvey = async (survey_no, district, taluka, village) => {
    // Convert survey_no to string to prevent TypeError
    const surveyStr = String(survey_no || "");
    
    if (!surveyStr || surveyStr.trim() === "") {
        alert("Please enter a valid Survey Number.");
        return;
    }

    try {
        setIsLoading(true);
        // Use the same endpoint with type=survey
        const params = new URLSearchParams({
            number: surveyStr,
            type: "survey",
            district: district,
            taluka: taluka,
            village: village
        });

        const response = await fetch(`${BASE_URL}/khata/report-info/?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Survey Report Info Response:", data);
        setReports(data);
    } catch (error) {
        console.error("Error in fetching reports by survey:", error);
        alert("Fetching Reports Failed");
    } finally {
        setIsLoading(false);
    }
};
    const downloadReportPDF = async (khata_no, district, taluka, village, poltID) => {
        // Convert khata_no to string to prevent TypeError
        const khataStr = String(khata_no || "");
        
        if (!khataStr) {
            alert("Please enter a valid Khata.");
            return;
        }
        try {
            const response = await axios.get(`${BASE_URL}/report-gen/`, {
                params: {
                    state: "maharashtra",
                    district: district ? district.toLowerCase() : "",
                    taluka: taluka ? taluka.toLowerCase() : "",
                    village: village ? village.toLowerCase() : "",
                    khata_no: khataStr,
                    plot_id: poltID,
                },
                responseType: "blob",
                headers: { Authorization: `Bearer ${token}` },
            });
    
            saveAs(response.data, `Report_${khataStr}.pdf`);
        } catch (error) {
            console.error("Error downloading report:", error);
            alert("Download failed.");
        }
    };
    const downloadReportBySurveyNumber = async () => {
        // Convert khataNumber to string to prevent TypeError
        const khataStr = String(filters.khataNumber || "");
        
        if (!khataStr) {
            alert("Please enter a valid survey number.");
            return;
        }

        try {
            const params = new URLSearchParams({
                state: "maharashtra",
                district: filters.district.toLowerCase(),
                taluka: filters.taluka.toLowerCase(),
                village: filters.village.toLowerCase(),
                khata_no: khataStr,
            });

            const response = await fetch(`${BASE_URL}/report-gen/?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            saveAs(blob, `Report_${khataStr}.pdf`);
        } catch (error) {
            console.error("Error downloading PDF:", error);
            alert("Failed to download PDF. Please try again.");
        }
    };

    if (loading) {
        return <LoadingScreen />;
    }

    const selectedDistrict = hierarchy.find((d) => d.name === filters.district);
    const selectedTaluka = selectedDistrict?.talukas?.find(
        (t) => t.name === filters.taluka,
    );

    if (loading) return <LoadingScreen />;

    return (
        <div className="container-fluid report-page-container px-4">
            <div className="container-fluid p-0">
                <nav
                    className="navbar navbar-light bg-white shadow-sm px-4 w-100 d-flex justify-content-between align-items-center"
                    style={{ width: "100vw" }}
                >
                    {/* Brand Name */}
                    <span
                        className="navbar-brand fw-bold"
                        onClick={() =>
                            router.push(token ? "/dashboard" : "/signin")
                        }
                        style={{
                            cursor: "pointer",
                            // fontFamily: 'inter',
                            fontSize: "1.5rem",
                        }}
                    >
                        Terrastack AI
                    </span>

                    {/* User Details Circle (Top Right) */}
                    {userDetails && (
                        <div
                            className="user-circle ms-auto"
                            onClick={() => router.push("/dashboard")}
                        >
                            {userDetails.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </nav>
            </div>

            {showLoginPopup && (
                <div
                    className="position-fixed top-50 start-50 translate-middle bg-dark text-white p-3 rounded shadow-lg"
                    style={{ zIndex: 1000, width: "300px" }}
                >
                    <p className="text-center">🔒 Please login to continue</p>
                </div>
            )}

            {/* Upper Container: Search & Filtering */}
            <div className="card p-4 mt-3 w-100" style={{ maxWidth: "100vw" }}>
                <h2
                    className="text-center"
                    style={{
                        cursor: "pointer",
                        // fontFamily: 'inter',
                        fontSize: "28px",
                        fontWeight: "600",
                    }}
                >
                    Worried about the land you're investing in? Let the
                    Terrastack AI agent take care of it.
                </h2>

                {/* Selection Options */}
                <div className="d-flex justify-content-start gap-2 mt-3">
                    <button
                        className={`btn ${searchType === "khata" ? " text-decoration-underline fw-bold" : ""}`}
                        onClick={() => setSearchType("khata")}
                        style={{ border: "none", textTransform: "uppercase", marginLeft: "0px" }}
                    >
                        <FaSearch className="me-2" />
                        Khata Number
                    </button>
                    <button
                        className={`btn ${searchType === "gat" ? " text-decoration-underline fw-bold" : ""}`}
                        onClick={() => setSearchType("gat")}
                        style={{ border: "none", textTransform: "uppercase" }}
                    >
                        {/* <FaSearch className="me-2" /> */}
                        Gat Number
                    </button>
                    <button
                        className={`btn ${searchType === "survey" ? " text-decoration-underline fw-bold" : ""}`}
                        onClick={() => setSearchType("survey")}
                        style={{ border: "none", textTransform: "uppercase" }}
                    >
                        {/* <FaSearch className="me-2" /> */}
                        Survey Number
                    </button>
                    <button
                        className={`btn ${searchType === "coordinates" ? " text-decoration-underline fw-bold" : ""}`}
                        onClick={() => setSearchType("coordinates")}
                        style={{ border: "none", textTransform: "uppercase" }}
                    >
                        {/* <FaSearch className="me-2" /> */}
                        Coordinates
                    </button>
                </div>

                {/* Filters (Only for Khata & Owner) */}
                {(searchType === "khata" || searchType === "gat" || searchType === "survey" || searchType === "owner") && (
                    <div className="row g-3 mt-3 p-6">
                        <div className="col-md-3" >
                            <select className="form-select" disabled>
                                <option selected>Maharashtra</option>
                            </select>
                        </div>
                        <div className="col-md-3 p-6">
                            <select
                                className="form-select"
                                onChange={(e) =>
                                    handleFilterChange(
                                        "district",
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">Select District</option>
                                {hierarchy.map((d) => (
                                    <option key={d.code} value={d.name}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <select
                                className="form-select"
                                onChange={(e) =>
                                    handleFilterChange("taluka", e.target.value)
                                }
                                disabled={!filters.district}
                            >
                                <option value="">Select Taluka</option>
                                {hierarchy
                                    .find((d) => d.name === filters.district)
                                    ?.talukas?.map((t) => (
                                        <option key={t.code} value={t.name}>
                                            {t.name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <select
                                className="form-select"
                                onChange={(e) =>
                                    handleFilterChange(
                                        "village",
                                        e.target.value,
                                    )
                                }
                                disabled={!filters.taluka}
                            >
                                <option value="">Select Village</option>
                                {hierarchy
                                    .find((d) => d.name === filters.district)
                                    ?.talukas?.find(
                                        (t) => t.name === filters.taluka,
                                    )
                                    ?.villages?.map((v) => (
                                        <option key={v.code} value={v.name}>
                                            {v.name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Search Bar */}
                <div className="input-group mt-3">
                    {searchType === "khata" && (
                        <div className="col-md-3 d-flex align-items-center w-100 mb-3">
                            <div className="me-2 flex-grow-1">
                                <SearchBar
                                    searchType="khata"
                                    suggestionsData={khataNumbers}
                                    onSelectSuggestion={(value) => handleFilterChange("khataNumber", value)}
                                    placeholder="Search or select a Khata Number"
                                />
                            </div>
                            <button
                                className="btn btn-dark ms-2"
                                onClick={() =>
                                    fetchReportsByKhata(
                                        filters.khataNumber,
                                        filters.district,
                                        filters.taluka,
                                        filters.village
                                    )
                                }
                                disabled={!filters.khataNumber} // Disable if no Khata number is selected
                            >
                                Search
                            </button>
                        </div>
                    )}
                    {searchType === "gat" && (
                        <div className="col-md-3 d-flex flex-column w-100 mb-3">
                            <div className="d-flex align-items-center">
                                <div className="me-2 flex-grow-1">
                                    <SearchBar
                                        searchType="gat"
                                        suggestionsData={gatNumbers}
                                        onSelectSuggestion={(value) => handleFilterChange("gatNumber", value)}
                                        placeholder="Search or select a Gat Number"
                                    />
                                </div>
                                <button
                                    className="btn btn-dark ms-2"
                                    onClick={() => {
                                        console.log("Searching by gat number:", filters.gatNumber);
                                        fetchReportsByGat(
                                            filters.gatNumber,
                                            filters.district,
                                            filters.taluka,
                                            filters.village
                                        )
                                    }}
                                    disabled={!filters.gatNumber} // Disable if no Gat number is selected
                                >
                                    Search
                                </button>
                            </div>
                            
                            {/* Debug info for gat numbers */}
                            <div className="mt-2">
                                <small className="text-muted">
                                    {gatNumbers.length === 0 ? 
                                        "No gat numbers available for this village" : 
                                        `${gatNumbers.length} gat numbers available`}
                                </small>
                            </div>
                        </div>
                    )}
                    {searchType === "survey" && (
                        <div className="col-md-3 d-flex flex-column w-100 mb-3">
                            <div className="d-flex align-items-center">
                                <div className="me-2 flex-grow-1">
                                    <SearchBar
                                        searchType="survey"
                                        suggestionsData={surveyNumbers}
                                        onSelectSuggestion={(value) => handleFilterChange("surveyNumber", value)}
                                        placeholder="Search or select a Survey Number"
                                    />
                                </div>
                                <button
                                    className="btn btn-dark ms-2"
                                    onClick={() => {
                                        console.log("Searching by survey number:", filters.surveyNumber);
                                        fetchReportsBySurvey(
                                            filters.surveyNumber,
                                            filters.district,
                                            filters.taluka,
                                            filters.village
                                        );
                                    }}
                                    disabled={!filters.surveyNumber} // Disable if no Survey number is selected
                                >
                                    Search
                                </button>
                            </div>
                            
                            {/* Debug info for survey numbers */}
                            <div className="mt-2">
                                <small className="text-muted">
                                    {surveyNumbers.length === 0 ? 
                                        "No survey numbers available for this village" : 
                                        `${surveyNumbers.length} survey numbers available`}
                                </small>
                            </div>
                            
                            {/* Show related khata numbers if available */}
                            {relatedKhataNumbers.length > 0 && (
                                <div className="mt-2 p-2 border rounded">
                                    <small className="text-muted">Related Khata Numbers:</small>
                                    <div className="d-flex flex-wrap gap-1 mt-1">
                                        {relatedKhataNumbers.slice(0, 5).map((khata, i) => (
                                            <span 
                                                key={i} 
                                                className="badge bg-light text-dark border"
                                                style={{cursor: 'pointer'}}
                                                onClick={() => {
                                                    setSearchType("khata");
                                                    handleFilterChange("khataNumber", khata);
                                                }}
                                            >
                                                {khata}
                                            </span>
                                        ))}
                                        {relatedKhataNumbers.length > 5 && 
                                            <span className="badge bg-light text-muted">+{relatedKhataNumbers.length - 5} more</span>
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {searchType === "owner" && (
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Enter Owner Name"
                            onChange={(e) =>
                                handleFilterChange("ownerName", e.target.value)
                            }
                        />
                    )}
                    {searchType === "coordinates" && (
                        <>
                            <input
                                type="text"
                                className="form-control me-4"
                                placeholder="Latitude"
                                onChange={(e) =>
                                    handleFilterChange("latitude", e.target.value)
                                }
                            />
                            <input
                                type="text"
                                className="form-control me-4"
                                placeholder="Longitude"
                                onChange={(e) =>
                                    handleFilterChange("longitude", e.target.value)
                                }
                            />
                        </>
                    )}
                    {searchType === "coordinates" && (
                        <>
                            <button
                                className="btn btn-dark"
                                onClick={
                                    searchType === "coordinates"
                                        ? searchByLatLong
                                        : downloadReportBySurveyNumber
                                }
                            >
                                Search
                            </button>
                        </>
                    )}
                </div>
                {/* Search Results */}
                {/* Search Results */}
                <div
                className="mt-3 overflow-auto"
                style={{ maxHeight: "400px" }}
            >
                {isLoading ? (
                    <div className="text-center my-3">
                        <div
                            className="spinner-border text-dark"
                            role="status"
                        >
                            <span className="visually-hidden">
                                Loading...
                            </span>
                        </div>
                        <p>Fetching reports, please wait...</p>
                    </div>
                ) : (
                    reports
                        .filter(
                            (report) =>
                                !filters.KhataNumber ||
                                report.khata_no === filters.KhataNumber,
                        )
                        .slice(0, 5)
                        .map((report, index) => {
                            // Create a unique composite key using multiple properties
                            const uniqueKey = `${report.khata_no}_${report.village_name || ''}_${report.plot_id || ''}_${index}`;
                            
                            return (
                                <div
                                    key={uniqueKey}
                                    className="card mb-2 shadow-sm"
                                >
                                    <div className="card-body d-flex justify-content-between align-items-center">
                                        <div>
                                            <h5 className="card-title">
                                                Khata Number: {report.khata_no}
                                            </h5>
                                            {report.gat_no && (
                                                <p className="card-text">
                                                    <strong>Gat Number:</strong>{" "}
                                                    {report.gat_no}
                                                </p>
                                            )}
                                            {report.survey_no && (
                                                <p className="card-text">
                                                    <strong>Survey Number:</strong>{" "}
                                                    {report.survey_no}
                                                </p>
                                            )}
                                            <p className="card-text">
                                                <strong>District:</strong>{" "}
                                                {report.district}
                                            </p>
                                            <p className="card-text">
                                                <strong>Village:</strong>{" "}
                                                {report.village_name}
                                            </p>
                                            <p className="card-text">
                                                <strong>Owner(s):</strong>{" "}
                                                {report.owner_names}
                                            </p>
                                        </div>
                                        <button
                                            className="btn btn-dark"
                                            onClick={() =>
                                                downloadReportPDF(
                                                    report.khata_no,
                                                    report.district,
                                                    report.taluka,
                                                    report.village_name,
                                                    report.plot_id
                                                )
                                            }
                                            disabled={!report.plot_id}
                                            title={!report.plot_id ? "Plot ID not available" : "Download Report"}
                                        >
                                            <FaDownload />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                )}
            </div>
            </div>

            {/* Lower Container: Placeholder Images */}
            {reports.length === 0 && !isLoading && (
                <div
                    className="content-section mt-4 w-100 p-4"
                    style={{ maxWidth: "100vw" }}
                >
                    {!isSearchingLatLong && (
                        <div className="d-flex justify-content-center gap-4">
                            <div className="text-center">
                                <img
                                    src="/india.png"
                                    alt="Placeholder 1"
                                    className="img-fluid rounded shadow"
                                    style={{
                                        width: "100%",
                                        maxWidth: "500px",
                                        height: "auto",
                                        objectFit: "cover",
                                    }}
                                />
                                {/* <p className="mt-2 text-muted">6 districts covered across MH, Rajasthan, Telangana so far, and rapidly expanding.</p> */}
                            </div>
                            <div className="text-center">
                                <img
                                    src="/report.png"
                                    alt="Placeholder 2"
                                    className="img-fluid rounded shadow"
                                    style={{
                                        width: "100%",
                                        maxWidth: "500px",
                                        height: "auto",
                                        objectFit: "cover",
                                    }}
                                />
                                {/* <p className="mt-2 text-muted">A sample valuation report - generated for an arbitrary khata number.</p> */}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
