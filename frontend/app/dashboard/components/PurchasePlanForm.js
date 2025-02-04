'use client';

import { useState } from 'react';
import axios from 'axios';

export default function PurchasePlanForm({ allPlans, token }) {
    const [selectedPlanType, setSelectedPlanType] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedTaluka, setSelectedTaluka] = useState('');
    const [selectedVillage, setSelectedVillage] = useState('');
    const [talukas, setTalukas] = useState([]);
    const [villages, setVillages] = useState([]);

    const handlePlanTypeChange = (e) => {
        const value = e.target.value;
        setSelectedPlanType(value);
        setSelectedDistrict('');
        setSelectedTaluka('');
        setSelectedVillage('');
        setTalukas([]);
        setVillages([]);
    };

    const handleDistrictChange = (e) => {
        const district = e.target.value;
        setSelectedDistrict(district);
        setTalukas(allPlans[district] ? Object.keys(allPlans[district]) : []);
        setSelectedTaluka('');
        setVillages([]);
    };

    const handleTalukaChange = (e) => {
        const taluka = e.target.value;
        setSelectedTaluka(taluka);
        setVillages(allPlans[selectedDistrict][taluka] || []);
        setSelectedVillage('');
    };

    const handlePurchasePlan = async () => {
        const formattedPlanType =
            selectedPlanType.charAt(0).toUpperCase() + selectedPlanType.slice(1);

        const entityName =
            selectedPlanType === 'district'
                ? selectedDistrict
                : selectedPlanType === 'taluka'
                    ? selectedTaluka
                    : selectedVillage;

        const payload = {
            plan_type: formattedPlanType,
            entity_name: entityName,
            // district: selectedDistrict || null,
            // taluka: selectedTaluka || null,
            // village: selectedVillage || null,
        };

        console.log('Purchase plan payload:', payload);

        try {
            await axios.post('http://65.2.140.129:8000/api/plans/create/', payload, {
                headers: { Authorization: `Bearer ${token}` },
            });
            alert('Plan purchased successfully!');
        } catch (err) {
            console.error('Error purchasing plan:', err);
            alert('Failed to purchase plan.');
        }
    };

    return (
        <div className="plan-form">
            <h2>Purchase a Plan</h2>
            <form className="form-container">
                {/* Plan Type */}
                <div className="form-group">
                    <label htmlFor="planType">Plan Type</label>
                    <select
                        id="planType"
                        value={selectedPlanType}
                        onChange={handlePlanTypeChange}
                        className="form-select"
                    >
                        <option value="">Select Plan Type</option>
                        <option value="district">District</option>
                        <option value="taluka">Taluka</option>
                        <option value="village">Village</option>
                    </select>
                </div>

                {/* District */}
                {(selectedPlanType === 'district' ||
                    selectedPlanType === 'taluka' ||
                    selectedPlanType === 'village') && (
                        <div className="form-group">
                            <label htmlFor="district">District</label>
                            <select
                                id="district"
                                value={selectedDistrict}
                                onChange={handleDistrictChange}
                                className="form-select"
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

                {/* Taluka */}
                {(selectedPlanType === 'taluka' || selectedPlanType === 'village') &&
                    selectedDistrict && (
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

                {/* Village */}
                {selectedPlanType === 'village' && selectedTaluka && (
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

                {/* Submit */}
                <button type="button" className="form-button" onClick={handlePurchasePlan}>
                    Purchase Plan
                </button>
            </form>
        </div>
    );
}
