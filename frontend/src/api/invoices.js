import client from "./client";

// Create invoice (matches backend payload)
export const createInvoice = async (data) => {
  // backend expects: shop, customer, items, total_amount
  const payload = {
    shop: data.shop || 1, // default shop for testing
    customer: {
      name: data.customer_name || "",
      mobile: data.customer_mobile || "",
    },
    items: data.items.map((c) => ({
      product: c.product, // product ID
      qty: c.qty,
      unit_price: c.unit_price,
      tax_rate: c.tax_rate,
    })),
    total_amount: data.grand_total, // frontend total
  };

  const res = await client.post("/invoices/", payload);
  return res.data;
};

// Get all invoices
export const getInvoices = async () => {
  const res = await client.get("/invoices/");
  return res.data;
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
