import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, register } from "@/lib/authApi";

export type AuthMode = "login" | "register";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password.trim()) return false;
    if (mode === "register" && !name.trim()) return false;
    return true;
  }, [email, password, mode, name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setLoading(true);
      toast.loading(mode === "login" ? "Logging in..." : "Registering...");

      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name);
      }

      toast.success(mode === "login" ? "Logged in" : "Registered");
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{mode === "login" ? "Login" : "Register"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? "Access your invoices" : "Create your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                disabled={loading}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={!canSubmit || loading}>
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
          </Button>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              className="text-sm text-primary underline"
              disabled={loading}
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Create account" : "Have an account? Login"}
            </button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/")}
              disabled={loading}
            >
              Back
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

