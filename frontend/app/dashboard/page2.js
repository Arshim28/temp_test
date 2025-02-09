'use client';
import './DashBoard.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import PlanList from './components/PlanList';
import PurchasePlanForm from './components/PurchasePlanForm';
import RightSidebar from './components/RightSidebar';
import LoadingScreen from '../loader/page';

export default function Dashboard() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [allPlans, setAllPlans] = useState(null);
    const [activeSection, setActiveSection] = useState('dashboard');
    const [showLoginPopup, setShowLoginPopup] = useState(false);
    const router = useRouter();

    const token = localStorage.getItem('authToken');
    const handleUnauthorizedAccess = () => {
        setShowLoginPopup(true);
        setTimeout(() => {
            setShowLoginPopup(false);
            router.push('/login'); // Redirect to login page
        }, 1500);
    };
    useEffect(() => {
        if (!token) {
            handleUnauthorizedAccess();
        }
    }, [token]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // if (!token) throw new Error('User is not authenticated.');

            const userProfileResponse = await axios.get('http://65.2.140.129:8000/api/user/', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUserDetails(userProfileResponse.data);

            const plansResponse = await axios.get('http://65.2.140.129:8000/api/plans/', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setPlans(plansResponse.data.results);
        } catch (err) {
            // setError(err.message || 'Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeSection === 'dashboard') {
            fetchData(); // ✅ Fetch updated plans when returning to dashboard
        }
    }, [activeSection]); // ✅ Triggers whenever route changes

    const handleAllPlansClick = async () => {
        try {
            const plansResponse = await axios.get('http://65.2.140.129:8000/api/maharashtra_metadata/', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAllPlans(plansResponse.data);
            setActiveSection('allPlans'); // Show form
        } catch (err) {
            setError(err.message || 'Failed to fetch all plans.');
        }
    };

    const handleDashboardClick = () => {
        setActiveSection('dashboard');  // Navigate to dashboard
    };

    if (loading) return <LoadingScreen />;
    if (error) return <div>Error: {error}</div>;



    return (
        <div className="dashboard-container">
            {showLoginPopup && (
                <div className="popup">
                    <div className="popup-content">
                        <p>🔒 Please login to continue</p>
                    </div>
                </div>
            )}
            <Navbar userDetails={userDetails} />
            <div className="dashboard-main">
                <Sidebar
                    userDetails={userDetails}
                    handleAllPlansClick={handleAllPlansClick}
                    handleDashboardClick={handleDashboardClick}
                />
                <div className="dashboard-middle">
                    <h2>Welcome to your Terrastack account!</h2>
                    {activeSection === 'dashboard' && <PlanList plans={plans} />}
                    {activeSection === 'allPlans' && allPlans && (
                        <PurchasePlanForm allPlans={allPlans} token={token} setActiveSection={setActiveSection} />
                    )}
                </div>
                <RightSidebar />
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
