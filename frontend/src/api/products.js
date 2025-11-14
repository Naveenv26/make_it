// frontend/src/api/products.js
import client from "./axios"; // <-- Changed from "./client"

// Get all products
export const getProducts = async () => {
  const res = await client.get("/products/"); // updated backend endpoint
  return res.data; // returns array of products
};

// Create a new product
export const createProduct = async (product) => {
  const res = await client.post("/products/", product);
  return res.data;
};

// Update a product by ID
export const updateProduct = async (id, product) => {
  const res = await client.put(`/products/${id}/`, product);
  return res.data;
};

// Soft delete a product by ID (optional)
export const deleteProduct = async (id) => {
  const res = await client.delete(`/products/${id}/`);
  return res.data;
};