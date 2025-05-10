import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import QRCode from 'qrcode.react';
import ProductVerification from '../artifacts/contracts/ProductVerification.sol/ProductVerification.json';
import './AdminPage.css';

function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [formData, setFormData] = useState({
    productId: '',
    name: '',
    manufacturer: '',
    productionDate: ''
  });
  const [qrCode, setQrCode] = useState('');
  const [status, setStatus] = useState('');
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
   const [isLoading, setIsLoading] = useState(false);
  const [isContractReady, setIsContractReady] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('');
  const [isOwner, setIsOwner] = useState(false);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    // In a real application, this should be a secure password and properly hashed
    const correctPassword = 'admin123';
    if (password === correctPassword) {
      setIsAuthenticated(true);
      setStatus('');
    } else {
      setStatus('Incorrect password');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  useEffect(() => {
    const initializeEthers = async () => {
      if (window.ethereum && isAuthenticated) {
        setIsLoading(true);
        try {
          // Request account access
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          let provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          const chainId = Number(network.chainId);
          
          // Check if we're on the correct network (Hardhat's default is 1337)
          if (chainId !== 1337) {
            try {
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x539' }] // 1337 in hex
              });
            } catch (switchError) {
              // This error code indicates that the chain has not been added to MetaMask
              if (switchError.code === 4902) {
                try {
                  await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                      chainId: '0x539',
                      chainName: 'Hardhat Local Network',
                      nativeCurrency: {
                        name: 'ETH',
                        symbol: 'ETH',
                        decimals: 18
                      },
                      rpcUrls: ['http://localhost:8545'],
                      blockExplorerUrls: null
                    }]
                  });
                  // After adding the chain, retry switching to it
                  await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x539' }]
                  });
                } catch (addError) {
                  throw new Error('Failed to add Hardhat network: ' + addError.message);
                }
              } else {
                throw new Error('Failed to switch to Hardhat network: ' + switchError.message);
              }
            }
            // Refresh provider after network switch
            provider = new ethers.BrowserProvider(window.ethereum);
          }
          
          const signer = await provider.getSigner();
          const contractAddress = '0x5fbdb2315678afecb367f032d93f642f64180aa3';
          
          // Verify contract is deployed
          const code = await provider.getCode(contractAddress);
          if (code === '0x') {
            throw new Error('Contract not deployed at specified address');
          }
          
          // Initialize contract with verified ABI
          if (!ProductVerification.abi || !Array.isArray(ProductVerification.abi)) {
            throw new Error('Invalid contract ABI');
          }
          
          const contract = new ethers.Contract(
            contractAddress,
            ProductVerification.abi,
            signer
          );
          
          // Verify contract methods
          const requiredMethods = ['registerProduct', 'updateProduct', 'deleteProduct', 'getAllProducts'];
          for (const method of requiredMethods) {
            if (!ProductVerification.abi.find(item => item.name === method && item.type === 'function')) {
              throw new Error(`Contract ABI missing ${method} function`);
            }
          }
          // Add network change listener
          window.ethereum.on('chainChanged', () => {
            window.location.reload();
          });

          // Add account change listener
          window.ethereum.on('accountsChanged', () => {
            window.location.reload();
          });

          // Test contract connection and check ownership
          try {
            await contract.getAllProducts();
            const signerAddress = await signer.getAddress();
            const ownerAddress = await contract.owner();
            setCurrentAddress(signerAddress);
            setIsOwner(signerAddress.toLowerCase() === ownerAddress.toLowerCase());
          } catch (error) {
            throw new Error('Failed to connect to contract: ' + error.message);
          }

          setProvider(provider);
          setSigner(signer);
          setContract(contract);
          setIsContractReady(true);
          await loadProducts(contract);
        } catch (error) {
          setStatus(`Error initializing: ${error.message}`);
        } finally {
          setIsLoading(false);
        }
      }
    };
    initializeEthers();
  }, [isAuthenticated]);

  const loadProducts = async (contractInstance) => {
    try {
      const [productIds, productDetails] = await contractInstance.getAllProducts();
      const formattedProducts = productIds
        .map((id, index) => ({
          id,
          name: productDetails[index].name,
          manufacturer: productDetails[index].manufacturer,
          productionDate: new Date(Number(productDetails[index].productionDate) * 1000).toLocaleDateString(),
          exists: productDetails[index].exists
        }))
        .filter(product => product.exists && product.name && product.manufacturer)
        .filter(product => product.exists);
      setProducts(formattedProducts);
    } catch (error) {
      setStatus(`Error loading products: ${error.message}`);
    }
  };

  const handleDelete = async (productId) => {
    try {
      const tx = await contract.deleteProduct(productId);
      await tx.wait();
      await loadProducts(contract);
      setStatus('Product deleted successfully!');
    } catch (error) {
      setStatus(`Error deleting product: ${error.message}`);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      productId: product.id,
      name: product.name,
      manufacturer: product.manufacturer,
      productionDate: new Date(product.productionDate).toISOString().split('T')[0]
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const timestamp = Math.floor(new Date(formData.productionDate).getTime() / 1000);
      const tx = await contract.updateProduct(
        formData.productId,
        formData.name,
        formData.manufacturer,
        timestamp
      );
      await tx.wait();
      setEditingProduct(null);
      await loadProducts(contract);
      setStatus('Product updated successfully!');
      setFormData({
        productId: '',
        name: '',
        manufacturer: '',
        productionDate: ''
      });
    } catch (error) {
      setStatus(`Error updating product: ${error.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');
    setIsLoading(true);
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask to use this feature');
      }

      if (!contract) {
        throw new Error('Contract not initialized');
      }

      const timestamp = Math.floor(new Date(formData.productionDate).getTime() / 1000);
      
      setStatus('Registering product...');
      const tx = await contract.registerProduct(
        formData.productId,
        formData.name,
        formData.manufacturer,
        timestamp
      );

      setStatus('Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        const qrCodeData = JSON.stringify({
          productId: formData.productId,
          name: formData.name,
          manufacturer: formData.manufacturer,
          productionDate: formData.productionDate
        });
        setQrCode(qrCodeData);
        setStatus('Loading updated product list...');
        await loadProducts(contract);
        setStatus('Product registered successfully!');
        setFormData({
          productId: '',
          name: '',
          manufacturer: '',
          productionDate: ''
        });
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      // Extract the revert reason from the error
      const errorMessage = error.message.includes('Product ID already exists') 
        ? 'A product with this ID already exists. Please use a different Product ID.'
        : `Error: ${error.message}`;
      setStatus(errorMessage);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-page">
        <h2>Admin Authentication</h2>
        <form onSubmit={handlePasswordSubmit}>
          <div>
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit">Login</button>
        </form>
        {status && <p className="status-message">{status}</p>}
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h2>Register New Product</h2>
      {!isContractReady ? (
        <p>Please connect your wallet to register products</p>
      ) : (
        <div>
          {isLoading && <p className="status-message loading-message">Processing transaction...</p>}
          {status && <p className="status-message">{status}</p>}
          <div className="product-form">
        <form onSubmit={editingProduct ? handleUpdate : handleSubmit}>
          <div>
            <label>Product ID:</label>
            <input
              type="text"
              name="productId"
              value={formData.productId}
              onChange={handleInputChange}
              required
              disabled={editingProduct || !isContractReady}
            />
          </div>
        <div>
          <label>Product Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label>Manufacturer:</label>
          <input
            type="text"
            name="manufacturer"
            value={formData.manufacturer}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label>Production Date:</label>
          <input
            type="date"
            name="productionDate"
            value={formData.productionDate}
            onChange={handleInputChange}
            required
          />
        </div>
        <button type="submit" disabled={!isContractReady}>
          {editingProduct ? 'Update Product' : 'Register Product'}
        </button>
      </form>
          </div>
        </div>
      )}
    {status && <p className="status-message">{status}</p>}

      {qrCode && !editingProduct && (
        <div className="qr-code-section">
          <h3>Generated QR Code</h3>
          <QRCode value={qrCode} size={256} level="H" />
          <div className="product-details">
            {(() => {
              const details = JSON.parse(qrCode);
              return (
                <>
                  <p><strong>Product ID:</strong> {details.productId}</p>
                  <p><strong>Name:</strong> {details.name}</p>
                  <p><strong>Manufacturer:</strong> {details.manufacturer}</p>
                  <p><strong>Production Date:</strong> {details.productionDate}</p>
                </>
              );
            })()}
          </div>
          <button onClick={() => {
            const qrCodeCanvas = document.querySelector('.qr-code-section canvas');
            const qrCodeUrl = qrCodeCanvas.toDataURL('image/png');
            const printWindow = window.open('', '_blank');
            const details = JSON.parse(qrCode);
            printWindow.document.write(`
              <html>
                <head>
                  <title>Product QR Code</title>
                  <style>
                    body { 
                      display: flex; 
                      flex-direction: column; 
                      align-items: center; 
                      justify-content: center; 
                      min-height: 100vh;
                      margin: 0;
                      padding: 20px;
                      font-family: Arial, sans-serif;
                    }
                    .print-container { 
                      text-align: center;
                      background: white;
                      padding: 20px;
                      border-radius: 8px;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .qr-code-image {
                      width: 256px;
                      height: 256px;
                      margin: 20px 0;
                    }
                    .product-details {
                      margin-top: 20px;
                      text-align: left;
                      width: 100%;
                      max-width: 300px;
                    }
                    .product-details p {
                      margin: 8px 0;
                      line-height: 1.5;
                    }
                    @media print {
                      body { 
                        -webkit-print-color-adjust: exact;
                        background: white;
                      }
                      .print-container {
                        box-shadow: none;
                      }
                    }
                  </style>
                </head>
                <body>
                  <div class="print-container">
                    <h2>Product QR Code</h2>
                    <img src="${qrCodeUrl}" alt="Product QR Code" class="qr-code-image"/>
                    <div class="product-details">
                      <p><strong>Product ID:</strong> ${details.productId}</p>
                      <p><strong>Name:</strong> ${details.name}</p>
                      <p><strong>Manufacturer:</strong> ${details.manufacturer}</p>
                      <p><strong>Production Date:</strong> ${details.productionDate}</p>
                    </div>
                  </div>
                  <script>
                    window.onload = () => {
                      window.print();
                    };
                  </script>
                  <div class="print-container">
                    <h2>Product QR Code</h2>
                    <img src="${qrCodeUrl}" alt="Product QR Code" />
                    <div class="product-details">
                      <p><strong>Product ID:</strong> ${details.productId}</p>
                      <p><strong>Name:</strong> ${details.name}</p>
                      <p><strong>Manufacturer:</strong> ${details.manufacturer}</p>
                      <p><strong>Production Date:</strong> ${details.productionDate}</p>
                    </div>
                  </div>
                </body>
              </html>
            `);
            setTimeout(() => {
              printWindow.print();
              printWindow.close();
            }, 500);
          }}>Print QR Code</button>
        </div>
      )}

      {products.length > 0 && (
        <div className="products-list">
           <h3>Registered Products</h3>
          <table className="products-table">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Name</th>
                <th>Manufacturer</th>
                <th>Production Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.id}</td>
                  <td>{product.name}</td>
                  <td>{product.manufacturer}</td>
                  <td>{product.productionDate}</td>
                  <td>
                    <button onClick={() => handleEdit(product)} className="action-btn edit-btn">Edit</button>
                    <button onClick={() => handleDelete(product.id)} className="action-btn delete-btn">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminPage;