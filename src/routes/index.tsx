import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { type Package } from "@/lib/packages";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, ShieldCheck, ArrowLeft, PowerOff } from "lucide-react";
import logo from "@/assets/logo.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BFN — বিল পেমেন্ট" },
      { name: "description", content: "আপনার ইউজার আইডি দিয়ে সহজেই ইন্টারনেট বিল পরিশোধ করুন। বিকাশ ও নগদে পেমেন্ট।" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [siteEnabled, setSiteEnabled] = useState<boolean | null>(null);
  const [packages, setPackages] = useState<Package[] | null>(null);

  useEffect(() => {
    const fetchStatus = () => {
      supabase.from("site_settings").select("site_enabled").eq("id", 1).maybeSingle()
        .then(({ data }) => setSiteEnabled(data?.site_enabled ?? true));
    };
    const fetchPackages = () => {
      supabase.from("packages").select("id, name, speed, price, description, sort_order, enabled")
        .eq("enabled", true).order("sort_order")
        .then(({ data }) => setPackages((data as Package[]) ?? []));
    };
    fetchStatus();
    fetchPackages();
    const channel = supabase
      .channel("home_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, fetchStatus)
      .on("postgres_changes", { event: "*", schema: "public", table: "packages" }, fetchPackages)
      .subscribe();
    const onFocus = () => { fetchStatus(); fetchPackages(); };
    window.addEventListener("focus", onFocus);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, []);


  const selectedPack = packages?.find((p) => p.id === selected) ?? null;

  const [checking, setChecking] = useState(false);
  const proceed = async () => {
    if (!userId.trim()) return setError("দয়া করে আপনার ইউজার আইডি দিন");
    if (!selected) return setError("দয়া করে একটি প্যাকেজ বেছে নিন");
    setChecking(true);
    const { data, error: qErr } = await supabase
      .from("allowed_users")
      .select("user_id")
      .eq("user_id", userId.trim())
      .maybeSingle();
    setChecking(false);
    if (qErr) return setError("যাচাই করতে সমস্যা হয়েছে, আবার চেষ্টা করুন");
    if (!data) return setError("এই ইউজার আইডি অনুমোদিত নয়। অ্যাডমিনের সাথে যোগাযোগ করুন।");
    navigate({
      to: "/payment",
      search: { userId: userId.trim(), pkg: selected },
    });
  };

  if (siteEnabled === false) {
    return (
      <div className="min-h-screen bg-[#0f2436] flex items-center justify-center p-4">
        <div className="bg-[#0f2436] rounded-2xl shadow-2xl shadow-[#a78bfa]/20 border border-[#a78bfa]/20 max-w-md w-full p-8 text-center">
          <PowerOff className="w-16 h-16 text-[#a78bfa] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#a78bfa] mb-2">সাইট সাময়িক বন্ধ</h2>
          <p className="text-muted-foreground">আমরা শীঘ্রই ফিরে আসছি। অসুবিধার জন্য দুঃখিত।</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#08111a] via-[#0d1a2e] to-[#0f2436]">
      <header className="bg-[#0f2436]/80 backdrop-blur-xl border-b border-[#a78bfa]/20 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center gap-3">
          <img src={logo} alt="BFN logo" className="w-12 h-12 rounded-full object-cover ring-2 ring-white/30" />
          <div>
            <h1 className="text-2xl font-bold">নেট বিল পে</h1>
            <p className="text-white/80 text-sm">আপনার ইন্টারনেট বিল সহজে পরিশোধ করুন</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {!selected && (
          <>
            <h2 className="text-xl font-bold text-[#a78bfa] mb-4">প্যাকেজ বেছে নিন</h2>
            {packages === null ? (
              <p className="text-center text-sm text-muted-foreground py-8">লোড হচ্ছে...</p>
            ) : packages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">বর্তমানে কোনো প্যাকেজ চালু নেই।</p>
            ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {packages.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setSelected(p.id); setError(""); }}
                  className="text-left p-5 rounded-2xl border-2 transition bg-[#0f2436] border-white/10 hover:border-[#4ade80]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[#a78bfa] font-bold text-lg">{p.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">{p.description}</div>
                    </div>
                    <Zap className="w-6 h-6 text-[#4ade80]" />
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div className="text-[#4ade80] font-semibold">{p.speed}</div>
                    <div>
                      <span className="text-2xl font-bold text-[#a78bfa]">৳{p.price}</span>
                      <span className="text-sm text-muted-foreground ml-1">/মাস</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            )}
          </>
        )}

        {selected && selectedPack && (
          <>
            <button
              onClick={() => { setSelected(null); setError(""); }}
              className="inline-flex items-center gap-2 text-[#4ade80] mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> প্যাকেজ পরিবর্তন করুন
            </button>

            <section className="bg-[#0f2436] rounded-2xl shadow-lg shadow-[#a78bfa]/10 border-2 border-[#4ade80]/50 p-5 mb-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[#a78bfa] font-bold text-lg">{selectedPack.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">{selectedPack.description}</div>
                  <div className="text-[#4ade80] font-semibold mt-2">{selectedPack.speed}</div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-[#a78bfa]">৳{selectedPack.price}</span>
                  <div className="text-sm text-muted-foreground">/মাস</div>
                </div>
              </div>
            </section>

            <section className="bg-[#0f2436] rounded-2xl shadow-lg shadow-[#a78bfa]/10 border border-white/10 p-6">
              <Label htmlFor="uid" className="text-[#a78bfa] font-semibold text-base">আপনার ইউজার আইডি</Label>
              <p className="text-sm text-muted-foreground mb-3">আপনার ইন্টারনেট কানেকশনের ইউজার আইডি দিন</p>
              <Input
                id="uid"
                value={userId}
                onChange={(e) => { setUserId(e.target.value); setError(""); }}
                placeholder="যেমন: USR-12345"
                className="h-12 text-base"
                autoFocus
              />

              {error && <p className="mt-4 text-sm text-destructive text-center">{error}</p>}

              <Button onClick={proceed} disabled={checking} className="w-full h-14 text-base bg-[#4ade80] text-[#08111a] font-semibold hover:bg-[#a78bfa] hover:text-[#08111a] text-white rounded-xl mt-6">
                {checking ? "যাচাই হচ্ছে..." : "পেমেন্ট চালিয়ে যান"}
              </Button>
            </section>

            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-[#4ade80]" />
              নিরাপদ ও দ্রুত পেমেন্ট
            </div>
          </>
        )}
      </main>
    </div>
  );
}
