'use client';

import { useRouter } from 'next/navigation';
import 'bootstrap/dist/css/bootstrap.min.css';
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
            <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
                <div className="container">
                    <a className="navbar-brand" href="#">Terrastack</a>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav ms-auto">
                            <li className="nav-item">
                                <button className="btn btn-outline-light me-2" onClick={handleSignInClick}>Sign In</button>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link text-light" href="#features">Features</a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link text-light" href="#pricing">Pricing</a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link text-light" href="#contact">Contact</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="text-center py-5 bg-secondary text-white">
                <div className="container">
                    <h1>Welcome to Terrastack</h1>
                    <p className="lead">Your one-stop solution for land mapping and pricing.</p>
                    <button className="btn btn-light btn-lg" onClick={handleLearnMoreClick}>Learn More</button>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="container py-5">
                <div className="row text-center">
                    <div className="col-md-4">
                        <div className="card shadow-sm p-3">
                            <h3>Interactive Maps</h3>
                            <p>Explore land areas with real-time pricing and detailed maps.</p>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card shadow-sm p-3">
                            <h3>Advanced Search</h3>
                            <p>Find the perfect land plot based on your needs and budget.</p>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card shadow-sm p-3">
                            <h3>Secure Transactions</h3>
                            <p>Reliable and secure payment systems for peace of mind.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer Section */}
            <footer className="bg-dark text-white text-center py-3">
                <p>&copy; 2025 Terrastack. All rights reserved.</p>
            </footer>
        </main>
    );
}
