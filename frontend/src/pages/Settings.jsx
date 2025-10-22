// src/pages/Settings.jsx
import React, { useState, useEffect } from "react";
import axios from "../api/axios"; // your base axios instance with JWT token
import { toast } from "react-hot-toast";

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const shopRes = await axios.get("/shops/me/");
        const subRes = await axios.get("/subscription-plans/");
        setShop(shopRes.data);
        setForm(shopRes.data);
        setSubscription(subRes.data[0]); // assume 1 active plan
      } catch (error) {
        toast.error("Failed to load settings");
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
    try {
      const res = await axios.put(`/shops/${shop.id}/`, form);
      setShop(res.data);
      setEditing(false);
      toast.success("Shop details updated!");
    } catch (err) {
      toast.error("Failed to update shop details");
    }
  };

  if (loading) return <div className="p-6 text-gray-400">Loading settings...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">⚙️ Settings</h1>

      {/* Shop Details */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow">
        <h2 className="text-xl font-semibold mb-4">Shop Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <input
            name="name"
            value={form.name || ""}
            onChange={handleChange}
            placeholder="Shop Name"
            disabled={!editing}
            className="border p-2 rounded"
          />
          <input
            name="address"
            value={form.address || ""}
            onChange={handleChange}
            placeholder="Address"
            disabled={!editing}
            className="border p-2 rounded"
          />
          <input
            name="gst_number"
            value={form.gst_number || ""}
            onChange={handleChange}
            placeholder="GST Number"
            disabled={!editing}
            className="border p-2 rounded"
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
              onClick={() => setEditing(false)}
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow">
        <h2 className="text-xl font-semibold mb-3">Subscription</h2>
        {subscription ? (
          <div>
            <p className="text-gray-700 dark:text-gray-300">
              Current Plan: <b>{subscription.name}</b>
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Validity: {subscription.validity_days} days
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Price: ₹{subscription.price}
            </p>
          </div>
        ) : (
          <p>No active subscription found</p>
        )}
        <button className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg">
          Manage Subscription
        </button>
      </div>

      {/* Admin Controls (optional) */}
      {shop?.is_active !== undefined && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow">
          <h2 className="text-xl font-semibold mb-3">Admin Controls</h2>
          <p>
            Account Status:{" "}
            <span
              className={`${
                shop.is_active ? "text-green-500" : "text-red-500"
              } font-semibold`}
            >
              {shop.is_active ? "Active" : "Blocked"}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
