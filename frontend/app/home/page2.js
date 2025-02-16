'use client';

import { useRouter } from 'next/navigation';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Home.css';

export default function Home() {
    const router = useRouter();

    const handleSignInClick = () => {
        router.push('/signin'); // Navigate to the Sign In page
    };

    return (
        <main>
            {/* Top Navbar */}
            <nav className="navbar navbar-light bg-white shadow-sm px-4">
                <span className="navbar-brand fw-bold">Terrastack AI</span>
                <button className="btn btn-dark" onClick={handleSignInClick}>Sign In</button>
            </nav>

            {/* Hero Section */}
            <section className="hero-section d-flex align-items-center">
                {/* Right Side Background Image */}
                <div className="image-container"></div>

                {/* Left Content (Extends over image) */}
                <div className="content-wrapper">
                    <h1 className="display-4">Welcome to Terrastack AI</h1>
                    <p className="lead ">Your trustworthy agent for rural land mapping and evaluation</p>

                    {/* Rectangular Box with Static Content */}
                    <div className="info-box shadow-sm">
                        <h3 className="">Plot Assessments</h3>
                        <p>Search for a plot by coordinates or ID and get a comprehensive evaluation report</p>
                    </div>

                    <div className="info-box shadow-sm">
                        <h3 className="">Map Explorer</h3>
                        <p>View, filter, and rate plots by water access, connectivity, land activity, and more.</p>
                    </div>
                </div>
            </section>
        </main>
    );
}
