// components/WelcomeSection.js
'use client';

import { useRouter } from 'next/navigation';
import './WelcomeSection.css';

export default function WelcomeSection() {
    const router = useRouter();

    const handleLearnMoreClick = () => {
        router.push('/mapview'); // Redirect to the MapView page
    };

    return (
        <section className="welcome-section">
            <div className="welcome-content">
                <h1>Welcome to Terrastack</h1>
                <p>Your one-stop solution for land mapping and pricing.</p>
                <button className="primary-button" onClick={handleLearnMoreClick}>
                    Learn More
                </button>
            </div>
        </section>
    );
}
