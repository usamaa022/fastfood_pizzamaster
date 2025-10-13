"use client";
import { useState } from "react";
import { FaUtensils, FaLock, FaEnvelope, FaEye, FaEyeSlash, FaExclamationCircle } from "react-icons/fa";
import toast from "react-hot-toast";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
      toast.success("Login successful!");
    } catch (err) {
      let message = "Login failed. ";
      if (err.code === "auth/invalid-email") {
        message += "Invalid email address.";
      } else if (err.code === "auth/wrong-password") {
        message += "Incorrect password.";
      } else if (err.code === "auth/user-not-found") {
        message += "User not found.";
      } else {
        message += "Please try again.";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <FaUtensils className="text-5xl text-orange-600 mb-2" />
          <h1 className="text-2xl font-bold text-gray-800">Pizza Master</h1>
          <p className="text-gray-600">Login Page</p>
        </div>
        {error && (
          <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg flex items-center space-x-2">
            <FaExclamationCircle className="text-red-600" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-800 font-medium mb-1">Email</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-10 text-black"
                placeholder="email@gmail.com"
              />
              <FaEnvelope className="absolute left-3 top-3 text-gray-500" />
            </div>
          </div>
          <div>
            <label className="block text-gray-800 font-medium mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-10 text-black"
                placeholder="••••••"
              />
              <FaLock className="absolute left-3 top-3 text-gray-500" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-500"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-lg"
            }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
