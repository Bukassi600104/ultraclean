"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function ManagerLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginValues) {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError("Authentication is not configured.");
      setIsLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      setError("Invalid email or password. Please try again.");
      setIsLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "admin") {
        router.push("/sales");
      } else if (profile?.role === "manager") {
        router.push("/sales");
      } else {
        setError("You do not have access to the Farm Portal.");
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }
    }

    router.refresh();
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#F9F7F2" }}
    >
      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Header */}
        <div
          className="rounded-t-2xl px-8 py-7 text-center"
          style={{ backgroundColor: "#1B4332" }}
        >
          <div className="flex justify-center mb-4">
            <div className="rounded-xl bg-white px-4 py-2 inline-flex">
              <Image
                src="/primefield-logo.png"
                alt="Primefield Agri-Business"
                width={130}
                height={44}
                className="object-contain"
                priority
              />
            </div>
          </div>
          <h1 className="text-white font-bold text-xl tracking-tight">
            Farm Manager Portal
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Sign in to record farm activity
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-b-2xl px-8 py-7 shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@primefield.ng"
                {...register("email")}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-[#11d469] focus:ring-2 focus:ring-[#11d469]/20"
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  {...register("password")}
                  className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 pr-10 text-sm outline-none transition-all focus:border-[#11d469] focus:ring-2 focus:ring-[#11d469]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all disabled:opacity-60 active:scale-[0.98] mt-2"
              style={{ backgroundColor: "#1B4332" }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In to Farm Portal"
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-5">
            Primefield Agri-Business Limited · Ibadan, Nigeria
          </p>
        </div>
      </div>
    </div>
  );
}
