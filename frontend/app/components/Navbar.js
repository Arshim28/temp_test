// app/components/Navbar.js
'use client';

import { useRouter } from 'next/navigation';

export default function Navbar() {
    const router = useRouter();

    const handleSignInClick = () => {
        router.push('/signin'); // Navigate to the Sign In page
    };

    return (
        <header>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '5vh' }}>
                <h1>Terrastack</h1>
                <nav>
                    <button
                        onClick={handleSignInClick}
                        style={{ marginRight: '20px', color: 'white', background: 'none', border: 'none', textDecoration: 'none', cursor: 'pointer' }}
                    >
                        Sign In
                    </button>
                    <a href="#features" style={{ marginRight: '20px', color: 'white', textDecoration: 'none' }}>Features</a>
                    <a href="#pricing" style={{ marginRight: '20px', color: 'white', textDecoration: 'none' }}>Pricing</a>
                    <a href="#contact" style={{ color: 'white', textDecoration: 'none' }}>Contact</a>
                </nav>
            </div>
        </header>
    );
}
