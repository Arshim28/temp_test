'use client';

import { useState } from 'react';
import axios from 'axios';

export default function PurchasePlanForm({ allPlans, token, setActiveSection }) {
    const [selectedPlanType, setSelectedPlanType] = useState('');
    const [selectedViewLevel, setSelectedViewLevel] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedTaluka, setSelectedTaluka] = useState('');
    const [selectedVillage, setSelectedVillage] = useState('');
    const [selectedReportQuantity, setSelectedReportQuantity] = useState('');
    const [talukas, setTalukas] = useState([]);
    const [villages, setVillages] = useState([]);
    const [showPopup, setShowPopup] = useState(false);
    const [estimatedCost, setEstimatedCost] = useState(null);

    const isPurchaseDisabled = () => {
        if (selectedPlanType === 'mapview') {
            return !selectedViewLevel || (selectedViewLevel === 'district' && !selectedDistrict) ||
                (selectedViewLevel === 'taluka' && (!selectedDistrict || !selectedTaluka)) ||
                (selectedViewLevel === 'village' && (!selectedDistrict || !selectedTaluka || !selectedVillage));
        } else if (selectedPlanType === 'reportdownload') {
            return !selectedReportQuantity;
        }
        return true;
    };
    // Handle Plan Type Selection Reset
    const handlePlanTypeChange = (e) => {
        setSelectedPlanType(e.target.value);
        setSelectedViewLevel('');
        setSelectedDistrict('');
        setSelectedTaluka('');
        setSelectedVillage('');
        setSelectedReportQuantity('');
        setTalukas([]);
        setVillages([]);
    };

    // Handle View Level Selection
    const handleViewLevelChange = (e) => {
        setSelectedViewLevel(e.target.value);
        setSelectedDistrict('');
        setSelectedTaluka('');
        setSelectedVillage('');
        setTalukas([]);
        setVillages([]);
    };

    // Handle District Selection
    const handleDistrictChange = (e) => {
        const district = e.target.value;
        setSelectedDistrict(district);
        setSelectedTaluka('');
        setSelectedVillage('');

        const talukaList = [...new Set(
            allPlans
                .filter(plan => plan.district_name === district)
                .map(plan => plan.taluka_name)
        )];

        setTalukas(talukaList);
        setVillages([]);
    };

    // Handle Taluka Selection
    const handleTalukaChange = (e) => {
        const taluka = e.target.value;
        setSelectedTaluka(taluka);
        setSelectedVillage('');

        const villageList = [...new Set(
            allPlans
                .filter(plan => plan.district_name === selectedDistrict && plan.taluka_name === taluka)
                .map(plan => plan.village_name)
        )];

        setVillages(villageList);
    };

    // Handle Plan Purchase
    // const handlePurchasePlan = async () => {
    //     try {
    //         console.log('Purchasing plan...');
    //         if (selectedPlanType === 'mapview') {
    //             const formattedViewLevel = selectedViewLevel.charAt(0).toUpperCase() + selectedViewLevel.slice(1);
    //             const entityName =
    //                 selectedViewLevel === 'district' ? selectedDistrict :
    //                     selectedViewLevel === 'taluka' ? selectedTaluka :
    //                         selectedVillage;

    //             const payload = {
    //                 plan_type: formattedViewLevel,
    //                 entity_name: entityName,
    //             };

    //             await axios.post('http://65.2.140.129:8000/api/plans/create/', payload, {
    //                 headers: { Authorization: `Bearer ${token}` },
    //             });

    //         } else if (selectedPlanType === 'reportdownload') {
    //             const payload = {
    //                 quantity: selectedReportQuantity,
    //             };

    //             await axios.post('http://65.2.140.129:8000/api/report-plans/create/', payload, {
    //                 headers: { Authorization: `Bearer ${token}` },
    //             });
    //         }

    //         setShowPopup(true);

    //         setTimeout(() => {
    //             setShowPopup(false);
    //             setActiveSection('dashboard');
    //         }, 2000);
    //     } catch (err) {
    //         console.error('Error purchasing plan:', err);
    //         alert('Failed to purchase plan.');
    //     }
    // };

    // Call Check Cost API before purchasing


    const handleCheckCost = async () => {
        try {
            let queryParams = new URLSearchParams();

            if (selectedPlanType === 'mapview') {
                const formattedViewLevel = selectedViewLevel.charAt(0).toUpperCase() + selectedViewLevel.slice(1);
                const entityName =
                    selectedViewLevel === 'district' ? selectedDistrict :
                        selectedViewLevel === 'taluka' ? selectedTaluka :
                            selectedVillage;

                queryParams.append('plan_type', selectedPlanType);
                queryParams.append('entity_type', formattedViewLevel);
                queryParams.append('entity_name', entityName);
            } else if (selectedPlanType === 'reportdownload') {
                queryParams.append('plan_type', selectedPlanType);
                queryParams.append('quantity', selectedReportQuantity);
            }

            const response = await axios.get(`http://65.2.140.129:8000/api/plans/check-cost/?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // console.log(response.data.details.total_amount);
            setEstimatedCost(response.data.details.total_amount);
            setShowPopup(true);
        } catch (err) {
            console.error('Error checking cost:', err);
            alert('Failed to retrieve estimated cost.');
        }
    };


    return (
        <div className="plan-form">
            <h2>Purchase a Plan</h2>
            <form className="form-container">

                {/* Plan Type Dropdown */}
                <div className="form-group">
                    <label htmlFor="planType">Plan Type</label>
                    <select
                        id="planType"
                        value={selectedPlanType}
                        onChange={handlePlanTypeChange}
                        className="form-select"
                    >
                        <option value="">Select Plan Type</option>
                        <option value="mapview">MapView</option>
                        <option value="reportdownload">Report Download</option>
                    </select>
                </div>

                {/* View Level Dropdown (Only for MapView) */}
                {selectedPlanType === 'mapview' && (
                    <div className="form-group">
                        <label htmlFor="viewLevel">View Level</label>
                        <select
                            id="viewLevel"
                            value={selectedViewLevel}
                            onChange={handleViewLevelChange}
                            className="form-select"
                        >
                            <option value="">Select Level</option>
                            <option value="district">District</option>
                            <option value="taluka">Taluka</option>
                            <option value="village">Village</option>
                        </select>
                    </div>
                )}

                {/* District Dropdown */}
                {(selectedViewLevel === 'district' || selectedViewLevel === 'taluka' || selectedViewLevel === 'village') && (
                    <div className="form-group">
                        <label htmlFor="district">District</label>
                        <select
                            id="district"
                            value={selectedDistrict}
                            onChange={handleDistrictChange}
                            className="form-select"
                        >
                            <option value="">Select District</option>
                            {[...new Set(allPlans.map(plan => plan.district_name))].map(district => (
                                <option key={district} value={district}>
                                    {district}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Taluka Dropdown */}
                {(selectedViewLevel === 'taluka' || selectedViewLevel === 'village') && selectedDistrict && (
                    <div className="form-group">
                        <label htmlFor="taluka">Taluka</label>
                        <select
                            id="taluka"
                            value={selectedTaluka}
                            onChange={handleTalukaChange}
                            className="form-select"
                        >
                            <option value="">Select Taluka</option>
                            {talukas.map((taluka) => (
                                <option key={taluka} value={taluka}>
                                    {taluka}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Village Dropdown */}
                {selectedViewLevel === 'village' && selectedTaluka && (
                    <div className="form-group">
                        <label htmlFor="village">Village</label>
                        <select
                            id="village"
                            value={selectedVillage}
                            onChange={(e) => setSelectedVillage(e.target.value)}
                            className="form-select"
                        >
                            <option value="">Select Village</option>
                            {villages.map((village, index) => (
                                <option key={index} value={village}>
                                    {village}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Report Quantity Dropdown (Only for Report Download) */}
                {selectedPlanType === 'reportdownload' && (
                    <div className="form-group">
                        <label htmlFor="reportQuantity">Number of Reports</label>
                        <select
                            id="reportQuantity"
                            value={selectedReportQuantity}
                            onChange={(e) => setSelectedReportQuantity(e.target.value)}
                            className="form-select"
                        >
                            <option value="">Select Quantity</option>
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="30">30</option>
                            <option value="40">40</option>
                        </select>
                    </div>
                )}

                {/* Submit Button */}
                <button type="button" className="form-button" onClick={handleCheckCost} disabled={isPurchaseDisabled()}>
                    Check Cost
                </button>
            </form>

            {/* Cost Popup */}
            {showPopup && (
                <div className="popup">
                    <div className="popup-content">
                        <p>💰 Estimated Cost: ₹{estimatedCost}</p>
                        <button className="popup-button" onClick={() => alert('Proceeding to Payment...')}>
                            Proceed to Pay
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
