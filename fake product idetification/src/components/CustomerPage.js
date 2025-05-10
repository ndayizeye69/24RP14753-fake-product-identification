import React, { useState, useRef } from 'react';
import { ethers } from 'ethers';
import ProductVerification from '../artifacts/contracts/ProductVerification.sol/ProductVerification.json';
import jsQR from 'jsqr';
import './CustomerPage.css';

function CustomerPage() {
  const [productId, setProductId] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [productDetails, setProductDetails] = useState(null);
  const [status, setStatus] = useState('');
  const fileInputRef = useRef(null);

  const handleQRCodeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const image = new Image();
      image.src = URL.createObjectURL(file);

      image.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = image.width;
        canvas.height = image.height;
        context.drawImage(image, 0, 0);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          try {
            const qrData = JSON.parse(code.data);
            if (qrData.productId) {
              setProductId(qrData.productId);
              setStatus('QR Code scanned successfully!');
            } else {
              setStatus('Invalid QR code format - missing product ID');
            }
          } catch (error) {
            // If parsing fails, try using the raw data as product ID
            setProductId(code.data);
            setStatus('QR Code scanned successfully!');
          }
        } else {
          setStatus('No QR code found in the image.');
        }

        URL.revokeObjectURL(image.src);
      };
    } catch (error) {
      setStatus(`Error scanning QR code: ${error.message}`);
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    setVerificationResult(null);
    setProductDetails(null);
    setStatus('');

    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask to use this feature');
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        '0x5fbdb2315678afecb367f032d93f642f64180aa3',
        ProductVerification.abi,
        signer
      );

      try {
        const isAuthentic = await contract.verifyProduct(productId);
        if (isAuthentic) {
          const details = await contract.getProductDetails(productId);
          setVerificationResult(true);
          setProductDetails({
            name: details.name,
            manufacturer: details.manufacturer,
            productionDate: new Date(Number(details.productionDate) * 1000).toLocaleDateString(),
            isVerified: true
          });
          setStatus('Product verification successful!');
        } else {
          setVerificationResult(false);
          setProductDetails(null);
          setStatus('Product verification failed - potentially counterfeit product');
        }
      } catch (error) {
        if (error.message.includes('Product does not exist')) {
          setVerificationResult(false);
          setProductDetails(null);
          setStatus('Product not found in the system');
        } else {
          setVerificationResult(null);
          setProductDetails(null);
          setStatus(`Error during verification: ${error.message}`);
        }
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div className="customer-page">
      <h2>Verify Product Authenticity</h2>
      <form onSubmit={handleVerification}>
        <div>
          <label>Enter Product ID:</label>
          <input
            type="text"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="Enter product ID or scan QR code"
            required
          />
          <div className="qr-upload">
            <label htmlFor="qr-upload" className="qr-upload-label">
              Upload QR Code Image
            </label>
            <input
              id="qr-upload"
              type="file"
              accept="image/*"
              onChange={handleQRCodeUpload}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
          </div>
        </div>
        <button type="submit">Verify Product</button>
      </form>

      {status && <p className="status-message">{status}</p>}

      {verificationResult !== null && (
        <div className="verification-result">
          {verificationResult ? (
            <>
              <h3 className="authentic">Product is authentic! ✓</h3>
              {productDetails && (
                <div className="product-details">
                  <h4>Product Details:</h4>
                  <p><strong>Name:</strong> {productDetails.name}</p>
                  <p><strong>Manufacturer:</strong> {productDetails.manufacturer}</p>
                  <p><strong>Production Date:</strong> {productDetails.productionDate}</p>
                </div>
              )}
            </>
          ) : (
            <h3 className="fake">Product not found – possibly fake! ⚠</h3>
          )}
        </div>
      )}
    </div>
  );
}

export default CustomerPage;