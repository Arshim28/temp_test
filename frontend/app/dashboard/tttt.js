'use client';

import './DashBoard.css';
import { FaTachometerAlt, FaClipboardList, FaBoxOpen, FaCog, FaGlobe, FaFileDownload, FaMap, FaSearch } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Dashboard() {
    const router = useRouter();
    const [plans, setPlans] = useState([]); // State to hold user's plans
    const [loading, setLoading] = useState(true); // State to show loading status
    const [error, setError] = useState(null); // State for error handling
    const [userDetails, setUserDetails] = useState(null); // State to hold user details
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const token = localStorage.getItem('authToken');
    // Fetch user details and plans on component mount
    const [allPlans, setAllPlans] = useState(null); // Store all plans data
    const [selectedPlanType, setSelectedPlanType] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedTaluka, setSelectedTaluka] = useState('');
    const [selectedVillage, setSelectedVillage] = useState('');
    const [formVisible, setFormVisible] = useState(false);
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch token from localStorage

                if (!token) {
                    throw new Error('User is not authenticated.');
                }

                // Fetch user profile details
                const userProfileResponse = await axios.get('http://65.2.140.129:8000/api/user/', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });


                setUserDetails(userProfileResponse.data); // Update user details state

                // Fetch user plans
                const plansResponse = await axios.get('http://65.2.140.129:8000/api/plans/', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });


                setPlans(plansResponse.data.results); // Update plans state
                setLoading(false);
            } catch (err) {
                setError(err.message || 'Failed to fetch data.');
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Filter plans by type
    const districtPlans = plans.filter(plan => plan.plan_type === 'District');
    const villagePlans = plans.filter(plan => plan.plan_type === 'Village');
    const talukaPlans = plans.filter(plan => plan.plan_type === 'Taluka');

    // Show loading or error states
    if (loading) {
        return <div>Loading data...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    // Update user profile section
    const userName = userDetails ? userDetails.user.name : 'User'; // Default to 'User' if no data
    const profilePic = userDetails ? userDetails.user.name.charAt(0).toUpperCase() : 'U'; // Use first letter of name for profile picture

    // Handle "All Plans" click to reload plans in middle section
    const handleAllPlansClick = async () => {
        const plansResponse = await axios.get('http://65.2.140.129:8000/api/maharashtra-md/', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        console.log(plansResponse.data);
        setAllPlans(plansResponse.data); // Store the response data
        setFormVisible(true);  // Simply reload plans (in case content was filtered previously)
    };

    const handlePlanTypeChange = (type) => {
        setSelectedPlanType(type);
        setSelectedDistrict('');
        setSelectedTaluka('');
        setSelectedVillage('');
    };

    const handlePurchasePlan = async () => {
        const payload = {
            plan_type: selectedPlanType,
            district: selectedDistrict || null,
            taluka: selectedTaluka || null,
            village: selectedVillage || null,
        };

        try {
            const response = await axios.post('http://65.2.140.129:8000/api/purchase-plan/', payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            alert('Plan purchased successfully!');
            console.log('Purchase response:', response.data);
        } catch (err) {
            console.error('Error purchasing plan:', err);
            alert('Failed to purchase plan.');
        }
    };

    return (
        <div className="dashboard-container">
            {/* Top Navbar */}
            <div className="dashboard-top-navbar">
                <div className="user-profile-circle">{profilePic}</div>
            </div>

            {/* Main Content */}
            <div className="dashboard-main">
                {/* Left Sidebar */}
                <div className="dashboard-sidebar">
                    <div className="profile-section">
                        <div className="profile-picture-circle">{profilePic}</div>
                        <h3 className="user-name">{userName}</h3>
                    </div>
                    <ul className="sidebar-menu">
                        <li className="menu-item">
                            <FaTachometerAlt className="menu-icon" /> Dashboard
                        </li>
                        <li className="menu-item" onClick={handleAllPlansClick}>
                            <FaClipboardList className="menu-icon" /> All Plans
                        </li>
                        <li className="menu-item">
                            <FaBoxOpen className="menu-icon" /> My Orders
                        </li>
                        <li className="menu-item">
                            <FaCog className="menu-icon" /> My Settings
                        </li>
                    </ul>
                </div>

                {/* Middle Section */}
                <div className="dashboard-middle" style={{ overflowY: 'auto' }}>
                    <h2 className="plans-heading">Welcome To your Terrastack account!</h2>
                    <h2 className="plans-heading">Your Registered Plans</h2>

                    {/* District Plans Section */}
                    <div className="plans-container">
                        <h3 className="section-heading">District Plans</h3>
                        <div className="plans-grid">
                            {districtPlans.length > 0 ? (
                                districtPlans.map((plan) => (
                                    <div className="plan-card" key={plan.id}>
                                        <h3>{plan.entity_name}</h3>
                                        <p>Total Transactions: {plan.total_transactions}</p>
                                        <p>Purchased At: {new Date(plan.created_at).toLocaleDateString('en-GB', options)}</p>
                                        <p>Valid Till: {new Date(plan.valid_till).toLocaleDateString('en-GB', options)}</p>
                                    </div>
                                ))
                            ) : (
                                <p>No district plans registered yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Taluka Plans Section */}
                    <div className="plans-container">
                        <h3 className="section-heading">Taluka Plans</h3>
                        <div className="plans-grid">
                            {talukaPlans.length > 0 ? (
                                talukaPlans.map((plan) => (
                                    <div className="plan-card" key={plan.id}>
                                        <h3>{plan.entity_name}</h3>
                                        <p>Total Transactions: {plan.total_transactions}</p>
                                        <p>Purchased At: {new Date(plan.created_at).toLocaleDateString('en-GB', options)}</p>
                                        <p>Valid Till: {new Date(plan.valid_till).toLocaleDateString('en-GB', options)}</p>
                                    </div>
                                ))
                            ) : (
                                <p>No taluka plans registered yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Village Plans Section */}
                    <div className="plans-container">
                        <h3 className="section-heading">Village Plans</h3>
                        <div className="plans-grid">
                            {villagePlans.length > 0 ? (
                                villagePlans.map((plan) => (
                                    <div className="plan-card" key={plan.id}>
                                        <h3>{plan.entity_name}</h3>
                                        <p>Total Transactions: {plan.total_transactions}</p>
                                        <p>Purchased At: {new Date(plan.created_at).toLocaleDateString('en-GB', options)}</p>
                                        <p>Valid Till: {new Date(plan.valid_till).toLocaleDateString('en-GB', options)}</p>
                                    </div>
                                ))
                            ) : (
                                <p>No village plans registered yet.</p>
                            )}
                        </div>
                    </div>
                </div>

                {formVisible && allPlans && (
                    <div className="plan-form">
                        <h2>Purchase a Plan</h2>

                        {/* Plan Type Selection */}
                        <div>
                            <label htmlFor="plan-type">Plan Type</label>
                            <select
                                id="plan-type"
                                value={selectedPlanType}
                                onChange={(e) => handlePlanTypeChange(e.target.value)}
                            >
                                <option value="">Select Plan Type</option>
                                <option value="District">District</option>
                                <option value="Taluka">Taluka</option>
                                <option value="Village">Village</option>
                            </select>
                        </div>

                        {/* District Selection */}
                        {selectedPlanType && (
                            <div>
                                <label htmlFor="district">District</label>
                                <select
                                    id="district"
                                    value={selectedDistrict}
                                    onChange={(e) => setSelectedDistrict(e.target.value)}
                                >
                                    <option value="">Select District</option>
                                    {Object.keys(allPlans).map((district) => (
                                        <option key={district} value={district}>
                                            {district}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Taluka Selection */}
                        {(selectedPlanType === 'Taluka' || selectedPlanType === 'Village') && selectedDistrict && (
                            <div>
                                <label htmlFor="taluka">Taluka</label>
                                <select
                                    id="taluka"
                                    value={selectedTaluka}
                                    onChange={(e) => setSelectedTaluka(e.target.value)}
                                >
                                    <option value="">Select Taluka</option>
                                    {allPlans[selectedDistrict].map((taluka, index) => (
                                        <option key={index} value={taluka}>
                                            {taluka}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Village Selection */}
                        {selectedPlanType === 'Village' && selectedTaluka && (
                            <div>
                                <label htmlFor="village">Village</label>
                                <select
                                    id="village"
                                    value={selectedVillage}
                                    onChange={(e) => setSelectedVillage(e.target.value)}
                                >
                                    <option value="">Select Village</option>
                                    {allPlans[selectedTaluka].map((village, index) => (
                                        <option key={index} value={village}>
                                            {village}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Purchase Plan Button */}
                        <button onClick={handlePurchasePlan}>Purchase Plan</button>
                    </div>
                )}

                {/* Right Sidebar */}
                <div className="dashboard-rightbar">
                    <ul className="rightbar-menu">
                        <li className="menu-item" onClick={() => router.push('/mapview')}>
                            <FaGlobe className="menu-icon" /> Map View
                        </li>
                        <li className="menu-item" onClick={() => router.push('/report')}>
                            <FaFileDownload className="menu-icon" /> Download Report
                        </li>
                        <li className="menu-item">
                            <FaMap className="menu-icon" /> Download Heatmap
                        </li>
                        <li className="menu-item">
                            <FaSearch className="menu-icon" /> Search by Taluka ID
                        </li>
                        <li className="menu-item">
                            <a href="https://terrastack.in/" target="_blank" rel="noopener noreferrer">FAQ</a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
