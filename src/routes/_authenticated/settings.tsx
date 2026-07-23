import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Plus, Save, Trash2, Power, ShieldAlert, LogOut, KeyRound } from "lucide-react";
import { updateAdminCredentials } from "@/lib/admin-account.functions";
import logo from "@/assets/logo.jpg";


type Method = {
  id: string;
  code: string;
  label: string;
  receiver_number: string;
  enabled: boolean;
  sort_order: number;
  color: string;
};

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "পেমেন্ট সেটিংস — অ্যাডমিন" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [methods, setMethods] = useState<Method[]>([]);
  const [siteEnabled, setSiteEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [credSaving, setCredSaving] = useState(false);

  const currentUsername = (user.email ?? "").replace(/@admin\.local$/i, "");


  const load = async () => {
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    const admin = !!(roles && roles.length > 0);
    setIsAdmin(admin);
    if (!admin) return;
    const [{ data: pm }, { data: ss }] = await Promise.all([
      supabase.from("payment_methods").select("*").order("sort_order"),
      supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    setMethods((pm as Method[]) ?? []);
    setSiteEnabled(ss?.site_enabled ?? true);
  };

  useEffect(() => { load(); }, []);

  const updateLocal = (id: string, patch: Partial<Method>) => {
    setMethods((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const addNew = async () => {
    const code = `method_${Date.now()}`;
    const { data, error } = await supabase
      .from("payment_methods")
      .insert({ code, label: "নতুন মেথড", receiver_number: "", enabled: true, sort_order: methods.length + 1, color: "#059669" })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setMethods((m) => [...m, data as Method]);
  };

  const removeOne = async (id: string) => {
    const { error } = await supabase.from("payment_methods").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setMethods((m) => m.filter((x) => x.id !== id));
    toast.success("মুছে ফেলা হয়েছে");
  };

  const saveAll = async () => {
    setSaving(true);
    const results = await Promise.all([
      ...methods.map((m) =>
        supabase.from("payment_methods").update({
          label: m.label,
          receiver_number: m.receiver_number,
          enabled: m.enabled,
          sort_order: m.sort_order,
          color: m.color,
        }).eq("id", m.id)
      ),
      supabase.from("site_settings").update({ site_enabled: siteEnabled }).eq("id", 1),
    ]);
    setSaving(false);
    const err = results.find((r) => r.error);
    if (err?.error) return toast.error(err.error.message);
    toast.success("সেটিংস সংরক্ষণ হয়েছে");
  };

  const logout = async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); };

  const saveCredentials = async () => {
    const uname = newUsername.trim();
    const pwd = newPassword;
    if (!uname && !pwd) return toast.error("ইউজারনেম বা পাসওয়ার্ড দিন");
    if (uname && !/^[a-zA-Z0-9_.-]{3,40}$/.test(uname)) return toast.error("ইউজারনেম ৩-৪০ অক্ষর (a-z, 0-9, _ . -)");
    if (pwd) {
      if (pwd.length < 4) return toast.error("পাসওয়ার্ড কমপক্ষে ৪ অক্ষর");
      if (pwd !== confirmPassword) return toast.error("পাসওয়ার্ড মিলছে না");
    }
    setCredSaving(true);
    try {
      await updateAdminCredentials({
        data: {
          ...(uname ? { username: uname } : {}),
          ...(pwd ? { password: pwd } : {}),
        },
      });
      toast.success("ক্রেডেনশিয়াল আপডেট হয়েছে — আবার লগইন করুন");
      setNewUsername("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate({ to: "/auth" });
      }, 900);
    } catch (e: any) {
      toast.error(e?.message ?? "আপডেট ব্যর্থ");
    } finally {
      setCredSaving(false);
    }
  };


  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#0f2436] flex items-center justify-center p-4">
        <div className="bg-[#0f2436] rounded-2xl shadow-2xl shadow-[#a78bfa]/20 border border-[#a78bfa]/20 max-w-md w-full p-8 text-center">
          <ShieldAlert className="w-14 h-14 text-[#4ade80] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#a78bfa] mb-4">অ্যাডমিন অ্যাক্সেস নেই</h2>
          <Button onClick={logout} variant="outline" className="w-full"><LogOut className="w-4 h-4 mr-2" /> লগআউট</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f2436] pb-24">
      <header className="bg-[#0f2436]/80 backdrop-blur-xl border-b border-[#a78bfa]/20 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/admin" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" /> অ্যাডমিন প্যানেল
          </Link>
          <div className="flex items-center gap-2 text-sm opacity-80">
            <img src={logo} alt="BFN" className="w-8 h-8 rounded-full object-cover ring-2 ring-[#a78bfa]/40" />
            পেমেন্ট সেটিংস
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="bg-[#0f2436] rounded-2xl shadow-lg shadow-[#a78bfa]/10 border overflow-hidden">
          <div className="bg-[#4ade80] text-[#08111a] font-semibold text-white px-4 py-3 flex items-center justify-between">
            <h2 className="font-bold">📋 পেমেন্ট সেটিংস ম্যানেজমেন্ট</h2>
            <Button size="sm" variant="secondary" onClick={addNew} className="h-8">
              <Plus className="w-4 h-4 mr-1" /> নতুন যোগ করুন
            </Button>
          </div>

          <div className="p-3 space-y-2">
            {methods.length === 0 && (
              <p className="text-center text-muted-foreground py-6 text-sm">কোনো পেমেন্ট মেথড নেই।</p>
            )}
            {methods.map((m) => (
              <div key={m.id} className="border rounded-xl p-3 bg-[#1a2030] flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-md flex items-center justify-center text-white font-bold text-xs shrink-0"
                  style={{ backgroundColor: m.color }}
                >
                  {m.label.slice(0, 2)}
                </div>
                <div className="flex-1 grid gap-2 sm:grid-cols-2">
                  <Input
                    value={m.label}
                    onChange={(e) => updateLocal(m.id, { label: e.target.value })}
                    placeholder="নাম"
                    className="h-9"
                  />
                  <Input
                    value={m.receiver_number}
                    onChange={(e) => updateLocal(m.id, { receiver_number: e.target.value })}
                    placeholder="প্রাপক নম্বর"
                    className="h-9"
                  />
                </div>
                <span className={`text-xs px-2 py-1 rounded-md border ${m.enabled ? "text-[#4ade80] border-[#4ade80]/50 bg-[#0f2436]" : "text-red-700 border-red-300 bg-red-50"}`}>
                  {m.enabled ? "চালু" : "বন্ধ"}
                </span>
                <Switch checked={m.enabled} onCheckedChange={(v) => updateLocal(m.id, { enabled: v })} />
                <button
                  onClick={() => removeOne(m.id)}
                  className="p-2 rounded-md text-[#a78bfa] hover:bg-red-50"
                  title="মুছুন"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0f2436] rounded-2xl shadow-lg shadow-[#a78bfa]/10 border p-4 flex items-center gap-3">
          <Power className={`w-6 h-6 ${siteEnabled ? "text-[#4ade80]" : "text-[#a78bfa]"}`} />
          <div className="flex-1">
            <div className="font-semibold text-[#a78bfa]">সাইট স্ট্যাটাস</div>
            <div className="text-xs text-muted-foreground">
              {siteEnabled ? "সাইট চালু আছে" : "সাইট বন্ধ — ইউজার নতুন পেমেন্ট করতে পারবে না"}
            </div>
          </div>
          <Switch checked={siteEnabled} onCheckedChange={setSiteEnabled} />
        </div>

        <div className="bg-[#0f2436] rounded-2xl shadow-lg shadow-[#a78bfa]/10 border overflow-hidden">
          <div className="bg-[#4ade80] text-[#08111a] font-semibold text-white px-4 py-3 flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            <h2 className="font-bold">অ্যাডমিন ইউজারনেম/পাসওয়ার্ড পরিবর্তন</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-xs text-muted-foreground">
              বর্তমান ইউজারনেম: <span className="font-mono font-semibold text-[#a78bfa]">{currentUsername}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-[#a78bfa]">নতুন ইউজারনেম (ঐচ্ছিক)</label>
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder={currentUsername}
                  className="h-9 mt-1"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#a78bfa]">নতুন পাসওয়ার্ড (ঐচ্ছিক)</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••"
                  className="h-9 mt-1"
                  autoComplete="new-password"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-[#a78bfa]">পাসওয়ার্ড কনফার্ম</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••"
                  className="h-9 mt-1"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <Button
              onClick={saveCredentials}
              disabled={credSaving}
              className="w-full h-10 bg-[#4ade80] text-[#08111a] font-semibold hover:bg-[#a78bfa] hover:text-[#08111a] text-white"
            >
              {credSaving ? "আপডেট হচ্ছে..." : "ক্রেডেনশিয়াল আপডেট করুন"}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              আপডেট সফল হলে অটোমেটিক লগআউট হয়ে নতুন ক্রেডেনশিয়াল দিয়ে লগইন করতে হবে।
            </p>
          </div>
        </div>

      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-[#0f2436]/80 backdrop-blur-xl border-t border-white/10 p-3">
        <div className="max-w-3xl mx-auto">
          <Button
            onClick={saveAll}
            disabled={saving}
            className="w-full h-12 bg-[#4ade80] text-[#08111a] font-semibold hover:bg-[#a78bfa] hover:text-[#08111a] text-white text-base"
          >
            <Save className="w-4 h-4 mr-2" /> {saving ? "সংরক্ষণ হচ্ছে..." : "সেটিংস সংরক্ষণ করুন"}
          </Button>
        </div>
      </div>
    </div>
  );
}
