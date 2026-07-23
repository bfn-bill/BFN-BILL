import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "অ্যাডমিন লগইন" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const email = `${username.trim().toLowerCase()}@admin.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error("ইউজারনেম বা পাসওয়ার্ড ভুল");
    navigate({ to: "/admin" });
  };

  return (
    <div className="min-h-screen bg-[#0f2436] flex items-center justify-center p-4">
      <div className="bg-[#0f2436] rounded-2xl shadow-2xl shadow-[#a78bfa]/20 border border-[#a78bfa]/20 max-w-md w-full p-8">
        <div className="flex flex-col items-center gap-3 mb-6">
          <img src={logo} alt="BFN logo" className="w-16 h-16 rounded-full object-cover ring-2 ring-[#a78bfa]/40" />
          <div className="flex items-center gap-2 text-[#a78bfa]">
            <ShieldCheck className="w-6 h-6" />
            <h1 className="text-xl font-bold">অ্যাডমিন লগইন</h1>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="username">ইউজারনেম</Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1 h-11"
            />
          </div>
          <div>
            <Label htmlFor="password">পাসওয়ার্ড</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 h-11"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 bg-[#4ade80] text-[#08111a] font-semibold hover:bg-[#a78bfa] hover:text-[#08111a]">
            {loading ? "..." : "লগইন করুন"}
          </Button>
        </form>
        <Link to="/" className="block text-center text-sm text-muted-foreground mt-6 hover:underline">
          হোমে ফিরে যান
        </Link>
      </div>
    </div>
  );
}
