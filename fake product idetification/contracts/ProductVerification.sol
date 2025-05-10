// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ProductVerification is Ownable {
    struct Product {
        string name;
        string manufacturer;
        uint256 productionDate;
        bool exists;
        bool isVerified;
    }

    mapping(string => Product) private products;
    string[] private productIds;

    event ProductRegistered(string productId, string name, string manufacturer);
    event ProductUpdated(string productId, string name, string manufacturer);
    event ProductDeleted(string productId);
    event ProductVerified(string productId, bool isVerified);

    modifier productExists(string memory productId) {
        require(products[productId].exists, "Product does not exist");
        _;
    }

    modifier productNotExists(string memory productId) {
        require(!products[productId].exists, "Product already exists");
        _;
    }

    function registerProduct(
        string memory productId,
        string memory name,
        string memory manufacturer,
        uint256 productionDate
    ) public onlyOwner productNotExists(productId) {
        require(bytes(productId).length > 0, "Product ID cannot be empty");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(manufacturer).length > 0, "Manufacturer cannot be empty");
        require(productionDate > 0, "Invalid production date");

        products[productId] = Product({
            name: name,
            manufacturer: manufacturer,
            productionDate: productionDate,
            exists: true,
            isVerified: false
        });

        productIds.push(productId);
        emit ProductRegistered(productId, name, manufacturer);
    }

    function updateProduct(
        string memory productId,
        string memory name,
        string memory manufacturer,
        uint256 productionDate
    ) public onlyOwner productExists(productId) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(manufacturer).length > 0, "Manufacturer cannot be empty");
        require(productionDate > 0, "Invalid production date");

        Product storage product = products[productId];
        product.name = name;
        product.manufacturer = manufacturer;
        product.productionDate = productionDate;

        emit ProductUpdated(productId, name, manufacturer);
    }

    function deleteProduct(string memory productId) public onlyOwner productExists(productId) {
        delete products[productId];
        
        // Remove productId from productIds array
        for (uint i = 0; i < productIds.length; i++) {
            if (keccak256(bytes(productIds[i])) == keccak256(bytes(productId))) {
                productIds[i] = productIds[productIds.length - 1];
                productIds.pop();
                break;
            }
        }

        emit ProductDeleted(productId);
    }

    function verifyProduct(string memory productId) public productExists(productId) returns (bool) {
        Product storage product = products[productId];
        product.isVerified = true;
        emit ProductVerified(productId, true);
        return true;
    }

    function getProductDetails(string memory productId) public view productExists(productId) returns (
        string memory name,
        string memory manufacturer,
        uint256 productionDate,
        bool isVerified
    ) {
        Product memory product = products[productId];
        return (
            product.name,
            product.manufacturer,
            product.productionDate,
            product.isVerified
        );
    }

    function getAllProducts() public view returns (string[] memory, Product[] memory) {
        uint256 validProductCount = 0;
        
        // First count valid products
        for (uint i = 0; i < productIds.length; i++) {
            if (products[productIds[i]].exists) {
                validProductCount++;
            }
        }
        
        // Create arrays with the correct size
        string[] memory validProductIds = new string[](validProductCount);
        Product[] memory validProducts = new Product[](validProductCount);
        
        // Fill arrays with valid products
        uint256 currentIndex = 0;
        for (uint i = 0; i < productIds.length; i++) {
            if (products[productIds[i]].exists) {
                validProductIds[currentIndex] = productIds[i];
                validProducts[currentIndex] = products[productIds[i]];
                currentIndex++;
            }
        }
        
        return (validProductIds, validProducts);
    }
}