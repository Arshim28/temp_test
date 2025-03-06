'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';
import './PlansPage.css';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export default function PlansPage() {
    const router = useRouter();
    const [plans, setPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        if (!token) {
            router.push('/login');
            return;
        }

        const fetchPlans = async () => {
            try {
                const userResponse = await axios.get(`${BASE_URL}/user/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const plansResponse = await axios.get(`${BASE_URL}/plans/reports/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                console.log('Plans:', plansResponse.data);

                setUserDetails(userResponse.data.user);
                setPlans(plansResponse.data || []);
                setSelectedPlan(plansResponse.data?.[0] || null); // Default selection
            } catch (err) {
                console.error('Error fetching plans:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPlans();
    }, [token]);
    const loadScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    // Function to handle payment success verification
    const handlePaymentSuccess = async (response) => {
        try {
            let bodyData = new FormData();
            bodyData.append("response", JSON.stringify(response));

            await axios.post(
                `${BASE_URL}/plans/payment/success/`,
                bodyData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert("Payment successful!");
            // setActiveSection("dashboard");
        } catch (err) {
            console.error("Payment verification error:", err);
            alert("Error verifying payment");
        }
    };

    // Function to handle plan purchase
    const handleBuyNow = async (plan) => {
        setSelectedPlan(plan);
        setLoading(true);

        try {

            if (plan.price === "0.00") {
                // If the plan is free, call the free reports API instead
                await axios.post(
                    `${BASE_URL}/plans/free-report/`,
                    { plan_id: plan.id },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                alert("You have successfully subscribed to the free plan!");
                return;
            }

            // Step 1: Load Razorpay Script
            const res = await loadScript();
            if (!res) {
                alert("Failed to load Razorpay SDK");
                setLoading(false);
                return;
            }

            // Step 2: Call Razorpay Order API
            let bodyData = new FormData();
            bodyData.append("amount", plan.price.toString());
            bodyData.append("name", "Purchase Plan");
            bodyData.append("fixed_order", plan.id);
            bodyData.append("order_type", "report");

            const orderResponse = await axios.post(
                `${BASE_URL}/plans/create-order/`,
                bodyData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const order = orderResponse.data.order;
            const orderAmount = orderResponse.data.payment.amount;
            const orderId2 = orderResponse.data.payment.id;

            // Step 3: Initiate Razorpay Payment
            const options = {
                key_id: process.env.NEXT_PUBLIC_KEY || "",
                key_secret: process.env.NEXT_PUBLIC_RAZORPAY_KEY || "",
                amount: orderAmount,
                currency: "INR",
                name: "TerraStack",
                image: "../../favicon.ico",
                description: "Payment for selected plan",
                order_id: orderId2,
                handler: handlePaymentSuccess,
                prefill: {
                    name: "User Name",
                    email: "user@example.com",
                    contact: "9999999999",
                },
                theme: {
                    color: "#007bff",
                },
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();

        } catch (err) {
            console.error("Error processing payment:", err);
            alert("Failed to initiate payment");
        } finally {
            setLoading(false);
        }
    };
    if (loading) return <div>Loading...</div>;

    return (
        <main className="plans-container">
            {/* Navbar */}
            <nav className="navbar navbar-light bg-white shadow-sm px-4">
                <span className="navbar-brand fw-bold" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
                    Terrastack AI
                </span>
                {userDetails && (
                    <div className="user-circle" onClick={() => router.push('/dashboard')}>
                        {userDetails.name.charAt(0).toUpperCase()}
                    </div>
                )}
            </nav>

            {/* Plans Section */}
            <div className="plans-scroll-container">
                {plans
                    .slice() // Create a shallow copy to avoid mutating the original state
                    .sort((a, b) => parseFloat(a.price) - parseFloat(b.price)) // Sort by price
                    .map((plan) => (
                        <div key={plan.id} className="plan-card">
                            <h1 className="plan-price">{plan.price === '0.00' ? "Free" : `₹${plan.price}`}</h1>

                            <p className="plan-desc">for {plan.quantity} reports</p>

                            <button
                                className="btn btn-dark"
                                onClick={() => setSelectedPlan(plan)}
                            >
                                {selectedPlan?.id === plan.id ? 'Selected' : 'Get Started'}
                            </button>

                            <div className="plan-features">
                                <ul>
                                    Free Features, plus:
                                    <li>{plan.quantity} reports every month</li>
                                    <li>Map View with ownership details</li>
                                </ul>
                            </div>
                        </div>
                    ))}
            </div>



            {/* Footer Summary Bar */}
            {selectedPlan && (
                <div className="footer-summary">
                    <div className="footer-left">
                        <p>Summary</p>
                        <p>Report Plan - {selectedPlan.quantity} reports</p>
                    </div>
                    <div className="footer-right">
                        <p>₹{selectedPlan.price}</p>
                        <button className="pay-now-btn" onClick={() => handleBuyNow(selectedPlan)}>
                            Pay Now
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
