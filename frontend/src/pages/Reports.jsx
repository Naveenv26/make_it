import React, { useState, useEffect, useMemo } from "react";
// --- FIX: Corrected import paths with extensions ---
import { getInvoices } from "../api/invoices.js";
import { getProducts } from "../api/products.js";
import { useSubscription } from "../context/SubscriptionContext.jsx"; // Import the hook
// --------------------------------------------------

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import * as XLSX from 'xlsx'; // Import xlsx

// A custom hook to check for media queries (screen size)
const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) setMatches(media.matches);
        const listener = () => setMatches(media.matches);
        window.addEventListener("resize", listener);
        return () => window.removeEventListener("resize", listener);
    }, [matches, query]);
    return matches;
};

// Reusable component to handle the mobile card vs. desktop table logic
const ResponsiveDataView = ({ isMobile, data, renderMobile, renderDesktop, noDataMessage }) => {
    if (!data || data.length === 0) {
        return <p className="text-center p-4 text-gray-500">{noDataMessage}</p>;
    }
    return isMobile ? (
        <div className="space-y-3">{data.map(renderMobile)}</div>
    ) : (
        <div className="overflow-x-auto rounded shadow border border-gray-200">
            {renderDesktop()}
        </div>
    );
};

// Stat Card component
const StatCard = ({ title, value, color = "blue" }) => (
    <div className={`bg-${color}-100 p-4 rounded-lg shadow`}>
        <h3 className={`font-semibold text-sm text-${color}-700`}>{title}</h3>
        <p className={`text-2xl font-bold text-${color}-900`}>{value}</p>
    </div>
);

// Currency formatter
const formatCurrency = (val) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(val || 0));

// Text highlighter
function highlightText(text = "", query = "") {
    if (!query || typeof text !== "string") return text;
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
        regex.test(part) ? <mark key={i} className="bg-yellow-300 text-black rounded px-0.5">{part}</mark> : part
    );
}

// --- Main Reports Component ---
export default function Reports() {
    // ... (all existing states remain the same)
    const [tab, setTab] = useState("sales");
    const [invoices, setInvoices] = useState([]);
    const [products, setProducts] = useState([]);
    
    // Filters
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [salesSearch, setSalesSearch] = useState("");
    const [stockSearch, setStockSearch] = useState("");
    const [productSearch, setProductSearch] = useState("");
    
    // UI State
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isMobile = useMediaQuery("(max-width: 640px)");

    // --- NEW: Get subscription data ---
    // --- FIX: Use the subscription context correctly ---
    const { isSubscribed, isLoading: isSubscriptionLoading } = useSubscription();
    // Manually define canExport based on subscription status
    const canExport = isSubscribed; 
    // If you have a more granular `hasFeature` function in your context, you can use it:
    // const { hasFeature } = useSubscription();
    // const canExport = hasFeature('export');

    // ... (useEffect and Memoized calculations remain the same)
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);
                const invRes = await getInvoices();
                const prodRes = await getProducts();

                const invoiceData = invRes?.data || invRes || [];
                const productData = prodRes?.data || prodRes || [];

                setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
                setProducts(Array.isArray(productData) ? productData : []);

            } catch (err) {
                console.error("Failed to load report data:", err);
                setError("Failed to load data. Check console for details.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Memoized calculations...
    const filteredInvoices = useMemo(() => {
        return Array.isArray(invoices) ? invoices.filter(inv => {
            if (!inv.invoice_date) return false; 
            if (!fromDate && !toDate) return true;
            const invDate = new Date(inv.invoice_date);
            const from = fromDate ? new Date(fromDate) : null;
            const to = toDate ? new Date(toDate + "T23:59:59.999Z") : null; 
            if (from && invDate < from) return false;
            if (to && invDate > to) return false;
            return true;
        }) : [];
    }, [invoices, fromDate, toDate]);

    const totalSales = useMemo(() => 
        filteredInvoices.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0)
    , [filteredInvoices]);

    const searchedInvoices = useMemo(() => {
        return filteredInvoices.filter(inv => 
            inv.customer_name?.toLowerCase().includes(salesSearch.toLowerCase()) || 
            String(inv.number)?.toLowerCase().includes(salesSearch.toLowerCase()) ||
            (inv.items || []).some(it => it.product_name?.toLowerCase().includes(salesSearch.toLowerCase()))
        );
    }, [filteredInvoices, salesSearch]);

    const searchedStock = useMemo(() => {
        return Array.isArray(products) ? products.filter(p => 
            p.name?.toLowerCase().includes(stockSearch.toLowerCase()) || 
            p.unit?.toLowerCase().includes(stockSearch.toLowerCase())
        ) : [];
    }, [products, stockSearch]);

    const stockChartData = useMemo(() => 
        searchedStock.map(p => ({ name: p.name, value: Number(p.quantity || 0) }))
            .sort((a,b) => b.value - a.value)
            .slice(0, 15)
    , [searchedStock]);
    
    const totalStockValue = useMemo(() => 
        searchedStock.reduce((sum, p) => sum + Number(p.price || 0) * Number(p.quantity || 0), 0)
    , [searchedStock]);

    const productPriceMap = useMemo(() => {
        const map = new Map();
        products.forEach(p => {
            map.set(p.name, Number(p.price || 0));
        });
        return map;
    }, [products]);

    const productSoldData = useMemo(() => {
        const productSoldMap = {};
        filteredInvoices.forEach(inv => (inv.items || []).forEach(it => {
            const qty = Number(it.qty || 0); 
            if (!it.product_name) return;
            if (!productSoldMap[it.product_name]) productSoldMap[it.product_name] = 0;
            productSoldMap[it.product_name] += qty;
        }));
        return Object.entries(productSoldMap).map(([name, value]) => ({ name, value }));
    }, [filteredInvoices]);

    const searchedProductSold = useMemo(() => {
        return productSoldData.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
    }, [productSoldData, productSearch]);

    const productSoldStats = useMemo(() => {
        let totalQty = 0;
        let totalAmount = 0;
        let mostSold = null;

        searchedProductSold.forEach(p => {
            totalQty += p.value;
            const unitPrice = productPriceMap.get(p.name) || 0;
            totalAmount += p.value * unitPrice;
            if (!mostSold || p.value > mostSold.value) {
                mostSold = p;
            }
        });
        return { totalQty, totalAmount, mostSold };
    }, [searchedProductSold, productPriceMap]);
    // --- End of memos ---


    // --- NEW: Excel Export Function ---
    const handleExport = () => {
        if (!canExport && !isSubscriptionLoading) { // Check if not loading
            alert("This is a Pro feature. Please upgrade your plan to export reports.");
            return;
        }

        let dataToExport = [];
        let filename = "report.xlsx";

        if (tab === "sales") {
            filename = "sales_report.xlsx";
            dataToExport = searchedInvoices.map(inv => ({
                "Invoice #": inv.number,
                "Date": new Date(inv.invoice_date).toLocaleDateString(),
                "Customer": inv.customer_detail?.name || inv.customer_name || "Walk-in",
                "Mobile": inv.customer_detail?.mobile || inv.customer_mobile || "",
                "Subtotal": inv.subtotal,
                "Tax": inv.tax_total,
                "Total": inv.grand_total,
            }));
        } else if (tab === "stock") {
            filename = "stock_report.xlsx";
            dataToExport = searchedStock.map(p => ({
                "Product Name": p.name,
                "Quantity": p.quantity,
                "Price": p.price,
                "Stock Value": p.price * p.quantity,
            }));
        } else if (tab === "products") {
            filename = "products_sold_report.xlsx";
            dataToExport = searchedProductSold.map(p => ({
                "Product Name": p.name,
                "Quantity Sold": p.value,
                "Unit Price": productPriceMap.get(p.name) || 0,
                "Total Value": (productPriceMap.get(p.name) || 0) * p.value,
            }));
        }

        if (dataToExport.length === 0) {
            alert("No data to export.");
            return;
        }

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, filename);
    };

    if (loading) return <div className="p-6 text-center text-gray-500">Loading reports...</div>;
    if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            {/* Tabs */}
            <div className="flex justify-between items-center mb-4 border-b">
                <div className="flex space-x-2 md:space-x-4">
                    {["sales", "stock", "products"].map(t => (
                        <button 
                            key={t} 
                            onClick={() => setTab(t)} 
                            className={`px-4 py-3 rounded-t text-sm font-semibold md:text-base whitespace-nowrap transition-colors ${
                                tab === t 
                                ? "border-b-2 border-blue-600 text-blue-600" 
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            {t === 'sales' ? "Sales Report" : t === 'stock' ? "Stock Report" : "Products Sold"}
                        </button>
                    ))}
                </div>
                
                {/* --- NEW: Export Button --- */}
                <div className="relative">
                    <button
                        onClick={handleExport}
                        disabled={!canExport && !isSubscriptionLoading} // Disable if not subscribed (and not loading)
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed peer"
                    >
                        Export to Excel
                    </button>
                    {(!canExport && !isSubscriptionLoading) && ( // Show tooltip if not subscribed
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs text-center rounded-lg py-1 px-2 opacity-0 peer-hover:opacity-100 transition-opacity">
                            Upgrade to PRO to unlock exports.
                        </div>
                    )}
                </div>
            </div>

            {/* ... (rest of the component: Sales Report, Stock Report, Products Sold Report, Invoice Modal) ... */}
            {/* Sales Report */}
            {tab === "sales" && (
                <div className="bg-white shadow rounded-lg p-4 md:p-6 space-y-4">
                    <h2 className="text-xl font-bold text-gray-800">Sales Report</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatCard title="Total Sales" value={formatCurrency(totalSales)} color="blue" />
                        <StatCard title="Total Invoices" value={searchedInvoices.length} color="green" />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <label className="flex-1"><span className="text-xs font-semibold">From:</span><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border p-2 rounded w-full mt-1" /></label>
                        <label className="flex-1"><span className="text-xs font-semibold">To:</span><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border p-2 rounded w-full mt-1" /></label>
                    </div>
                    <input type="text" placeholder="Search by customer, invoice #, or product..." value={salesSearch} onChange={e => setSalesSearch(e.target.value)} className="border rounded p-2 w-full" />
                    
                    <ResponsiveDataView
                        isMobile={isMobile} data={searchedInvoices} noDataMessage="No invoices found for this period."
                        renderMobile={(inv) => (
                            <div key={inv.id} className="bg-white rounded shadow p-3 border text-sm cursor-pointer hover:bg-blue-50" onClick={() => setSelectedInvoice(inv)}>
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-blue-600 pr-2">{highlightText(inv.customer_name || "Walk-in", salesSearch)}</p>
                                    <p className="font-bold text-base whitespace-nowrap">{formatCurrency(inv.grand_total)}</p>
                                </div>
                                <p className="text-xs text-gray-500">{new Date(inv.invoice_date).toLocaleDateString()} - #{inv.number}</p>
                            </div>
                        )}
                        renderDesktop={() => (
                        <table className="w-full border-collapse text-sm">
                            <thead className="bg-gray-100">
                                <tr className="text-left">
                                    <th className="p-2 border-b">Date</th>
                                    <th className="p-2 border-b">Invoice #</th>
                                    <th className="p-2 border-b">Customer</th>
                                    <th className="p-2 border-b">Mobile</th>
                                    <th className="p-2 border-b text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {searchedInvoices.map(inv => (
                                    <tr key={inv.id} className="even:bg-gray-50 hover:bg-blue-50 cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                                        <td className="p-2 border-b">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                                        <td className="p-2 border-b text-blue-600 font-medium">{highlightText(String(inv.number), salesSearch)}</td>
                                        <td className="p-2 border-b">{highlightText(inv.customer_detail?.name || inv.customer_name || "Walk-in", salesSearch)}</td>
                                        <td className="p-2 border-b text-gray-600">
                                            {inv.customer_detail?.mobile || inv.customer_mobile || "N/A"}
                                        </td>
                                        <td className="p-2 border-b text-right font-medium">{formatCurrency(inv.grand_total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    />
                </div>
            )}

            {/* Stock Report */}
            {tab === "stock" && (
                 <div className="bg-white shadow rounded-lg p-4 md:p-6 space-y-4">
                    <h2 className="text-xl font-bold text-gray-800">Current Stock Report</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatCard title="Total Inventory Value" value={formatCurrency(totalStockValue)} color="purple" />
                        <StatCard title="Products In Stock" value={searchedStock.length} color="indigo" />
                    </div>
                    <div className="h-80 bg-gray-50 rounded p-2 border">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stockChartData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                                <XAxis dataKey="name" tick={isMobile ? false : { fontSize: 10, angle: -30, textAnchor: 'end' }} interval={0} height={50}/>
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip formatter={(value) => [value, 'Quantity']} />
                                <Legend verticalAlign="top" height={36}/>
                                <Bar dataKey="value" name="Current Stock" fill="#4f46e5" isAnimationActive={!isMobile} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <input type="text" placeholder="Search stock by name..." value={stockSearch} onChange={e => setStockSearch(e.target.value)} className="border rounded p-2 w-full" />
                    
                    <ResponsiveDataView
                        isMobile={isMobile} data={searchedStock.sort((a, b) => a.name.localeCompare(b.name))} noDataMessage="No stock found."
                        renderMobile={(p) => (
                            <div key={p.id} className="bg-white rounded shadow p-3 border text-sm">
                                <p className="font-bold">{highlightText(p.name, stockSearch)}</p>
                                <div className="flex justify-between items-center mt-1 text-xs">
                                    <p>Qty: <span className={Number(p.quantity) <= 5 ? "font-bold text-red-600" : "font-bold text-gray-700"}>{p.quantity}</span></p>
                                    <p>Value: <span className="font-bold text-gray-700">{formatCurrency(p.price * p.quantity)}</span></p>
                                </div>
                            </div>
                        )}
                        renderDesktop={() => (
                            <table className="w-full border-collapse text-sm">
                                <thead className="bg-gray-100"><tr className="text-left"><th className="p-2 border-b">Product</th><th className="p-2 border-b text-right">Quantity</th><th className="p-2 border-b text-right">Price</th><th className="p-2 border-b text-right">Total Value</th></tr></thead>
                                <tbody>{searchedStock.map(p => <tr key={p.id} className="even:bg-gray-50 hover:bg-blue-50">
                                    <td className="p-2 border-b">{highlightText(p.name, stockSearch)}</td>
                                    <td className={`p-2 border-b text-right ${Number(p.quantity) <= 5 ? "text-red-600 font-bold" : "font-medium text-gray-700"}`}>{p.quantity}</td>
                                    <td className="p-2 border-b text-right">{formatCurrency(p.price)}</td>
                                    <td className="p-2 border-b text-right font-medium text-gray-700">{formatCurrency(p.price * p.quantity)}</td>
                                </tr>)}</tbody>
                            </table>
                        )}
                    />
                </div>
            )}

            {/* Products Sold Report */}
            {tab === "products" && (
                <div className="bg-white shadow rounded-lg p-4 md:p-6 space-y-4">
                    <h2 className="text-xl font-bold text-gray-800">Products Sold Report</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard title="Total Quantity Sold" value={productSoldStats.totalQty} color="green" />
                        <StatCard title="Total Sales Amount" value={formatCurrency(productSoldStats.totalAmount)} color="blue" />
                        <StatCard title="Most Sold Product" value={productSoldStats.mostSold ? `${productSoldStats.mostSold.name} (${productSoldStats.mostSold.value})` : "N/A"} color="yellow" />
                    </div>
                     <div className="h-80 bg-gray-50 rounded p-2 border">
                        <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={searchedProductSold.sort((a, b) => b.value - a.value).slice(0, 15)} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                                <XAxis dataKey="name" tick={isMobile ? false : { fontSize: 10, angle: -30, textAnchor: 'end' }} interval={0} height={50}/>
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip formatter={(value) => [value, 'Quantity Sold']} />
                                 <Legend verticalAlign="top" height={36}/>
                                <Bar dataKey="value" name="Quantity Sold" fill="#10b981" isAnimationActive={!isMobile} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <input type="text" placeholder="Search products sold..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="border rounded p-2 w-full" />
                    
                    <ResponsiveDataView
                        isMobile={isMobile} data={searchedProductSold.sort((a,b)=>b.value - a.value)} noDataMessage="No products sold in this period."
                        renderMobile={(p,i) => {
                            const unitPrice = productPriceMap.get(p.name) || 0;
                            return (<div key={i} className="bg-white rounded shadow p-3 border text-sm">
                                <p className="font-bold">{highlightText(p.name, productSearch)}</p>
                                <div className="flex justify-between items-center mt-1 text-xs">
                                    <p>Sold: <span className="font-bold">{p.value}</span></p>
                                    <p>Amount: <span className="font-bold">{formatCurrency(p.value * unitPrice)}</span></p>
                                </div>
                            </div>)
                        }}
                        renderDesktop={() => (
                            <table className="w-full border-collapse text-sm">
                                <thead className="bg-gray-100"><tr className="text-left"><th className="p-2 border-b">Product</th><th className="p-2 border-b text-right">Qty Sold</th><th className="p-2 border-b text-right">Est. Price</th><th className="p-2 border-b text-right">Est. Total</th></tr></thead>
                                <tbody>{searchedProductSold.sort((a,b)=>b.value - a.value).map((p,i) => {
                                    const unitPrice = productPriceMap.get(p.name) || 0;
                                    return <tr key={p.name + i} className="even:bg-gray-50 hover:bg-blue-50">
                                                <td className="p-2 border-b">{highlightText(p.name, productSearch)}</td>
                                                <td className="p-2 border-b text-right font-medium">{p.value}</td>
                                                <td className="p-2 border-b text-right">{formatCurrency(unitPrice)}</td>
                                                <td className="p-2 border-b text-right font-medium">{formatCurrency(p.value * unitPrice)}</td>
                                           </tr>;
                                })}</tbody>
                            </table>
                        )}
                    />
                </div>
            )}
            
            {/* Invoice Modal */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-11/12 max-w-lg max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h2 className="text-lg font-bold">Invoice: {selectedInvoice.number}</h2>
                            <button className="text-gray-400 hover:text-red-600 font-bold text-2xl" onClick={() => setSelectedInvoice(null)}>&times;</button>
                        </div>
                        <div className="p-4 overflow-auto">
                            <div className="text-sm space-y-1 mb-4">
                                <p><strong>Customer:</strong> {selectedInvoice.customer_detail?.name || selectedInvoice.customer_name || "Walk-in"}</p>
                                <p><strong>Date:</strong> {new Date(selectedInvoice.invoice_date).toLocaleString()}</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-gray-200 text-xs">
                                    <thead className="bg-gray-100 text-left">
                                        <tr>
                                            <th className="p-2 border">Product</th>
                                            <th className="p-2 border text-right">Qty</th>
                                            <th className="p-2 border text-right">Price</th>
                                            <th className="p-2 border text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selectedInvoice.items || []).map((item, idx) => (
                                            <tr key={idx} className="even:bg-gray-50">
                                                <td className="p-2 border">{item.product_name}</td>
                                                <td className="p-2 border text-right">{item.qty}</td>
                                                <td className="p-2 border text-right">{formatCurrency(item.unit_price)}</td>
                                                <td className="p-2 border text-right font-medium">{formatCurrency(item.line_total || (item.qty * item.unit_price))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="font-bold bg-gray-100">
                                        <tr><td colSpan="3" className="p-2 border text-right">Subtotal</td><td className="p-2 border text-right">{formatCurrency(selectedInvoice.subtotal)}</td></tr>
                                        <tr><td colSpan="3" className="p-2 border text-right">Tax</td><td className="p-2 border text-right">{formatCurrency(selectedInvoice.tax_total)}</td></tr>
                                        <tr><td colSpan="3" className="p-2 border text-right">Grand Total</td><td className="p-2 border text-right">{formatCurrency(selectedInvoice.grand_total)}</td></tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
                            <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300" onClick={() => setSelectedInvoice(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
