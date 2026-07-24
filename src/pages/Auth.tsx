
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { login, register } from "@/lib/authApi";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Loader2,
  ArrowRight,
} from "lucide-react";

export type AuthMode = "login" | "register";

// ─── Password Strength ───────────────────────────────────────────
type StrengthLevel = "none" | "weak" | "medium" | "strong";

function getPasswordStrength(pw: string): StrengthLevel {
  if (!pw) return "none";
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^a-zA-Z0-9]/.test(pw)) score += 1;
  if (score <= 1) return "weak";
  if (score <= 3) return "medium";
  return "strong";
}

const strengthColors: Record<StrengthLevel, string> = {
  none: "bg-gray-200 dark:bg-gray-700",
  weak: "bg-red-500",
  medium: "bg-amber-500",
  strong: "bg-emerald-500",
};

const strengthLabels: Record<StrengthLevel, string> = {
  none: "",
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

// ─── Email Validation ────────────────────────────────────────────
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Component ───────────────────────────────────────────────────
export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility toggles (independent per field)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Checkboxes
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const emailRef = useRef<HTMLInputElement>(null);

  // Autofocus on mount & mode switch
  useEffect(() => {
    setTimeout(() => emailRef.current?.focus(), 100);
  }, [mode]);

  // ─── Validation ───────────────────────────────────────────────
  const emailError = useMemo(() => {
    if (!touched.email) return "";
    if (!email.trim()) return "Email is required";
    if (!isValidEmail(email.trim())) return "Please enter a valid email";
    return "";
  }, [email, touched.email]);

  const passwordError = useMemo(() => {
    if (!touched.password) return "";
    if (!password) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    return "";
  }, [password, touched.password]);

  const confirmPasswordError = useMemo(() => {
    if (mode !== "register" || !touched.confirmPassword) return "";
    if (!confirmPassword) return "Please confirm your password";
    if (confirmPassword !== password) return "Passwords do not match";
    return "";
  }, [confirmPassword, password, mode, touched.confirmPassword]);

  const nameError = useMemo(() => {
    if (mode !== "register" || !touched.name) return "";
    if (!name.trim()) return "Name is required";
    return "";
  }, [name, mode, touched.name]);

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password.trim()) return false;
    if (emailError) return false;
    if (passwordError) return false;
    if (mode === "register") {
      if (!name.trim()) return false;
      if (nameError) return false;
      if (!confirmPassword || confirmPasswordError) return false;
      if (!acceptTerms) return false;
    }
    return true;
  }, [email, password, emailError, passwordError, mode, name, nameError, confirmPassword, confirmPasswordError, acceptTerms]);

  // ─── Password Strength ────────────────────────────────────────
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  // ─── Blur handlers ────────────────────────────────────────────
  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // ─── Submit ───────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit || loading) return;

      // Mark all fields as touched
      setTouched({ email: true, password: true, name: true, confirmPassword: true });

      try {
        setLoading(true);
        toast.loading(mode === "login" ? "Signing in..." : "Creating account...");

        if (mode === "login") {
          await login(email.trim(), password);
        } else {
          await register(email.trim(), password, name.trim());
        }

        toast.dismiss();
        toast.success(mode === "login" ? "Welcome back!" : "Account created!");
        navigate("/");
      } catch (err) {
        toast.dismiss();
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [canSubmit, loading, mode, email, password, name, navigate]
  );

  // ─── Toggle Mode ─────────────────────────────────────────────
  const switchMode = useCallback(() => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setTouched({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, []);

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* ── Card ── */}
        <div className="bg-white dark:bg-gray-900 shadow-xl shadow-gray-200/50 dark:shadow-black/30 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300">
          {/* ── Branding ── */}
          <div className="px-8 pt-8 pb-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-500/20 mb-4">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
              {mode === "login"
                ? "Sign in to manage your invoices"
                : "Start invoicing in minutes"}
            </p>
          </div>

          {/* ── Divider ── */}
          <div className="px-8">
            <div className="border-t border-gray-100 dark:border-gray-800" />
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="px-8 pt-6 pb-4 space-y-5" noValidate>
            {/* Name (Register only) */}
            <div
              className="transition-all duration-300 ease-in-out"
              style={{
                maxHeight: mode === "register" ? "120px" : "0px",
                opacity: mode === "register" ? 1 : 0,
                overflow: "hidden",
                marginBottom: mode === "register" ? "0" : "-1.25rem",
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="name"
                    ref={mode === "register" ? emailRef : undefined}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => handleBlur("name")}
                    placeholder="John Doe"
                    autoComplete="name"
                    disabled={loading}
                    className="pl-10 h-11 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 transition-colors"
                    tabIndex={mode === "register" ? 0 : -1}
                  />
                </div>
                {nameError && touched.name && (
                  <p className="text-xs text-red-500 mt-1">{nameError}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  id="email"
                  ref={mode === "login" ? emailRef : undefined}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur("email")}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={loading}
                  className="pl-10 h-11 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 transition-colors"
                  tabIndex={0}
                />
              </div>
              {emailError && touched.email && (
                <p className="text-xs text-red-500 mt-1">{emailError}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur("password")}
                  placeholder="••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  disabled={loading}
                  className="pl-10 pr-10 h-11 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 transition-colors"
                  tabIndex={0}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordError && touched.password && (
                <p className="text-xs text-red-500 mt-1">{passwordError}</p>
              )}

              {/* Password Strength (Register) */}
              <div
                className="transition-all duration-300 ease-in-out"
                style={{
                  maxHeight: mode === "register" && password ? "60px" : "0px",
                  opacity: mode === "register" && password ? 1 : 0,
                  overflow: "hidden",
                }}
              >
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {["weak", "medium", "strong"].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          ["weak", "medium", "strong"].indexOf(level) <=
                          ["none", "weak", "medium", "strong"].indexOf(strength) - 1
                            ? strengthColors[strength]
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {strength !== "none" && (
                      <>Password strength: <span className="font-medium">{strengthLabels[strength]}</span></>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Confirm Password (Register only) */}
            <div
              className="transition-all duration-300 ease-in-out"
              style={{
                maxHeight: mode === "register" ? "120px" : "0px",
                opacity: mode === "register" ? 1 : 0,
                overflow: "hidden",
                marginBottom: mode === "register" ? "0" : "-1.25rem",
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => handleBlur("confirmPassword")}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={loading}
                    className="pl-10 pr-10 h-11 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 transition-colors"
                    tabIndex={mode === "register" ? 0 : -1}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {confirmPasswordError && touched.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{confirmPasswordError}</p>
                )}
              </div>
            </div>

            {/* Remember Me (Login) + Forgot Password */}
            <div className="flex items-center justify-between">
              {mode === "login" ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={loading}
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label htmlFor="remember" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                    Remember me
                  </Label>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="terms"
                    checked={acceptTerms}
                    onCheckedChange={(checked) => {
                      setAcceptTerms(checked === true);
                      setTouched((prev) => ({ ...prev, terms: true }));
                    }}
                    disabled={loading}
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                    I accept the{" "}
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
                      onClick={() => toast.info("Terms & Conditions page coming soon.")}
                    >
                      Terms & Conditions
                    </button>
                  </Label>
                </div>
              )}

              {mode === "login" && (
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2 transition-colors"
                  onClick={() => toast.info("Password reset coming soon.")}
                  tabIndex={-1}
                >
                  Forgot password?
                </button>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!canSubmit || loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none transition-all duration-200"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {mode === "login" ? "Sign in" : "Create account"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* ── Footer ── */}
          <div className="px-8 pb-6">
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={switchMode}
                  disabled={loading}
                  className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2 transition-colors"
                >
                  {mode === "login" ? "Create one" : "Sign in"}
                </button>
              </p>
            </div>

            {/* Back link */}
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => navigate("/")}
                disabled={loading}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                ← Back to home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
