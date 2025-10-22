import React, { useState, useEffect, useRef } from "react";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../api/products";

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
        return <div className="text-center p-8 text-slate-500">{noDataMessage}</div>;
    }
    return isMobile ? (
        <div className="space-y-3">{data.map(renderMobile)}</div>
    ) : (
        <div className="overflow-x-auto">
            {renderDesktop()}
        </div>
    );
};

export default function Stock() {
    const [products, setProducts] = useState([]);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: "", unit: "pcs", price: "", quantity: "", tax_rate: "0" });
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState("name");
    const [sortDir, setSortDir] = useState("asc");
    const [lowStockThreshold, setLowStockThreshold] = useState(5);
    const [toast, setToast] = useState(null);
    const [countdown, setCountdown] = useState(5);
    const lastDeleted = useRef(null);

    const isMobile = useMediaQuery("(max-width: 768px)");

    useEffect(() => { load() }, []);

    const load = async () => {
        try {
            const res = await getProducts();
            const list = res?.data ?? res;
            setProducts(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error("Failed to load products:", err);
            setProducts([]);
        }
    };

    const save = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await updateProduct(editing.id, form);
            } else {
                await createProduct(form);
            }
            closeModal();
            await load();
        } catch (err) {
            console.error("Save failed:", err.response?.data || err);
            alert("Failed to save product");
        }
    };

    const handleDelete = async (p) => {
        lastDeleted.current = p;
        setProducts(prev => prev.filter(x => x.id !== p.id)); // Optimistic UI remove

        setToast({
            msg: `Deleted "${p.name}"`,
            action: async () => {
                try {
                    const { id, created_at, updated_at, ...payload } = lastDeleted.current;
                    await createProduct(payload);
                    await load();
                } catch (err) {
                    console.error("Undo failed:", err);
                    alert("Undo failed to restore product.");
                }
            },
        });

        try {
            await deleteProduct(p.id);
        } catch (err) {
            console.error("Delete API call failed:", err);
            setToast(null); // Remove undo option if server fails
            alert("Failed to delete product from server.");
            await load(); // Re-sync with server
        }
    };

    // ========== THIS IS THE CORRECTED FUNCTION ==========
    const adjustQty = async (p, change) => {
        const currentQty = Number(p.quantity || 0);
        const newQty = currentQty + Number(change);
        if (newQty < 0) return;

        const updatedProduct = { ...p, quantity: newQty };
        const backup = [...products];
        
        // Optimistic UI update
        setProducts(prev => prev.map(x => (x.id === p.id ? updatedProduct : x)));

        try {
          // THE FIX: Send the entire product object for the update, not just the quantity.
          // We destructure `id` out of the payload as it's usually not needed in the request body.
          const { id, ...payload } = updatedProduct;
          await updateProduct(p.id, payload);

        } catch (err) {
          console.error("Quantity update failed:", err.response?.data || err);
          setProducts(backup); // Revert UI on failure
          alert("Failed to update quantity. Reverted.");
        }
    };

    const openModal = (product = null) => {
        setEditing(product);
        setForm(product ? {
            name: product.name ?? "",
            unit: product.unit ?? "pcs",
            price: product.price ?? "",
            quantity: product.quantity ?? "",
            tax_rate: product.tax_rate ?? product.gst ?? "0",
        } : { name: "", unit: "pcs", price: "", quantity: "", tax_rate: "0" });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditing(null);
    };

    useEffect(() => {
        if (!toast) return;
        setCountdown(5);
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setToast(null);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [toast]);

    const filtered = products.filter(p => (p.name || "").toString().toLowerCase().includes(search.toLowerCase()));

    const sorted = [...filtered].sort((a, b) => {
        if (!sortKey) return 0;
        let v1 = a[sortKey], v2 = b[sortKey];
        if (typeof v1 === 'string') {
            return sortDir === 'asc' ? v1.localeCompare(v2) : v2.localeCompare(v1);
        }
        return sortDir === 'asc' ? (v1 || 0) - (v2 || 0) : (v2 || 0) - (v1 || 0);
    });

    const toggleSort = (key) => {
        if (sortKey === key) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const handleEnter = (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const formEls = Array.from(e.target.form.querySelectorAll("input, select"));
        const index = formEls.indexOf(e.target);
        if (index < formEls.length - 1) {
            formEls[index + 1].focus();
        } else {
            document.getElementById('modal-save-button')?.click();
        }
    };
    
    const getRowClass = (p) => Number(p.quantity) === 0 ? "bg-rose-50/80" : Number(p.quantity) <= lowStockThreshold ? "bg-amber-50/80" : "bg-white";

    return (
        <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
            {/* Stats */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow"><div className="text-slate-500 text-xs md:text-sm">Total Inventory Value</div><div className="mt-2 text-xl md:text-3xl font-extrabold text-emerald-700">₹{products.reduce((s, p) => s + (p.price || 0) * (p.quantity || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
                <div className="bg-white p-4 rounded-xl shadow"><div className="text-slate-500 text-xs md:text-sm">Low Stock Items</div><div className="mt-2 text-xl md:text-3xl font-extrabold text-amber-600">{products.filter(p => p.quantity > 0 && p.quantity <= lowStockThreshold).length}</div></div>
                <div className="bg-white p-4 rounded-xl shadow"><div className="text-slate-500 text-xs md:text-sm">Out of Stock</div><div className="mt-2 text-xl md:text-3xl font-extrabold text-rose-700">{products.filter(p => p.quantity == 0).length}</div></div>
                <div className="bg-white p-4 rounded-xl shadow"><div className="text-slate-500 text-xs md:text-sm">Low Stock Trigger</div><input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(Number(e.target.value))} className="mt-2 w-full border border-slate-300 px-2 py-1 rounded-lg text-sm" min="1"/></div>
            </section>

            {/* Products Table / Cards */}
            <section className="bg-white shadow rounded-xl p-4 md:p-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-3">
                    <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="border border-slate-300 px-3 py-2 rounded-lg text-sm w-full md:w-64" />
                    <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg shadow text-sm font-medium w-full md:w-auto">➕ Add Product</button>
                </div>

                <ResponsiveDataView
                    isMobile={isMobile}
                    data={sorted}
                    noDataMessage="No products found. Add one to get started!"
                    renderMobile={(p) => (
                        <div key={p.id} className={`p-4 rounded-lg border ${getRowClass(p)}`}>
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-slate-800">{p.name}</span>
                                <span className="font-semibold text-slate-600">₹{p.price}</span>
                            </div>
                            <div className="flex justify-between items-center mt-3">
                                <span className="text-sm font-medium text-slate-500">Qty: <span className="font-bold text-slate-800">{p.quantity}</span></span>
                                <div className="flex items-center justify-center space-x-1">
                                    <button onClick={() => adjustQty(p, -1)} className="bg-slate-200 h-8 w-8 rounded-md font-bold hover:bg-slate-300 disabled:opacity-50" disabled={p.quantity <= 0}>-</button>
                                    <button onClick={() => adjustQty(p, 1)} className="bg-slate-200 h-8 w-8 rounded-md font-bold hover:bg-slate-300">+</button>
                                    <button onClick={() => openModal(p)} className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-md">✏️</button>
                                    <button onClick={() => handleDelete(p)} className="text-slate-500 hover:text-rose-600 p-1.5 rounded-md">🗑️</button>
                                </div>
                            </div>
                        </div>
                    )}
                    renderDesktop={() => (
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600"><tr>
                                <th className="p-3 text-left font-medium cursor-pointer" onClick={() => toggleSort("name")}>Product Name {sortKey === 'name' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                                <th className="p-3 text-center font-medium cursor-pointer" onClick={() => toggleSort("quantity")}>Quantity {sortKey === 'quantity' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                                <th className="p-3 text-right font-medium cursor-pointer" onClick={() => toggleSort("price")}>Price {sortKey === 'price' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                                <th className="p-3 text-center font-medium">GST %</th>
                                <th className="p-3 text-center font-medium">Actions</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-100">{sorted.map(p => (
                                <tr key={p.id} className={getRowClass(p)}>
                                    <td className="p-3 font-medium">{p.name}</td>
                                    <td className="p-3 text-center font-semibold">{p.quantity}</td>
                                    <td className="p-3 text-right">₹{Number(p.price || 0).toLocaleString('en-IN')}</td>
                                    <td className="p-3 text-center">{p.tax_rate ?? p.gst}%</td>
                                    <td className="p-3"><div className="flex items-center justify-center space-x-1">
                                        <button onClick={() => adjustQty(p, -1)} className="bg-slate-200 h-7 w-7 rounded-md font-bold hover:bg-slate-300 disabled:opacity-50" disabled={p.quantity <= 0}>-</button>
                                        <button onClick={() => adjustQty(p, 1)} className="bg-slate-200 h-7 w-7 rounded-md font-bold hover:bg-slate-300">+</button>
                                        <button onClick={() => openModal(p)} className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-md">✏️</button>
                                        <button onClick={() => handleDelete(p)} className="text-slate-500 hover:text-rose-600 p-1.5 rounded-md">🗑️</button>
                                    </div></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    )}
                />
            </section>

            {/* Modal */}
            {showModal && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                    <div className="p-6 border-b"><h3 className="text-xl font-bold text-slate-800">{editing ? "Edit Product" : "Add New Product"}</h3></div>
                    <form onSubmit={save} className="p-6 space-y-4">
                        <div><label className="block text-sm font-medium text-slate-700">Product Name</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} onKeyDown={handleEnter} className="mt-1 w-full border border-slate-300 px-3 py-2 rounded-lg text-sm" required /></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-slate-700">Quantity</label><input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} onKeyDown={handleEnter} className="mt-1 w-full border border-slate-300 px-3 py-2 rounded-lg text-sm" required min="0" /></div>
                            <div><label className="block text-sm font-medium text-slate-700">Price (₹)</label><input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} onKeyDown={handleEnter} className="mt-1 w-full border border-slate-300 px-3 py-2 rounded-lg text-sm" required min="0" step="0.01" /></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-slate-700">GST %</label><select value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: e.target.value })} onKeyDown={handleEnter} className="mt-1 w-full border border-slate-300 px-3 py-2 rounded-lg text-sm"><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option></select></div>
                            <div><label className="block text-sm font-medium text-slate-700">Unit</label><select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} onKeyDown={handleEnter} className="mt-1 w-full border border-slate-300 px-3 py-2 rounded-lg text-sm"><option value="pcs">pcs</option><option value="kg">kg</option><option value="ltr">ltr</option><option value="box">box</option></select></div>
                        </div>
                    </form>
                    <div className="p-4 bg-slate-50 rounded-b-2xl flex justify-end items-center gap-3">
                        <button onClick={closeModal} type="button" className="text-sm bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-100">Cancel</button>
                        <button id="modal-save-button" onClick={save} type="button" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Save Product</button>
                    </div>
                </div>
            </div>}

            {/* Toast */}
            {toast && <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-4 w-[calc(100%-2rem)] max-w-sm">
                <div className="flex-1"><div className="font-medium text-sm">{toast.msg}</div><div className="text-xs text-slate-300">Undo in {countdown}s</div></div>
                <button onClick={async () => { await toast.action(); setToast(null); }} className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm">Undo</button>
            </div>}
        </main>
    );
}