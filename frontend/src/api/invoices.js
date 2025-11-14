// frontend/src/api/invoices.js
import client from "./axios"; // <-- Changed from "./client"

// Create invoice (matches backend payload)
export const createInvoice = async (data) => {
  // --- THIS IS THE FIX ---
  // Backend expects flat customer_name, customer_mobile, and shop ID.
  const payload = {
    shop: data.shop, // Pass the shop ID from Billing.jsx
    customer_name: data.customer_name || "Walk-in", // Use flat field
    customer_mobile: data.customer_mobile || "", // Use flat field
    items: data.items.map((c) => ({
      product: c.product, // product ID
      qty: c.qty,
      unit_price: c.unit_price,
      tax_rate: c.tax_rate,
    })),
    grand_total: data.grand_total, // Send the calculated grand total
  };
  // -------------------------

  const res = await client.post("/invoices/", payload);
  return res.data;
};

// Get all invoices
export const getInvoices = async () => {
  const res = await client.get("/invoices/");
  // Handle both {data: [...]} and [...] responses
  return res?.data || res || []; 
};

// Get single invoice
export const getInvoice = async (id) => {
  const res = await client.get(`/invoices/${id}/`);
  return res.data;
};

// Delete invoice
export const deleteInvoice = async (id) => {
  const res = await client.delete(`/invoices/${id}/`);
  return res.data;
};