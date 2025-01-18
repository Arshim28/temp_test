'use client';

import { useRouter } from 'next/navigation';
import './Home.css';

export default function Home() {
    const router = useRouter();

    const handleSignInClick = () => {
        router.push('/signin'); // Navigate to the Sign In page
    };

    const handleLearnMoreClick = () => {
        router.push('/mapview'); // Redirect to the MapView page
    };

    return (
        <main>
            {/* Navbar Section */}
            <header>
                <div className="navbar-container">
                    <h1>Terrastack</h1>
                    <nav>
                        <button
                            onClick={handleSignInClick}
                            className="navbar-button"
                        >
                            Sign In
                        </button>
                        <a href="#features" className="navbar-link">Features</a>
                        <a href="#pricing" className="navbar-link">Pricing</a>
                        <a href="#contact" className="navbar-link">Contact</a>
                    </nav>
                </div>
            </header>

            {/* Welcome Section */}
            <section className="welcome-section">
                <div className="welcome-content">
                    <h1>Welcome to Terrastack</h1>
                    <p>Your one-stop solution for land mapping and pricing.</p>
                    <button className="primary-button" onClick={handleLearnMoreClick}>
                        Learn More
                    </button>
                </div>
            </section>

            {/* Features Section */}
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

            {/* Footer Section */}
            <footer>
                <p>&copy; 2025 Terrastack. All rights reserved.</p>
            </footer>
        </main>
    );
}
