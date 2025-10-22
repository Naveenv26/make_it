import React, { useState, useEffect } from "react";
import { getInvoices } from "../api/invoices";
import { getProducts } from "../api/products";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area } from "recharts";

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
        <div className="space-y-2">{data.map(renderMobile)}</div>
    ) : (
        <div className="overflow-x-auto rounded shadow">
            {renderDesktop()}
        </div>
    );
};


const formatCurrency = (val) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(val || 0));

function highlightText(text = "", query = "") {
    if (!query || typeof text !== "string") return text;
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
        regex.test(part) ? <mark key={i} className="bg-yellow-300 text-black rounded px-0.5">{part}</mark> : part
    );
}

export default function Reports() {
    const [tab, setTab] = useState("sales");
    const [invoices, setInvoices] = useState([]);
    const [products, setProducts] = useState([]);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [salesSearch, setSalesSearch] = useState("");
    const [stockSearch, setStockSearch] = useState("");
    const [productSearch, setProductSearch] = useState("");
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    const isMobile = useMediaQuery("(max-width: 640px)");

    useEffect(() => {
        const loadData = async () => {
            const invRes = await getInvoices();
            setInvoices(invRes?.data || invRes || []);
            const prodRes = await getProducts();
            setProducts(prodRes?.data || prodRes || []);
        };
        loadData();
    }, []);

    // Data filtering and calculation logic
    const filteredInvoices = Array.isArray(invoices) ? invoices.filter(inv => {
        if (!fromDate && !toDate) return true;
        const invDate = new Date(inv.invoice_date);
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate + "T23:59:59") : null;
        if (from && invDate < from) return false;
        if (to && invDate > to) return false;
        return true;
    }) : [];
    const totalSales = filteredInvoices.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0);
    const searchedInvoices = filteredInvoices.filter(inv => inv.customer_name?.toLowerCase().includes(salesSearch.toLowerCase()) || inv.number?.toLowerCase().includes(salesSearch.toLowerCase()) || (inv.items || []).some(it => it.product_name?.toLowerCase().includes(salesSearch.toLowerCase())));
    const searchedStock = Array.isArray(products) ? products.filter(p => p.name?.toLowerCase().includes(stockSearch.toLowerCase()) || p.unit?.toLowerCase().includes(stockSearch.toLowerCase())) : [];
    const stockChartData = searchedStock.map(p => ({ name: p.name, value: Number(p.quantity || 0) }));
    const totalStockValue = searchedStock.reduce((sum, p) => sum + Number(p.price || 0) * Number(p.quantity || 0), 0);
    const productSoldMap = {};
    filteredInvoices.forEach(inv => (inv.items || []).forEach(it => {
        const qty = Number(it.qty || it.quantity || 0);
        if (!productSoldMap[it.product_name]) productSoldMap[it.product_name] = 0;
        productSoldMap[it.product_name] += qty;
    }));
    const productSoldData = Object.entries(productSoldMap).map(([name, value]) => ({ name, value }));
    const searchedProductSold = productSoldData.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
    const totalProductQty = searchedProductSold.reduce((sum, p) => sum + p.value, 0);
    const totalProductAmount = searchedProductSold.reduce((sum, p) => {
        const unitPrice = products.find(prod => prod.name === p.name)?.price || 0;
        return sum + p.value * unitPrice;
    }, 0);
    const mostSoldProduct = productSoldData.length > 0 ? productSoldData.reduce((a, b) => a.value > b.value ? a : b) : null;

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto pb-32">
            {/* Tabs */}
            <div className="flex space-x-2 md:space-x-4 mb-4">
                {["sales", "stock", "products"].map(t => (
                    <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded text-sm font-semibold md:text-base whitespace-nowrap ${tab === t ? "bg-blue-600 text-white" : "bg-gray-200"}`}>
                        {t === 'sales' ? "Sales" : t === 'stock' ? "Stock" : "Products"}
                    </button>
                ))}
            </div>

            {/* Sales Report */}
            {tab === "sales" && <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex-1"><span className="text-xs font-semibold">From:</span><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border p-2 rounded w-full mt-1" /></label>
                    <label className="flex-1"><span className="text-xs font-semibold">To:</span><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border p-2 rounded w-full mt-1" /></label>
                </div>
                <input type="text" placeholder="Search by customer or invoice..." value={salesSearch} onChange={e => setSalesSearch(e.target.value)} className="border rounded p-2 w-full" />
                <ResponsiveDataView
                    isMobile={isMobile} data={searchedInvoices} noDataMessage="No invoices found"
                    renderMobile={(inv) => (
                        <div key={inv.id} className="bg-white rounded shadow p-3 border text-sm cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                            <div className="flex justify-between items-start"><p className="font-bold text-blue-600 pr-2">{highlightText(inv.customer_name || "Walk-in", salesSearch)}</p><p className="font-bold text-base whitespace-nowrap">{formatCurrency(inv.grand_total)}</p></div>
                            <p className="text-xs text-gray-500">{new Date(inv.invoice_date).toLocaleDateString()}</p>
                        </div>
                    )}
                    renderDesktop={() => (
                        <table className="w-full border text-sm">
                            <thead className="bg-blue-600 text-white"><tr><th className="p-2 border">Date</th><th className="p-2 border">Invoice No</th><th className="p-2 border">Customer</th><th className="p-2 border text-right">Total</th></tr></thead>
                            <tbody>{searchedInvoices.map(inv => (<tr key={inv.id} className="even:bg-gray-50 hover:bg-blue-50"><td className="p-2 border">{new Date(inv.invoice_date).toLocaleDateString()}</td><td className="p-2 border text-blue-600 hover:underline cursor-pointer" onClick={() => setSelectedInvoice(inv)}>{highlightText(inv.number, salesSearch)}</td><td className="p-2 border">{highlightText(inv.customer_name || "Walk-in", salesSearch)}</td><td className="p-2 border text-right">{formatCurrency(inv.grand_total)}</td></tr>))}</tbody>
                        </table>
                    )}
                />
            </div>}

            {/* Stock Report */}
            {tab === "stock" && <div className="space-y-4">
                 <div className="h-80 bg-white rounded shadow p-2">
                    <ResponsiveContainer width="100%" height="100%"><BarChart data={stockChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}><XAxis dataKey="name" tick={isMobile ? false : { fontSize: 10 }} interval={0} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" fill="#2563eb" /></BarChart></ResponsiveContainer>
                </div>
                <input type="text" placeholder="Search stock..." value={stockSearch} onChange={e => setStockSearch(e.target.value)} className="border rounded p-2 w-full" />
                <ResponsiveDataView
                    isMobile={isMobile} data={searchedStock.sort((a, b) => a.name.localeCompare(b.name))} noDataMessage="No stock found"
                    renderMobile={(p) => (
                        <div key={p.id} className="bg-white rounded shadow p-3 border text-sm"><p className="font-bold">{highlightText(p.name, stockSearch)}</p><div className="flex justify-between items-center mt-1 text-xs"><p>Qty: <span className={Number(p.quantity) <= 5 ? "font-bold text-red-600" : "font-bold"}>{p.quantity}</span></p><p>Value: <span className="font-bold">{formatCurrency(p.price * p.quantity)}</span></p></div></div>
                    )}
                    renderDesktop={() => (
                        <table className="w-full border text-sm">
                            <thead className="bg-blue-600 text-white"><tr><th className="p-2 border">Product</th><th className="p-2 border">Quantity</th><th className="p-2 border">Price</th><th className="p-2 border">Value</th></tr></thead>
                            <tbody>{searchedStock.map(p => <tr key={p.id} className="even:bg-gray-50 hover:bg-blue-50"><td className="p-2 border">{highlightText(p.name, stockSearch)}</td><td className={`p-2 border ${Number(p.quantity) <= 5 ? "text-red-600 font-bold" : ""}`}>{p.quantity}</td><td className="p-2 border">{formatCurrency(p.price)}</td><td className="p-2 border">{formatCurrency(p.price * p.quantity)}</td></tr>)}</tbody>
                            <tfoot><tr className="font-bold bg-blue-100 text-blue-800"><td colSpan="3" className="p-2 border text-right">Total Inventory Value</td><td className="p-2 border">{formatCurrency(totalStockValue)}</td></tr></tfoot>
                        </table>
                    )}
                />
            </div>}

            {/* Products Sold Report */}
            {tab === "products" && <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-100 p-3 rounded shadow text-center"><h3 className="font-bold text-blue-700 text-xs">Total Sold</h3><p className="text-xl font-bold text-blue-900">{totalProductQty}</p></div>
                    <div className="bg-green-100 p-3 rounded shadow text-center"><h3 className="font-bold text-green-700 text-xs">Most Sold</h3><p className="text-sm font-bold text-green-900 truncate">{mostSoldProduct ? `${mostSoldProduct.name} (${mostSoldProduct.value})` : "N/A"}</p></div>
                </div>
                <div className="h-80 bg-white rounded shadow p-2">
                     <ResponsiveContainer width="100%" height="100%"><BarChart data={searchedProductSold.sort((a, b) => b.value - a.value).slice(0, 15)} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}><XAxis dataKey="name" tick={isMobile ? false : { fontSize: 10 }} interval={0} /><YAxis tick={{ fontSize: 10 }}/><Tooltip /><Bar dataKey="value" fill="#16a34a" /></BarChart></ResponsiveContainer>
                </div>
                 <input type="text" placeholder="Search products sold..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="border rounded p-2 w-full" />
                 <ResponsiveDataView
                    isMobile={isMobile} data={searchedProductSold.sort((a,b)=>b.value - a.value)} noDataMessage="No products sold"
                    renderMobile={(p,i) => {
                        const unitPrice = products.find(prod => prod.name === p.name)?.price || 0;
                        return (<div key={i} className="bg-white rounded shadow p-3 border text-sm"><p className="font-bold">{highlightText(p.name, productSearch)}</p><div className="flex justify-between items-center mt-1 text-xs"><p>Sold: <span className="font-bold">{p.value}</span></p><p>Amount: <span className="font-bold">{formatCurrency(p.value * unitPrice)}</span></p></div></div>)
                    }}
                    renderDesktop={() => (
                        <table className="w-full border text-sm">
                            <thead className="bg-blue-600 text-white"><tr><th className="p-2 border">Product</th><th className="p-2 border text-right">Qty Sold</th><th className="p-2 border text-right">Unit Price</th><th className="p-2 border text-right">Amount</th></tr></thead>
                            <tbody>{searchedProductSold.map((p,i) => {const unitPrice = products.find(prod => prod.name === p.name)?.price || 0; return <tr key={i} className="even:bg-gray-50 hover:bg-blue-50"><td className="p-2 border">{highlightText(p.name, productSearch)}</td><td className="p-2 border text-right">{p.value}</td><td className="p-2 border text-right">{formatCurrency(unitPrice)}</td><td className="p-2 border text-right">{formatCurrency(p.value * unitPrice)}</td></tr>})}</tbody>
                             <tfoot><tr className="font-bold bg-blue-100 text-blue-800"><td colSpan="3" className="p-2 border text-right">Total</td><td className="p-2 border text-right">{formatCurrency(totalProductAmount)}</td></tr></tfoot>
                        </table>
                    )}
                 />
            </div>}
            
            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-blue-100 border-t border-blue-300 shadow-inner p-2 text-center md:text-right font-bold text-blue-800 z-40 text-xs">
                {tab === "sales" && <>Grand Total Sales: {formatCurrency(totalSales)}</>}
                {tab === "stock" && <>Total Inventory Value: {formatCurrency(totalStockValue)}</>}
                {tab === "products" && <div className="flex flex-col sm:flex-row justify-center sm:gap-4"><span>Total Qty: {totalProductQty}</span><span>Total Amount: {formatCurrency(totalProductAmount)}</span></div>}
            </div>

            {/* Invoice Modal */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded shadow-lg w-11/12 max-w-lg p-4 relative">
                        <button className="absolute top-2 right-2 text-red-600 font-bold text-2xl" onClick={() => setSelectedInvoice(null)}>&times;</button>
                        <h2 className="text-lg font-bold mb-2">Invoice: {selectedInvoice.number}</h2>
                        <div className="text-sm space-y-1 mb-3"><p><strong>Customer:</strong> {selectedInvoice.customer_name || "Walk-in"}</p><p><strong>Date:</strong> {new Date(selectedInvoice.invoice_date).toLocaleDateString()}</p></div>
                        <div className="overflow-x-auto"><table className="w-full border border-gray-200 text-xs"><thead className="bg-gray-100"><tr><th className="p-2 border">Product</th><th className="p-2 border text-right">Qty</th><th className="p-2 border text-right">Price</th><th className="p-2 border text-right">Total</th></tr></thead><tbody>
                            {(selectedInvoice.items || []).map((item, idx) => (<tr key={idx} className="even:bg-gray-50"><td className="p-2 border">{item.product_name}</td><td className="p-2 border text-right">{item.qty || item.quantity}</td><td className="p-2 border text-right">{formatCurrency(item.unit_price)}</td><td className="p-2 border text-right">{formatCurrency((item.qty || item.quantity) * (item.unit_price || 0))}</td></tr>))}
                        </tbody><tfoot><tr className="font-bold bg-gray-100"><td colSpan="3" className="p-2 border text-right">Grand Total</td><td className="p-2 border text-right">{formatCurrency(selectedInvoice.grand_total)}</td></tr></tfoot></table></div>
                    </div>
                </div>
            )}
        </div>
    );
}