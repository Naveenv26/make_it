import React, { useEffect, useState } from "react";
import { getInvoices } from "../api/invoices";
import { getProducts } from "../api/products";

// --- Icon Components for UI enhancement ---
const CurrencyRupeeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 8.25H9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12.75 12H12m-4.5 3.75h9.75" />
  </svg>
);
const DocumentTextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const PackageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10.5 8.25h3M12 3v5.25" />
  </svg>
);
const ExclamationTriangleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);
const NoSymbolIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
);

// --- Main Dashboard Component ---
export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      // Helper to safely extract array data from API responses
      const normalizeApiResponse = (response) => {
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response)) return response;
        return [];
      };

      try {
        // --- Fetch data in parallel for better performance ---
        const [invRes, prodRes] = await Promise.all([
          getInvoices(),
          getProducts(),
        ]);

        setInvoices(normalizeApiResponse(invRes));
        setProducts(normalizeApiResponse(prodRes));
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError("Failed to load dashboard data. Please try again later.");
        setInvoices([]);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- Calculated Metrics ---
  const totalSales = invoices.reduce(
    (sum, inv) => sum + Number(inv.total || inv.grand_total || 0),
    0
  );
  const totalInvoices = invoices.length;
  const totalProducts = products.length;
  const lowStock = products.filter(
    (p) => Number(p.quantity) > 0 && Number(p.quantity) <= Number(p.low_stock_threshold)
  ).length;
  const outOfStock = products.filter((p) => Number(p.quantity) === 0).length;

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Loading, please wait...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500 bg-red-50 p-4 rounded-md">{error}</div>;
  }

  // --- Summary Card Component ---
  const SummaryCard = ({ title, value, icon, color }) => (
    <div className={`bg-white p-6 rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase">{title}</h3>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className="text-gray-400">{icon}</div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Welcome back! Here's a summary of your business activity.
          </p>
        </div>

        {/* --- Summary Cards Grid --- */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <SummaryCard title="Total Sales" value={`₹${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={<CurrencyRupeeIcon />} color="border-blue-500" />
          <SummaryCard title="Invoices" value={totalInvoices} icon={<DocumentTextIcon />} color="border-green-500" />
          <SummaryCard title="Products" value={totalProducts} icon={<PackageIcon />} color="border-purple-500" />
          <SummaryCard title="Low Stock" value={lowStock} icon={<ExclamationTriangleIcon />} color="border-yellow-500" />
          <SummaryCard title="Out of Stock" value={outOfStock} icon={<NoSymbolIcon />} color="border-red-500" />
        </div>

        {/* --- Recent Invoices Table --- */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Invoices</h2>
          {invoices.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent invoices to display.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.slice(0, 10).map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{inv.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{inv.customer_name || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(inv.created_at || inv.invoice_date).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-semibold">
                        ₹{Number(inv.total || inv.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}