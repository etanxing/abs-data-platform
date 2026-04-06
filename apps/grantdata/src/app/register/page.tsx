"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api";
import { setToken, isLoggedIn } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) router.replace("/dashboard");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const { token } = await register(email, password, name);
      setToken(token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-brand-700">GrantData</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Create your account</h1>
          <p className="text-gray-500 mt-2">
            7-day free trial, no credit card required.{" "}
            <Link href="/login" className="text-brand-600 hover:underline font-medium">
              Already have an account?
            </Link>
          </p>
        </div>

        <div className="bg-white shadow-sm rounded-2xl p-8 border border-gray-200">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="you@organisation.org.au"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="Min 8 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>

            <p className="text-xs text-center text-gray-400">
              By registering you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
