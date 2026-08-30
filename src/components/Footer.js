import React from "react";
import { useLocation } from "react-router-dom";
import "../styles/Footer.css";

const Footer = () => {
  const location = useLocation();
  const year = new Date().getFullYear();

  // Match Navbar's own rule: no footer on the login/register screens
  if (location.pathname === "/login" || location.pathname === "/register") {
    return null;
  }

  return (
    <footer className="app-footer">
      <div className="app-footer-container">
        <p className="app-footer-text">
          © {year} <span className="app-footer-brand">GreenLoop</span>. All
          rights reserved.
        </p>
        <p className="app-footer-credit">
          Built by{" "}
          <a
            href="https://github.com/AdityaAnjne/GreenLoop"
            target="_blank"
            rel="noopener noreferrer"
          >
            Aditya Anjne
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;