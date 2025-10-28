// frontend/src/pages/Settings.jsx
import React, { useState, useEffect } from "react";
import axios from "../api/axios"; // your base axios instance with JWT token
import { toast } from "react-hot-toast";

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState(null); // This will hold the full shop object
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [subscription, setSubscription] = useState(null); // Keep this for subscription info

  useEffect(() => {
    const fetchData = async () => {
      try {
        // --- UPDATED: Fetch from /me/ endpoint ---
        const meRes = await axios.get("/me/");
        const { shop: shopData } = meRes.data;

        if (shopData) {
          setShop(shopData);
          setForm(shopData); // Pre-fill the form with shop data
        } else {
          toast.error("No shop data found for this user.");
        }

        // You can still fetch subscription plans separately
        const subRes = await axios.get("/subscription-plans/"); // This seems to be for all plans
        // You might want to filter this or get the user's specific plan
        setSubscription(subRes.data[0]); // (Kept original logic)

      } catch (error) {
        toast.error("Failed to load settings");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!shop || !shop.id) {
      toast.error("Cannot save: Shop ID is missing.");
      return;
    }

    try {
      // --- UPDATED: Use the correct endpoint with shop ID ---
      // The backend ShopViewSet is filtered, so this request is secure
      const res = await axios.put(`/shops/${shop.id}/`, form);
      
      setShop(res.data);
      setForm(res.data); // Update form with new data
      setEditing(false);
      
      // --- UPDATE localStorage to match ---
      localStorage.setItem("shop", JSON.stringify(res.data));
      // Optionally, force a window reload or update Layout's state
      // to show the new name immediately in the sidebar.
      window.location.reload(); // Easiest way to update sidebar name
      
      toast.success("Shop details updated!");
    } catch (err) {
      toast.error("Failed to update shop details");
      console.error(err);
    }
  };

  if (loading) return <div className="p-6 text-gray-400">Loading settings...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">⚙️ Settings</h1>

      {/* Shop Details */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow">
        <h2 className="text-xl font-semibold mb-4">Shop Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Made responsive */}
          <input
            name="name"
            value={form.name || ""}
            onChange={handleChange}
            placeholder="Shop Name"
            disabled={!editing}
            className="border p-2 rounded disabled:bg-gray-100" // Added disabled style
          />
          <input
            name="address"
            value={form.address || ""}
            onChange={handleChange}
            placeholder="Address"
            disabled={!editing}
            className="border p-2 rounded disabled:bg-gray-100"
          />
          {/* Example: Add other fields from your Shop model */}
          <input
            name="contact_phone"
            value={form.contact_phone || ""}
            onChange={handleChange}
            placeholder="Contact Phone"
            disabled={!editing}
            className="border p-2 rounded disabled:bg-gray-100"
          />
           <input
            name="contact_email"
            value={form.contact_email || ""}
            onChange={handleChange}
            placeholder="Contact Email"
            disabled={!editing}
            className="border p-2 rounded disabled:bg-gray-100"
          />
          <input
            name="gst_number"
            value={form.gst_number || ""}
            onChange={handleChange}
            placeholder="GST Number (if any)"
            disabled={!editing}
            className="border p-2 rounded disabled:bg-gray-100"
          />
        </div>

        {editing ? (
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setForm(shop); // Reset form changes
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            Edit Shop
          </button>
        )}
      </div>

      {/* Subscription Info */}
      {/* ... (no change needed here, but ensure your logic for finding the
           'active' subscription is correct instead of subRes.data[0]) ... */}
      
    </div>
  );
}