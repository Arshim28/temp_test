'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function SignInForm({ prefilledEmail, verificationToken }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState(prefilledEmail || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [state, setState] = useState('');
    const [district, setDistrict] = useState('');
    const [city, setCity] = useState('');
    const [village, setVillage] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [loginAs, setLoginAs] = useState('');
    const [userType, setUserType] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const individualUserTypes = ['Interest', 'Investor'];
    const organizationUserTypes = ['NBFC', 'Banker', 'Land Broker'];

    const indianStates = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
        "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
        "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
        "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
    ];

    const handleSignIn = async (e) => {
        e.preventDefault();
        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        try {
            const response = await axios.post('http://65.2.140.129:8000/api/users/', {
                user: {
                    name, email, password, phone, state, district, city, village, postalCode,
                    verification_token: verificationToken,
                    profile: {
                        login_as: loginAs,
                        user_type: userType,
                    }
                }
            });

            if (response.status === 201) {
                localStorage.setItem('authToken', response.data.user.token);
                router.push('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Sign-up failed.');
        }
    };

    return (
        <div className="container d-flex justify-content-center align-items-center vh-100">
            <div className="card shadow-lg p-4" style={{ maxWidth: "800px", width: "100%" }}>
                <h2 className="text-center mb-4">Sign Up</h2>
                <form onSubmit={handleSignIn}>
                    <div className="row">
                        {/* Left Column */}
                        <div className="col-md-6">
                            <div className="mb-3">
                                <label className="form-label">Full Name</label>
                                <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Email</label>
                                <input type="email" className="form-control" value={email} readOnly />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Phone Number</label>
                                <input type="tel" className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">State</label>
                                <select className="form-select" value={state} onChange={(e) => setState(e.target.value)} required>
                                    <option value="">Select State</option>
                                    {indianStates.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">District</label>
                                <input type="text" className="form-control" value={district} onChange={(e) => setDistrict(e.target.value)} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">City</label>
                                <input type="text" className="form-control" value={city} onChange={(e) => setCity(e.target.value)} required />
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="col-md-6">

                            <div className="mb-3">
                                <label className="form-label">Village Name</label>
                                <input type="text" className="form-control" value={village} onChange={(e) => setVillage(e.target.value)} />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Postal Code</label>
                                <input type="text" className="form-control" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Password</label>
                                <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Confirm Password</label>
                                <input type="password" className="form-control" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Login As</label>
                                <select className="form-select" value={loginAs} onChange={(e) => { setLoginAs(e.target.value); setUserType(''); }} required>
                                    <option value="">Select</option>
                                    <option value="Individual">Individual</option>
                                    <option value="Organization">Organization</option>
                                </select>
                            </div>
                            {loginAs && (
                                <div className="mb-3">
                                    <label className="form-label">User Type</label>
                                    <select className="form-select" value={userType} onChange={(e) => setUserType(e.target.value)} required>
                                        <option value="">Select User Type</option>
                                        {(loginAs === 'Individual' ? individualUserTypes : organizationUserTypes).map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-center mt-3">
                        <button type="submit" className="btn btn-dark w-100">Sign Up</button>
                    </div>

                    {error && <p className="text-danger text-center mt-2">{error}</p>}
                </form>
            </div>
        </div>
    );
}
