// src/components/Common/Navbar.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { logoutUser } from '../../services/firebase';
import '../../styles/App.css';

const Navbar = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">DataTails</Link>
        <ul className={mobileMenuOpen ? 'nav-menu active' : 'nav-menu'}>
          <li className="nav-item"><Link to="/chat" className="nav-link">Chat</Link></li>
          <li className="nav-item"><Link to="/pricing" className="nav-link">Pricing</Link></li>
          <li className="nav-item"><Link to="/about" className="nav-link">About Us</Link></li>
          <li className="nav-item"><Link to="/settings" className="nav-link">Settings</Link></li>
        </ul>
        {currentUser && (
          <div className="user-info">
            <span style={{fontWeight:'bold',color:'var(--primary)',fontSize:'1.1rem'}}>{userData?.username}</span>
            {userData?.isPremium && <span className="premium-badge">Premium</span>}
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        )}
        <div className="menu-icon" onClick={toggleMobileMenu}>
          <i className={mobileMenuOpen ? 'fas fa-times' : 'fas fa-bars'} />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;