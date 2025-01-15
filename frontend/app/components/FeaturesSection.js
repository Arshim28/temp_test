// app/components/FeaturesSection.js
'use client';
import './FeaturesSection.css';

export default function FeaturesSection() {
    return (
        <section id="features" className="features">
            <div className="feature-card">
                <h3>Interactive Maps</h3>
                <p>Explore land areas with real-time pricing and detailed maps.</p>
            </div>
            <div className="feature-card">
                <h3>Advanced Search</h3>
                <p>Find the perfect land plot based on your needs and budget.</p>
            </div>
            <div className="feature-card">
                <h3>Secure Transactions</h3>
                <p>Reliable and secure payment systems for peace of mind.</p>
            </div>
        </section>
    );
}
