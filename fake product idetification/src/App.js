import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AdminPage from './components/AdminPage';
import CustomerPage from './components/CustomerPage';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <h1 className="project-title">Blockchain-Based Fake Product Identification System</h1>
        <nav className="navbar">
          <ul>
            <li><Link to="/admin">Admin Panel</Link></li>
            <li><Link to="/customer">Customer Verification</Link></li>
          </ul>
        </nav>

        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/customer" element={<CustomerPage />} />
          <Route path="/" element={<CustomerPage />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;