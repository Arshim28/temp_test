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
    // Filter suggestions based on query (case-insensitive) and take top 5
    const filtered = suggestionsData.filter(item =>
      item.toLowerCase().includes(query.toLowerCase())
    );
    setSuggestions(filtered.slice(0, 5));
  }, [query, suggestionsData]);

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
                setQuery(item);
                setSuggestions([]);
              }}
              style={{ cursor: "pointer", padding: "5px 10px" }}
            >
              {item}
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
    khata_no: "", // for khata search
    latitude: "",
    longitude: ""
  });
  const [hierarchy, setHierarchy] = useState([]);
  const [khataNumbers, setKhataNumbers] = useState([]);
  const [gatNumbers, setGatNumbers] = useState([]);
  const [surveyNumbers, setSurveyNumbers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState("khata");
  const router = useRouter();
  const token = localStorage.getItem("authToken");

  // Fetch hierarchy and user details on mount
  useEffect(() => {
    const fetchHierarchy = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/maharashtra-hierarchy/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userResponse = await axios.get(`${BASE_URL}/user/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserDetails(userResponse.data.user);
        setHierarchy(res.data);
      } catch (error) {
        console.error("Error fetching hierarchy:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHierarchy();
  }, []);

  // Fetch relevant data based on filters (district, taluka, village)
  useEffect(() => {
    if (filters.district && filters.taluka && filters.village) {
      fetchKhataNumbersAndReports();
    } else {
      setKhataNumbers([]);
      setGatNumbers([]);
      setSurveyNumbers([]);
      setReports([]);
    }
  }, [filters.district, filters.taluka, filters.village]);

  const fetchKhataNumbersAndReports = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${BASE_URL}/khata-numbers/`, {
        params: {
          district: filters.district,
          taluka_name: filters.taluka,
          village_name: filters.village,
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      setKhataNumbers(
        Array.isArray(res.data.khata_numbers) ? res.data.khata_numbers : []
      );
      setGatNumbers(
        Array.isArray(res.data.gat_numbers) ? res.data.gat_numbers : []
      );
      setSurveyNumbers(
        Array.isArray(res.data.survey_numbers) ? res.data.survey_numbers : []
      );
      // Also fetch report data (khata preview)
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
      setReports(data);
    } catch (error) {
      console.error("Error fetching khata numbers:", error);
      setKhataNumbers([]);
      setGatNumbers([]);
      setSurveyNumbers([]);
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSuggestion = (value) => {
    // Update the filters based on search type
    if (searchType === "khata") {
      setFilters((prev) => ({ ...prev, khata_no: value }));
    }
    // Add similar handling for "gat" or "survey" if needed
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="container-fluid report-page-container px-4">
      <div className="container-fluid p-0">
        <nav
          className="navbar navbar-light bg-white shadow-sm px-4 w-100 d-flex justify-content-between align-items-center"
          style={{ width: "100vw" }}
        >
          <span
            className="navbar-brand fw-bold"
            onClick={() => router.push(token ? "/dashboard" : "/signin")}
            style={{
              cursor: "pointer",
              fontSize: "1.5rem",
            }}
          >
            Terrastack AI
          </span>
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
          <p className="text-center">Please login to continue</p>
        </div>
      )}
      <div className="card p-4 mt-3 w-100" style={{ maxWidth: "100vw" }}>
        <h2
          className="text-center"
          style={{
            cursor: "pointer",
            fontSize: "28px",
            fontWeight: "600",
          }}
        >
          Worried about the land you're investing in? Let the Terrastack AI agent take care of it.
        </h2>
        {/* Search Type Buttons */}
        <div className="d-flex justify-content-start gap-2 mt-3">
          <button
            className={`btn ${searchType === "khata" ? "text-decoration-underline fw-bold" : ""}`}
            onClick={() => setSearchType("khata")}
            style={{ border: "none", textTransform: "uppercase" }}
          >
            <FaSearch className="me-2" /> Khata Number
          </button>
          <button
            className={`btn ${searchType === "gat" ? "text-decoration-underline fw-bold" : ""}`}
            onClick={() => setSearchType("gat")}
            style={{ border: "none", textTransform: "uppercase" }}
          >
            Gat Number
          </button>
          <button
            className={`btn ${searchType === "survey" ? "text-decoration-underline fw-bold" : ""}`}
            onClick={() => setSearchType("survey")}
            style={{ border: "none", textTransform: "uppercase" }}
          >
            Survey Number
          </button>
          <button
            className={`btn ${searchType === "coordinates" ? "text-decoration-underline fw-bold" : ""}`}
            onClick={() => setSearchType("coordinates")}
            style={{ border: "none", textTransform: "uppercase" }}
          >
            Coordinates
          </button>
        </div>
        {/* Google-like search bar for autocomplete */}
        {(searchType === "khata" ||
          searchType === "gat" ||
          searchType === "survey") && (
          <div className="mt-3">
            <SearchBar
              searchType={searchType}
              suggestionsData={
                searchType === "khata"
                  ? khataNumbers
                  : searchType === "gat"
                  ? gatNumbers
                  : surveyNumbers
              }
              onSelectSuggestion={handleSelectSuggestion}
              placeholder={`Search by ${searchType} number...`}
            />
          </div>
        )}
        {/* Additional UI for filters (district, taluka, village) can be retained or hidden based on design */}
      </div>
      {/* Render reports and other UI elements below */}
    </div>
  );
}
