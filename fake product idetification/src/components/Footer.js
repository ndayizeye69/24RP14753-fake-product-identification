import React from 'react';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>&copy; {new Date().getFullYear()} Blockchain-Based Fake Product Identification System</p>
        <div className="footer-links">
          <a href="#" onClick={(e) => e.preventDefault()}>About</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Contact</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;