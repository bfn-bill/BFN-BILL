import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Download, Printer, ShieldAlert, LogOut } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "মাসিক রিপোর্ট — অ্যাডমিন" }] }),
  component: ReportsPage,
});

function ymNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ReportsPage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [month, setMonth] = useState<string>(ymNow());
  const [rows, setRows] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);

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
      const [y, m] = month.split("-").map(Number);
      const start = new Date(y, m - 1, 1).toISOString();
      const end = new Date(y, m, 1).toISOString();
      const { data, error } = await supabase
        .from("payment_requests")
        .select("*")
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      else setRows((data as Request[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month]);

  const stats = useMemo(() => {
    const s = {
      total: rows.length,
      approved: 0, pending: 0, rejected: 0,
      approvedAmount: 0, totalAmount: 0,
      byMethod: {} as Record<string, { count: number; amount: number }>,
      byPackage: {} as Record<string, { count: number; amount: number }>,
    };
    rows.forEach((r) => {
      const amt = Number(r.amount) || 0;
      s.totalAmount += amt;
      if (r.status === "approved") { s.approved++; s.approvedAmount += amt; }
      else if (r.status === "pending") s.pending++;
      else if (r.status === "rejected") s.rejected++;
      const mk = r.payment_method || "—";
      s.byMethod[mk] = s.byMethod[mk] || { count: 0, amount: 0 };
      s.byMethod[mk].count++;
      if (r.status === "approved") s.byMethod[mk].amount += amt;
      const pk = r.package_name || "—";
      s.byPackage[pk] = s.byPackage[pk] || { count: 0, amount: 0 };
      s.byPackage[pk].count++;
      if (r.status === "approved") s.byPackage[pk].amount += amt;
    });
    return s;
  }, [rows]);

  const downloadCSV = () => {
    const headers = ["User ID", "Package", "Speed", "Amount", "Method", "Transaction ID", "Sender", "Status", "Date"];
    const lines = [headers.join(",")].concat(
      rows.map((r) => [
        r.user_id_input, r.package_name, r.package_speed, r.amount, r.payment_method,
        r.transaction_id, r.sender_number, r.status, new Date(r.created_at).toLocaleString("en-GB"),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    );
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          <Button onClick={logout} variant="outline" className="w-full">
            <LogOut className="w-4 h-4 mr-2" /> লগআউট
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f2436]">
      <header className="bg-[#0f2436]/80 backdrop-blur-xl border-b border-[#a78bfa]/20 text-white print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button size="sm" variant="secondary"><ArrowLeft className="w-4 h-4 mr-1" /> ফিরে যান</Button>
            </Link>
            <img src={logo} alt="BFN" className="w-9 h-9 rounded-full object-cover ring-2 ring-[#a78bfa]/40" />
            <div>
              <h1 className="text-lg font-bold">মাসিক রিপোর্ট</h1>
              <p className="text-white/80 text-xs">পেমেন্ট সারাংশ</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1" /> প্রিন্ট
            </Button>
            <Button size="sm" variant="secondary" onClick={downloadCSV}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="bg-[#0f2436] rounded-2xl shadow-lg shadow-[#a78bfa]/10 border p-4 flex flex-wrap gap-3 items-center">
          <label className="font-semibold">মাস নির্বাচন করুন:</label>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-48"
          />
          {loading && <span className="text-sm text-muted-foreground">লোড হচ্ছে...</span>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="মোট রিকোয়েস্ট" value={stats.total} />
          <StatCard label="অনুমোদিত" value={stats.approved} tone="emerald" />
          <StatCard label="পেন্ডিং" value={stats.pending} tone="amber" />
          <StatCard label="প্রত্যাখ্যাত" value={stats.rejected} tone="red" />
          <StatCard label="অনুমোদিত আয়" value={`৳${stats.approvedAmount.toFixed(0)}`} tone="emerald" wide />
          <StatCard label="মোট (সব স্ট্যাটাস)" value={`৳${stats.totalAmount.toFixed(0)}`} wide />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <BreakdownCard title="পেমেন্ট মেথড অনুযায়ী" data={stats.byMethod} />
          <BreakdownCard title="প্যাকেজ অনুযায়ী" data={stats.byPackage} />
        </div>

        <div className="bg-[#0f2436] rounded-2xl shadow-lg shadow-[#a78bfa]/10 border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#0f2436]">
                <TableHead>ইউজার আইডি</TableHead>
                <TableHead>প্যাকেজ</TableHead>
                <TableHead>টাকা</TableHead>
                <TableHead>মেথড</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead>সময়</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    এই মাসে কোনো রিকোয়েস্ট নেই।
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-semibold">{r.user_id_input}</TableCell>
                  <TableCell>{r.package_name} <span className="text-xs text-muted-foreground">({r.package_speed})</span></TableCell>
                  <TableCell>৳{Number(r.amount).toFixed(0)}</TableCell>
                  <TableCell className="capitalize">{r.payment_method}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("bn-BD")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, tone, wide }: { label: string; value: React.ReactNode; tone?: "emerald" | "amber" | "red"; wide?: boolean }) {
  const color =
    tone === "emerald" ? "text-[#4ade80]" :
    tone === "amber" ? "text-amber-600" :
    tone === "red" ? "text-[#a78bfa]" : "text-gray-800";
  return (
    <div className={`bg-[#0f2436] rounded-2xl shadow-lg shadow-[#a78bfa]/10 border p-4 ${wide ? "md:col-span-2" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function BreakdownCard({ title, data }: { title: string; data: Record<string, { count: number; amount: number }> }) {
  const entries = Object.entries(data).sort((a, b) => b[1].amount - a[1].amount);
  return (
    <div className="bg-[#0f2436] rounded-2xl shadow-lg shadow-[#a78bfa]/10 border p-4">
      <div className="font-semibold text-[#a78bfa] mb-2">{title}</div>
      {entries.length === 0 ? (
        <div className="text-sm text-muted-foreground">কোনো ডেটা নেই</div>
      ) : (
        <ul className="space-y-2">
          {entries.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between text-sm border-b last:border-0 pb-2">
              <span className="capitalize font-medium">{k}</span>
              <span className="text-muted-foreground">{v.count} টি · <b className="text-[#4ade80]">৳{v.amount.toFixed(0)}</b></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
