import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { LogOut, RefreshCw, ShieldAlert, Search, Download } from "lucide-react";
import { downloadInvoice } from "@/lib/invoice";
import logo from "@/assets/logo.jpg";

type Request = {
  id: string;
  user_id_input: string;
  package_name: string;
  package_speed: string;
  amount: number;
  payment_method: string;
  transaction_id: string;
  sender_number: string;
  status: string;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "অ্যাডমিন প্যানেল — পেমেন্ট রিকোয়েস্ট" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [rows, setRows] = useState<Request[] | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const filtered = useMemo(() => {
    if (!rows) return null;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (q && !r.user_id_input.toLowerCase().includes(q) && !r.sender_number.toLowerCase().includes(q) && !r.transaction_id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, statusFilter]);

  const counts = useMemo(() => {
    const c = { all: 0, pending: 0, approved: 0, rejected: 0 } as Record<string, number>;
    rows?.forEach((r) => { c.all++; c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [rows]);

  const load = async () => {
    setLoading(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    const admin = !!(roles && roles.length > 0);
    setIsAdmin(admin);
    if (admin) {
      const { data, error } = await supabase
        .from("payment_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      else setRows(data as Request[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("payment_requests").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("স্ট্যাটাস আপডেট হয়েছে");
    load();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#0f2436] flex items-center justify-center p-4">
        <div className="bg-[#0f2436] rounded-2xl shadow-2xl shadow-[#a78bfa]/20 border border-[#a78bfa]/20 max-w-md w-full p-8 text-center">
          <ShieldAlert className="w-14 h-14 text-[#4ade80] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#a78bfa] mb-2">অ্যাডমিন অ্যাক্সেস নেই</h2>
          <p className="text-sm text-muted-foreground mb-4">
            আপনার ইউজার আইডি: <code className="bg-gray-100 px-1 rounded">{user.id}</code>
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            এই ইউজারকে অ্যাডমিন করতে ব্যাকএন্ডে <code>user_roles</code> টেবিলে একটি রো যোগ করুন
            (role = 'admin')।
          </p>
          <Button onClick={logout} variant="outline" className="w-full">
            <LogOut className="w-4 h-4 mr-2" /> লগআউট
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f2436]">
      <header className="bg-[#0f2436]/80 backdrop-blur-xl border-b border-[#a78bfa]/20 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="BFN" className="w-10 h-10 rounded-full object-cover ring-2 ring-[#a78bfa]/40" />
            <div>
              <h1 className="text-lg font-bold">অ্যাডমিন প্যানেল</h1>
              <p className="text-white/80 text-xs">পেমেন্ট রিকোয়েস্ট ম্যানেজমেন্ট</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/reports">
              <Button size="sm" variant="secondary">মাসিক রিপোর্ট</Button>
            </Link>
            <Link to="/users">
              <Button size="sm" variant="secondary">অনুমোদিত ইউজার</Button>
            </Link>
            <Link to="/packages">
              <Button size="sm" variant="secondary">প্যাকেজ</Button>
            </Link>
            <Link to="/settings">
              <Button size="sm" variant="secondary">সেটিংস</Button>
            </Link>

            <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> রিফ্রেশ
            </Button>
            <Button size="sm" variant="secondary" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1" /> লগআউট
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="bg-[#0f2436] rounded-2xl shadow-lg shadow-[#a78bfa]/10 border p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ইউজার আইডি / নম্বর / ট্রানজেকশন সার্চ..."
              className="pl-9 h-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "approved", "rejected"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? "default" : "outline"}
                onClick={() => setStatusFilter(s)}
                className={statusFilter === s ? "bg-[#4ade80] text-[#08111a] font-semibold hover:bg-[#a78bfa] hover:text-[#08111a]" : ""}
              >
                {s === "all" ? "সব" : s === "pending" ? "পেন্ডিং" : s === "approved" ? "অনুমোদিত" : "প্রত্যাখ্যাত"}
                <span className="ml-1 opacity-70">({counts[s] ?? 0})</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="bg-[#0f2436] rounded-2xl shadow-lg shadow-[#a78bfa]/10 border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#0f2436]">
                <TableHead>ইউজার আইডি</TableHead>
                <TableHead>প্যাকেজ</TableHead>
                <TableHead>টাকা</TableHead>
                <TableHead>মেথড</TableHead>
                <TableHead>ট্রানজেকশন</TableHead>
                <TableHead>পাঠানো নম্বর</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead>সময়</TableHead>
                <TableHead>অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    কোনো রিকোয়েস্ট পাওয়া যায়নি।
                  </TableCell>
                </TableRow>
              )}
              {filtered?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-semibold">{r.user_id_input}</TableCell>
                  <TableCell>{r.package_name} <span className="text-xs text-muted-foreground">({r.package_speed})</span></TableCell>
                  <TableCell>৳{Number(r.amount).toFixed(0)}</TableCell>
                  <TableCell className="capitalize">{r.payment_method}</TableCell>
                  <TableCell className="font-mono text-xs">{r.transaction_id}</TableCell>
                  <TableCell>{r.sender_number}</TableCell>
                  <TableCell>
                    <Badge
                      variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("bn-BD")}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.status === "pending" ? (
                        <>
                          <Button size="sm" onClick={() => setStatus(r.id, "approved")} className="bg-[#4ade80] hover:bg-[#4ade80] text-[#08111a] font-semibold">
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setStatus(r.id, "rejected")}>
                            Reject
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "pending")}>
                          রিসেট
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => downloadInvoice(r)} title="ইনভয়েস">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
