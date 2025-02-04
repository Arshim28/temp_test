'use client';

export default function Navbar({ userDetails }) {
    const profilePic = userDetails?.user?.name?.charAt(0).toUpperCase() || 'U';

    return (
        <div className="dashboard-top-navbar">
            <div className="user-profile-circle">{profilePic}</div>
        </div>
    );
}
