// frontend/src/pages/Billing.jsx
import React, { useState, useEffect, useRef } from "react";
// --- FIX: Corrected import paths with extensions ---
import { getProducts } from "../api/products.js";
import { createInvoice } from "../api/invoices.js";
import { useSubscription } from "../context/SubscriptionContext.jsx"; // Import the hook
// --------------------------------------------------
import toast from "react-hot-toast"; // Using toast for non-blocking errors

export default function Billing() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [lastRemoved, setLastRemoved] = useState(null);
  const [printMode, setPrintMode] = useState("thermal"); // 'thermal' | 'a4'

  // --- NEW: Get subscription data ---
  const { hasFeature, subscription } = useSubscription();

  const nameRef = useRef();
  const mobileRef = useRef();
  const searchRef = useRef();
  const productRefs = useRef({});

  const [searchMatches, setSearchMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [highlightedId, setHighlightedId] = useState(null);

  const shop = JSON.parse(localStorage.getItem("shop")) || {};
  const shopName = shop?.name || "My Shop";
  const today = new Date().toLocaleDateString();

  // 🔹 Load products safely
  const loadProducts = async () => {
    try {
      const res = await getProducts();
      // Handle both {data: [...]} and [...] responses
      const data = res.data || res; 
      const normalized = Array.isArray(data)
        ? data.map((p) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            unit: p.unit,
            // Use tax_rate from API, fallback to gst_percent
            tax_rate: Number(p.tax_rate || p.gst_percent || 0), 
            stock: Number(p.quantity),
          }))
        : [];
      setProducts(normalized);
    } catch (err) {
      console.error("Failed to load products:", err);
      toast.error("Failed to load products. Please login or check your network.");
      setProducts([]);
    }
  };

  useEffect(() => {
    loadProducts();
    nameRef.current?.focus();
  }, []);

  // 🔹 Keyboard shortcuts
  useEffect(() => {
    const handleKeys = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        finalizeInvoice();
      }
      if (e.key === "F4" && showModal) {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [cart, showModal, subscription, hasFeature]); // Add subscription/hasFeature to dependency array

  // ... (Cart operations: addToCart, removeItem, undoRemove, updateQty remain the same)
    // 🔹 Cart operations
  const addToCart = (p) => {
    setCart((prev) => {
      const found = prev.find((c) => c.id === p.id);
      if (found) {
        return prev.map((c) => (c.id === p.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { ...p, qty: 1 }];
    });
  };

  const removeItem = (id) => {
    const removed = cart.find((c) => c.id === id);
    if (removed) setLastRemoved(removed);
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  const undoRemove = () => {
    if (lastRemoved) {
      setCart((prev) => [...prev, lastRemoved]);
      setLastRemoved(null);
    }
  };

  const updateQty = (id, newQty) => {
    if (newQty <= 0) return; // Prevent 0 or negative
    setCart((prev) =>
      prev.map((c) => (c.id === id ? { ...c, qty: newQty } : c))
    );
  };

  // 🔹 Totals
  const subtotal = cart.reduce((sum, c) => sum + c.qty * c.price, 0);
  const tax = cart.reduce(
    (sum, c) => sum + (c.qty * c.price * (c.tax_rate || 0)) / 100,
    0
  );
  const total = subtotal + tax;

// frontend/src/pages/Billing.jsx

     // 🔹 Finalize invoice
     const finalizeInvoice = async () => {
      if (!cart.length) return toast.error("Cart is empty");
      if (!shop || !shop.id) {
          toast.error("Error: Shop information is missing. Please log out and log in again.");
          return;
      }
      // --- NEW: Subscription Check ---
      
      // --- FIX: Add a guard clause ---
      // First, check if the function even exists (i.e., is it loaded?)
      if (typeof hasFeature !== 'function') {
          toast.error("Subscription data is loading. Please try again in a moment.");
          return;
      }
      // Now that we know hasFeature IS a function, we can safely call it.
      if (!hasFeature('billing')) {
         toast.error("Your plan does not include billing. Please upgrade.");
       return;
      }
      // --- End Fix ---
      // Check for weekly bill limit on free trial
      const maxBills = subscription?.features?.max_bills_per_week;
      if (maxBills && maxBills !== -1) {    
         // This is a simplified check. A real implementation would query
         // the backend for the count of bills in the past 7 days.
      // We will simulate it here for demonstration.
      const simulatedBillCount = 50; // Replace with backend API call
      if (simulatedBillCount >= maxBills) {
        toast.error(`Your trial plan is limited to ${maxBills} bills per week. Please upgrade.`);
        return;
      }
    }
    // --- End Subscription Check ---


    try {
      const payload = {
        shop: shop.id, 
        customer_name: customerName || "Walk-in",
        customer_mobile: customerMobile || "",
        items: cart.map((c) => ({
          product: c.id,
          qty: c.qty,
          unit_price: c.price,
          tax_rate: c.tax_rate || 0,
        })),
        total_amount: total, 
        grand_total: total,
      };

      const res = await createInvoice(payload); 
      setInvoiceData(res.data || res); 
      setShowModal(true);
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to save invoice. The server reported an error.";
      toast.error(msg); // Use toast instead of alert
    }
  };

  // 🔹 Reset states
  const confirmInvoice = async () => {
    setCart([]);
    setCustomerName("");
    setCustomerMobile("");
    setSearch("");
    setHighlightedId(null);
    setShowModal(false);
    setInvoiceData(null); // Clear invoice data
    await loadProducts();
    nameRef.current?.focus();
  };

  // 🔹 Print handler
  const handlePrint = async () => {
    window.print();
    await confirmInvoice();
  };

  // ... (Search logic: handleSearchKeys, scrollToProduct remain the same)
  // 🔹 Search logic
  const handleSearchKeys = (e) => {
    const lowerSearch = search.toLowerCase();
    const filtered = (products || []).filter((p) =>
      p.name.toLowerCase().includes(lowerSearch)
    );
    const filteredIds = filtered.map((p) => p.id);

    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (!filteredIds.length) return;
      const next =
        currentMatchIndex + 1 < filteredIds.length ? currentMatchIndex + 1 : 0;
      setCurrentMatchIndex(next);
      setHighlightedId(filteredIds[next]);
      scrollToProduct(filteredIds[next]);
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (!filteredIds.length) return;
      const prev =
        currentMatchIndex - 1 >= 0 ? currentMatchIndex - 1 : filteredIds.length - 1;
      setCurrentMatchIndex(prev);
      setHighlightedId(filteredIds[prev]);
      scrollToProduct(filteredIds[prev]);
    }

    if (e.key === "Enter" && currentMatchIndex >= 0) {
      const prod = products.find((p) => p.id === filteredIds[currentMatchIndex]);
      if (prod) addToCart(prod);
    }

    if (!["Enter", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      setSearchMatches(filteredIds);
      setCurrentMatchIndex(-1);
      setHighlightedId(null);
    }
  };

  const scrollToProduct = (id) => {
    const element = productRefs.current[id];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      setHighlightedId(id);
    }
  };


  return (
    // ... (Rest of the JSX remains the same, using `toast.error` instead of `alert`)
    <div className="p-4 md:p-6 max-w-7xl mx-auto bg-white shadow rounded">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-center border-b pb-2 mb-4 gap-2">
        <div className="w-full sm:w-auto">
          <h1 className="text-xl font-bold text-center sm:text-left">{shopName}</h1>
          <p className="text-sm text-gray-600 text-center sm:text-left">{today}</p>
        </div>
        <button
          onClick={() =>
            setPrintMode((prev) => (prev === "thermal" ? "a4" : "thermal"))
          }
          className="bg-gray-100 text-sm px-3 py-1 rounded w-full sm:w-auto"
        >
          Mode: {printMode.toUpperCase()}
        </button>
      </div>

      {/* Customer Info - Responsive */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input
          type="text"
          placeholder="Customer Name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          ref={nameRef}
          onKeyDown={(e) => e.key === "Enter" && mobileRef.current?.focus()}
          className="border p-2 rounded w-full md:w-1/2" // Changed to md:w-1/2
        />
        <input
          type="text"
          placeholder="Mobile Number"
          value={customerMobile}
          onChange={(e) => setCustomerMobile(e.target.value)}
          ref={mobileRef}
          onKeyDown={(e) => e.key === "Enter" && searchRef.current?.focus()}
          className="border p-2 rounded w-full md:w-1/2" // Changed to md:w-1/2
        />
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search product (Use ⬅️ and ➡️ to select)"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setHighlightedId(null);
            setSearchMatches([]);
            setCurrentMatchIndex(-1);
          }}
          onKeyDown={handleSearchKeys}
          ref={searchRef}
          className="border p-2 rounded w-full"
        />
      </div>

      {/* Product List - Horizontal scroll is good for mobile */}
      <div className="flex gap-4 mb-6 overflow-x-auto border p-3 rounded bg-gray-50 min-h-[140px]">
        {(products || [])
          .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
          .map((p) => {
            const orderedItem = cart.find((c) => c.id === p.id);
            const orderedQty = orderedItem ? orderedItem.qty : 0;
            const oversold = orderedQty > p.stock ? orderedQty - p.stock : 0;

            return (
              <div
                key={p.id}
                ref={(el) => (productRefs.current[p.id] = el)}
                className={`border bg-white p-3 min-w-[160px] rounded flex-shrink-0 cursor-pointer hover:bg-gray-100 
                  ${highlightedId === p.id ? "bg-indigo-100 ring-2 ring-indigo-400" : ""}`}
                onClick={() => addToCart(p)}
              >
                <h3 className="font-semibold truncate" title={p.name}>{p.name}</h3>
                <p>₹{p.price} ({p.unit})</p>
                <p className="text-sm text-gray-500">Tax: {p.tax_rate}%</p>
                <p className="text-xs text-gray-600">
                  Stock: {p.stock} | Ordered: {orderedQty}
                  {oversold > 0 && (
                    <span className="text-red-600 ml-2">⚠ {oversold} over</span>
                  )}
                </p>
              </div>
            );
          })}
        {products.length === 0 && (
          <p className="text-gray-500 self-center mx-auto">Loading products...</p>
        )}
      </div>

      {/* Cart Table - Horizontal scroll is good for mobile */}
      <div className="overflow-x-auto">
        <table className="w-full border mb-4 text-sm min-w-[600px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border text-left w-auto">Product</th>
              <th className="p-2 border text-center w-[150px]">Qty</th>
              <th className="p-2 border text-right w-[100px]">Price</th>
              <th className="p-2 border text-right w-[80px]">Tax%</th>
              <th className="p-2 border text-right w-[120px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {cart.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center p-6 text-gray-500">
                  Cart is empty. Click a product to add it.
                </td>
              </tr>
            )}
            {cart.map((c) => {
              const lineTotal = c.qty * c.price;
              const taxAmt = (lineTotal * (c.tax_rate || 0)) / 100;
              const totalWithTax = lineTotal + taxAmt;
              return (
                <tr key={c.id}>
                  <td className="p-2 border">
                    <button
                      onClick={() => removeItem(c.id)}
                      className="text-red-600 font-bold hover:scale-110 mr-2"
                    >
                      ✕
                    </button>
                    {c.name}
                  </td>
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => updateQty(c.id, c.qty - 1)}
                      className="px-2 bg-gray-200 rounded hover:bg-gray-300"
                      disabled={c.qty <= 1}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="1" // Use step 1 for whole quantities, or 0.01 for decimals
                      value={c.qty}
                      onChange={(e) => updateQty(c.id, Number(e.target.value))}
                      className="w-16 border p-1 rounded text-center mx-1"
                    />
                    <button
                      onClick={() => updateQty(c.id, c.qty + 1)}
                      className="px-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      +
                    </button>
                  </td>
                  <td className="p-2 border text-right">₹{c.price.toFixed(2)}</td>
                  <td className="p-2 border text-right">{c.tax_rate}%</td>
                  <td className="p-2 border text-right font-semibold">
                    ₹{totalWithTax.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="text-right mb-4 text-sm space-y-1">
        <p>Subtotal: ₹{subtotal.toFixed(2)}</p>
        <p>Tax: ₹{tax.toFixed(2)}</p>
        <p className="text-lg font-bold">Grand Total: ₹{total.toFixed(2)}</p>
      </div>

      <button
        onClick={finalizeInvoice}
        disabled={cart.length === 0}
        className="bg-blue-600 text-white px-6 py-3 rounded font-bold text-lg disabled:bg-gray-400"
      >
        Finalize Invoice (F2)
      </button>

      {/* Invoice Modal */}
      {showModal && invoiceData && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
          <div id="printableBill" className="bg-white w-80 p-4"> {/* w-80 is 320px, good for thermal */}
            <div className="text-center mb-2">
              <h2 className="text-lg font-bold">{shopName}</h2>
              <p className="text-xs">{shop.address}</p>
              <p className="text-xs">{shop.contact_phone}</p>
              <p className="text-sm mt-2">
                Invoice No: #{String(invoiceData.number || 1).padStart(5, "0")}
              </p>
              <p className="text-xs">
                {new Date(invoiceData.invoice_date).toLocaleString()}
              </p>
            </div>

            {(invoiceData.customer_name && invoiceData.customer_name !== "Walk-in") && (
              <p className="mb-2 text-sm">
                Customer: {invoiceData.customer_name || ""}{" "}
                {invoiceData.customer_mobile
                  ? `(${invoiceData.customer_mobile})`
                  : ""}
              </p>
            )}

            <hr className="my-2 border-dashed border-gray-400" />

            <table className="w-full text-xs my-2">
              <thead>
                <tr className="border-b border-dashed border-gray-400">
                  <th className="text-left py-1">Item</th>
                  <th className="text-center py-1">Qty</th>
                  <th className="text-right py-1">Rate</th>
                  <th className="text-right py-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.items.map((it, idx) => {
                  const lineTotal = it.qty * it.unit_price; // Total before tax
                  return (
                    <tr key={idx} className="border-b border-dashed border-gray-300">
                      <td className="py-1">{it.product_name || it.product}</td>
                      <td className="text-center py-1">{it.qty}</td>
                      <td className="text-right py-1">₹{Number(it.unit_price || 0).toFixed(2)}</td>
                      <td className="text-right py-1">₹{Number(lineTotal || 0).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <hr className="my-2 border-dashed border-gray-400" />

            <div className="text-right text-sm space-y-1 mt-2">
              {/* Use the totals from the backend response for accuracy */}
              <p>Subtotal: ₹{Number(invoiceData.subtotal).toFixed(2)}</p>
              <p>Tax: ₹{Number(invoiceData.tax_total).toFixed(2)}</p>
              <p className="font-bold text-base">
                Grand Total: ₹
                {Number(invoiceData.grand_total).toFixed(2)}
              </p>
            </div>

            <hr className="my-2 border-dashed border-gray-400" />

            <p className="text-center mt-4 text-sm">*** Thank you! Visit Again ***</p>

            <div id="modal-actions" className="mt-6 flex justify-around gap-2">
              <button
                onClick={handlePrint}
                className="bg-indigo-600 text-white px-4 py-2 rounded w-1/2"
              >
                Print (F4)
              </button>
              <button
                onClick={confirmInvoice} // Use confirmInvoice to close AND reset
                className="bg-gray-300 px-4 py-2 rounded w-1/2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

  {/* Print Styles */}
      <style>{`
        @page {
          size: ${printMode === "a4" ? "A4 portrait" : "80mm"}; 
          margin: ${printMode === "a4" ? "10mm" : "0"};
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printableBill, #printableBill * {
            visibility: visible !important;
          }
          #printableBill {
            position: fixed;
            top: 0;
            left: 0;
            width: ${printMode === "a4" ? "100%" : "80mm"} !important;
            margin: 0 auto;
            box-shadow: none !important;
            border: none !important;
          }
          #modal-actions {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
