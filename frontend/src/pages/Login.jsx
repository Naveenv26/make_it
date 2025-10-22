// src/pages/Login.jsx
import React, { useState, useEffect } from "react";
import {
  login,
  registerUser,
  forgotPassword,
  resetPassword,
} from "../api/auth";

export default function Login() {
  const [view, setView] = useState("login"); // login | signup | forgot
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Form data
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    shopName: "",
    shopAddress: "",
    mobile: "",
    gstin: "",
    otp: "",
    newPassword: "",
  });

  // Password validation
  const passwordValid =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(
      form.password
    );

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // ---------- LOGIN ----------
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(form.email, form.password);
      window.location.href = "/dashboard";
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- SIGNUP ----------
  const handleSignupStep1 = (e) => {
    e.preventDefault();
    if (!passwordValid) {
      setError(
        "Password must have 8+ characters, include a letter, number & symbol."
      );
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSignupStep2 = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await registerUser(form);
      setMessage("Account created! You can log in now.");
      setView("login");
    } catch (err) {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- FORGOT PASSWORD ----------
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(form.email);
      setMessage("OTP sent to your email!");
      setStep(2);
    } catch {
      setError("Email not found.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(form.email, form.otp, form.newPassword);
      setMessage("Password reset successful!");
      setView("login");
    } catch {
      setError("Invalid OTP or request expired.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- UI ----------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 p-4">
      <div className="w-full max-w-md backdrop-blur-lg bg-white/20 border border-white/30 shadow-2xl rounded-2xl p-8 text-white">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold drop-shadow-lg">🛍️ SmartBill</h1>
          <p className="text-sm opacity-80 mt-2">
            {view === "login"
              ? "Welcome back! Log in to your shop."
              : view === "signup"
              ? "Create your shop account."
              : "Reset your password securely."}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 text-red-800 bg-red-100 rounded-lg text-center">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 text-green-800 bg-green-100 rounded-lg text-center">
            {message}
          </div>
        )}

        {/* LOGIN */}
        {view === "login" && (
          <form onSubmit={handleLogin}>
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              className="w-full mb-4 px-4 py-3 rounded-lg bg-white/20 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white"
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              className="w-full mb-4 px-4 py-3 rounded-lg bg-white/20 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-white text-indigo-600 font-semibold hover:bg-indigo-50 transition"
            >
              {loading ? "Signing In..." : "Log In"}
            </button>
            <div className="mt-4 text-sm text-center opacity-90">
              <button
                onClick={() => setView("forgot")}
                type="button"
                className="underline hover:text-white transition"
              >
                Forgot Password?
              </button>
              <p className="mt-3">
                Don’t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setView("signup");
                    setStep(1);
                  }}
                  className="font-semibold underline hover:text-white"
                >
                  Sign up
                </button>
              </p>
            </div>
          </form>
        )}

        {/* SIGNUP */}
        {view === "signup" && (
          <>
            {step === 1 && (
              <form onSubmit={handleSignupStep1}>
                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full mb-4 px-4 py-3 rounded-lg bg-white/20 border border-white/30 focus:ring-2 focus:ring-white"
                  required
                />
                <input
                  name="password"
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full mb-2 px-4 py-3 rounded-lg bg-white/20 border border-white/30 focus:ring-2 focus:ring-white"
                  required
                />
                <p
                  className={`text-xs ${
                    passwordValid ? "text-green-300" : "text-red-200"
                  }`}
                >
                  Must include letter, number & symbol (min 8 chars)
                </p>
                <button
                  type="submit"
                  className="w-full mt-6 py-3 rounded-lg bg-white text-indigo-600 font-semibold hover:bg-indigo-50 transition"
                >
                  Continue
                </button>
                <p className="text-center text-sm opacity-80 mt-3">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setView("login")}
                    className="underline hover:text-white"
                  >
                    Log in
                  </button>
                </p>
              </form>
            )}
            {step === 2 && (
              <form onSubmit={handleSignupStep2}>
                <input
                  name="shopName"
                  placeholder="Shop Name"
                  value={form.shopName}
                  onChange={handleChange}
                  className="w-full mb-3 px-4 py-3 rounded-lg bg-white/20 border border-white/30 focus:ring-2 focus:ring-white"
                  required
                />
                <input
                  name="shopAddress"
                  placeholder="Shop Address"
                  value={form.shopAddress}
                  onChange={handleChange}
                  className="w-full mb-3 px-4 py-3 rounded-lg bg-white/20 border border-white/30 focus:ring-2 focus:ring-white"
                  required
                />
                <input
                  name="mobile"
                  placeholder="Mobile Number"
                  value={form.mobile}
                  onChange={handleChange}
                  className="w-full mb-3 px-4 py-3 rounded-lg bg-white/20 border border-white/30 focus:ring-2 focus:ring-white"
                  required
                />
                <input
                  name="gstin"
                  placeholder="GSTIN (Optional)"
                  value={form.gstin}
                  onChange={handleChange}
                  className="w-full mb-4 px-4 py-3 rounded-lg bg-white/20 border border-white/30 focus:ring-2 focus:ring-white"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/2 py-3 rounded-lg border border-white/40 bg-transparent hover:bg-white/10 transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-1/2 py-3 rounded-lg bg-white text-indigo-600 font-semibold hover:bg-indigo-50 transition"
                  >
                    {loading ? "Creating..." : "Finish"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* FORGOT PASSWORD */}
        {view === "forgot" && (
          <>
            {step === 1 && (
              <form onSubmit={handleSendOTP}>
                <input
                  name="email"
                  type="email"
                  placeholder="Enter your registered email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full mb-4 px-4 py-3 rounded-lg bg-white/20 border border-white/30 focus:ring-2 focus:ring-white"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-3 rounded-lg bg-white text-indigo-600 font-semibold hover:bg-indigo-50 transition"
                >
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
                <p className="text-center text-sm opacity-80 mt-3">
                  Remember your password?{" "}
                  <button
                    type="button"
                    onClick={() => setView("login")}
                    className="underline hover:text-white"
                  >
                    Back to Login
                  </button>
                </p>
              </form>
            )}
            {step === 2 && (
              <form onSubmit={handleResetPassword}>
                <input
                  name="otp"
                  placeholder="Enter OTP"
                  value={form.otp}
                  onChange={handleChange}
                  className="w-full mb-4 px-4 py-3 rounded-lg bg-white/20 border border-white/30 focus:ring-2 focus:ring-white"
                  required
                />
                <input
                  name="newPassword"
                  type="password"
                  placeholder="New Password"
                  value={form.newPassword}
                  onChange={handleChange}
                  className="w-full mb-4 px-4 py-3 rounded-lg bg-white/20 border border-white/30 focus:ring-2 focus:ring-white"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-3 rounded-lg bg-white text-indigo-600 font-semibold hover:bg-indigo-50 transition"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
