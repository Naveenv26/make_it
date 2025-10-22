// src/pages/ShopSetup.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios"; // axios instance with JWT auth
import { toast } from "react-hot-toast";

export default function ShopSetup() {
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [existingShop, setExistingShop] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user already has a shop
    const fetchShop = async () => {
      try {
        const res = await api.get("/shops/");
        if (res.data.length > 0) {
          setExistingShop(res.data[0]);
        }
      } catch (err) {
        console.error("Error fetching shop:", err);
      }
    };
    fetchShop();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shopName.trim()) return toast.error("Shop name is required");

    setLoading(true);
    try {
      // 1️⃣ Create Shop
      const shopRes = await api.post("/shops/", {
        name: shopName,
        address,
      });
      const shopId = shopRes.data.id;

      // 2️⃣ Create Tax Profile
      await api.post("/taxprofiles/", {
        shop: shopId,
        gst_number: gstNumber,
        pan_number: panNumber,
      });

      toast.success("Shop created successfully!");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Error creating shop. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (existingShop) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <h2 className="text-2xl font-semibold mb-4">
          You already have a shop: {existingShop.name}
        </h2>
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          onClick={() => navigate("/dashboard")}
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[80vh] bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-md w-[90%] max-w-md"
      >
        <h1 className="text-2xl font-semibold mb-6 text-center">
          Setup Your Shop
        </h1>

        <label className="block mb-2 text-gray-700">Shop Name *</label>
        <input
          type="text"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          className="w-full mb-4 p-2 border rounded-lg"
          required
        />

        <label className="block mb-2 text-gray-700">Address</label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full mb-4 p-2 border rounded-lg"
          rows="2"
        />

        <label className="block mb-2 text-gray-700">GST Number</label>
        <input
          type="text"
          value={gstNumber}
          onChange={(e) => setGstNumber(e.target.value)}
          className="w-full mb-4 p-2 border rounded-lg"
        />

        <label className="block mb-2 text-gray-700">PAN Number</label>
        <input
          type="text"
          value={panNumber}
          onChange={(e) => setPanNumber(e.target.value)}
          className="w-full mb-4 p-2 border rounded-lg"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
        >
          {loading ? "Setting up..." : "Create Shop"}
        </button>
      </form>
    </div>
  );
}
// End of src/pages/ShopSetup.jsx