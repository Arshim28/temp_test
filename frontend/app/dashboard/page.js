'use client';

import './DashBoard.css';
import { useEffect, useState } from 'react';
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
    const [activeSection, setActiveSection] = useState('dashboard'); // Manage active section

    const token = localStorage.getItem('authToken');
    const options = { year: 'numeric', month: 'short', day: 'numeric' };

    const fetchData = async () => {
        try {
            setLoading(true);
            if (!token) throw new Error('User is not authenticated.');

            const userProfileResponse = await axios.get('http://65.2.140.129:8000/api/user/', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUserDetails(userProfileResponse.data);

            const plansResponse = await axios.get('http://65.2.140.129:8000/api/plans/', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setPlans(plansResponse.data.results);
        } catch (err) {
            setError(err.message || 'Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
        setActiveSection('dashboard');
        fetchData(); // Fetch updated plans when returning to dashboard
    };

    if (loading) {
        return <LoadingScreen />;
    }
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="dashboard-container">
            <Navbar userDetails={userDetails} />
            <div className="dashboard-main">
                <Sidebar
                    userDetails={userDetails}
                    handleAllPlansClick={handleAllPlansClick}
                    handleDashboardClick={handleDashboardClick}
                />
                <div className="dashboard-middle">
                    <h2>Welcome to your Terrastack account!</h2>
                    {activeSection === 'dashboard' && <PlanList plans={plans} options={options} />}
                    {activeSection === 'allPlans' && allPlans && (
                        <PurchasePlanForm allPlans={allPlans} token={token} />
                    )}
                </div>
                <RightSidebar />
            </div>
        </div>
    );
}
