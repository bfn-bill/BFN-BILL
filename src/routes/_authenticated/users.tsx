import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Search, Upload, RefreshCw, Pencil, Save, X } from "lucide-react";
import logo from "@/assets/logo.jpg";

type AllowedUser = {
  id: string;
  user_id: string;
  name: string | null;
  address: string | null;
  mobile: string | null;
  ip_username: string | null;
  note: string | null;
  created_at: string;
};

type EditFields = {
  user_id: string;
  name: string;
  address: string;
  mobile: string;
  ip_username: string;
  note: string;
};

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "অনুমোদিত ইউজার — অ্যাডমিন" }] }),
  component: UsersPage,
});

function UsersPage() {
  const [rows, setRows] = useState<AllowedUser[] | null>(null);
  const [search, setSearch] = useState("");
  const [bulk, setBulk] = useState("");
  const [form, setForm] = useState<EditFields>({ user_id: "", name: "", address: "", mobile: "", ip_username: "", note: "" });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFields>({ user_id: "", name: "", address: "", mobile: "", ip_username: "", note: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("allowed_users")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows(data as AllowedUser[]);
  };

  useEffect(() => { load(); }, []);

  const addOne = async () => {
    const user_id = form.user_id.trim();
    if (!user_id) return toast.error("ইউজার আইডি দিন");
    const { error } = await supabase.from("allowed_users").insert({
      user_id,
      name: form.name.trim() || null,
      address: form.address.trim() || null,
      mobile: form.mobile.trim() || null,
      ip_username: form.ip_username.trim() || null,
      note: form.note.trim() || "",
    });
    if (error) return toast.error(error.message);
    toast.success("যোগ হয়েছে");
    setForm({ user_id: "", name: "", address: "", mobile: "", ip_username: "", note: "" });
    load();
  };

  const addBulk = async () => {
    const lines = bulk.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return toast.error("কোনো ডাটা পাওয়া যায়নি");

    const rows: Array<{ user_id: string; name: string | null; address: string | null; mobile: string | null; ip_username: string | null }> = [];
    for (const line of lines) {
      // Split by tab first; fallback to 2+ spaces; fallback to comma
      let parts: string[];
      if (line.includes("\t")) parts = line.split(/\t+/);
      else if (/\s{2,}/.test(line)) parts = line.split(/\s{2,}/);
      else if (line.includes(",")) parts = line.split(/\s*,\s*/);
      else parts = [line];
      parts = parts.map((p) => p.trim());

      if (parts.length >= 4) {
        const [name, address, mobile, ipu] = parts;
        const user_id = ipu || name;
        if (!user_id) continue;
        rows.push({ user_id, name: name || null, address: address || null, mobile: mobile || null, ip_username: ipu || null });
      } else {
        // Single column = user_id only (backward compatible)
        for (const id of parts.filter(Boolean)) {
          rows.push({ user_id: id, name: null, address: null, mobile: null, ip_username: null });
        }
      }
    }

    if (rows.length === 0) return toast.error("কোনো আইডি পাওয়া যায়নি");
    const { error, count } = await supabase
      .from("allowed_users")
      .upsert(rows, { onConflict: "user_id", count: "exact" });
    if (error) return toast.error(error.message);
    toast.success(`${count ?? rows.length} টি রেকর্ড যোগ/আপডেট হয়েছে`);
    setBulk("");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("মুছে ফেলতে চান?")) return;
    const { error } = await supabase.from("allowed_users").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const startEdit = (r: AllowedUser) => {
    setEditingId(r.id);
    setEditForm({
      user_id: r.user_id,
      name: r.name ?? "",
      address: r.address ?? "",
      mobile: r.mobile ?? "",
      ip_username: r.ip_username ?? "",
      note: r.note ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const user_id = editForm.user_id.trim();
    if (!user_id) return toast.error("ইউজার আইডি দিন");
    const { error } = await supabase.from("allowed_users").update({
      user_id,
      name: editForm.name.trim() || null,
      address: editForm.address.trim() || null,
      mobile: editForm.mobile.trim() || null,
      ip_username: editForm.ip_username.trim() || null,
      note: editForm.note.trim() || "",
    }).eq("id", editingId);
    if (error) return toast.error(error.message);
    toast.success("আপডেট হয়েছে");
    setEditingId(null);
    load();
  };

  const filtered = rows?.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.user_id.toLowerCase().includes(q) ||
      (r.name ?? "").toLowerCase().includes(q) ||
      (r.mobile ?? "").toLowerCase().includes(q) ||
      (r.ip_username ?? "").toLowerCase().includes(q) ||
      (r.address ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#0f2436]">
      <header className="bg-[#0f2436]/80 backdrop-blur-xl border-b border-[#a78bfa]/20 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button size="sm" variant="secondary"><ArrowLeft className="w-4 h-4 mr-1" /> ফিরে যান</Button>
            </Link>
            <img src={logo} alt="BFN" className="w-9 h-9 rounded-full object-cover ring-2 ring-[#a78bfa]/40" />
            <h1 className="text-lg font-bold">অনুমোদিত ইউজার তালিকা</h1>
          </div>
          <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> রিফ্রেশ
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-4">
        <section className="bg-[#0f2436] rounded-2xl border border-white/10 shadow-lg shadow-[#a78bfa]/10 p-4 space-y-3">
          <h2 className="font-semibold text-[#a78bfa]">নতুন ইউজার যোগ করুন</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Input placeholder="ইউজার আইডি *" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} />
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            <Input placeholder="IP / Username" value={form.ip_username} onChange={(e) => setForm({ ...form, ip_username: e.target.value })} />
            <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="lg:col-span-2" />
            <Input placeholder="নোট (ঐচ্ছিক)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="lg:col-span-3" />
          </div>
          <Button onClick={addOne} className="bg-[#4ade80] text-[#08111a] font-semibold hover:bg-[#a78bfa] hover:text-[#08111a]">যোগ করুন</Button>
        </section>

        <section className="bg-[#0f2436] rounded-2xl border border-white/10 shadow-lg shadow-[#a78bfa]/10 p-4 space-y-3">
          <h2 className="font-semibold text-[#a78bfa]">একসাথে অনেক ইউজার যোগ করুন (টেবিল থেকে কপি-পেস্ট)</h2>
          <p className="text-xs text-muted-foreground">
            প্রতি লাইনে একজন ইউজার। ফরম্যাট: <span className="text-[#4ade80]">Name ⇥ Address ⇥ Mobile ⇥ IP/Username</span> — ট্যাব, দুই+ স্পেস, বা কমা দিয়ে আলাদা করা যাবে। IP/Username-ই ইউজার আইডি হিসেবে সেভ হবে। শুধু আইডির লিস্ট দিলেও চলবে।
          </p>
          <Textarea rows={6} placeholder={"ALAMIN / MONIR HOSAN D28\tDigdoli, Thana # Bandar, District # Narayanganj\t8801920838891\tSW-swapan96\nUJJAL / DULAL\tSabdi Bazar, Thana # Bandar, District # Narayanganj\t8801923732967\tSW-swapan31"} value={bulk} onChange={(e) => setBulk(e.target.value)} className="font-mono text-xs" />
          <Button onClick={addBulk} className="bg-[#4ade80] text-[#08111a] font-semibold hover:bg-[#a78bfa] hover:text-[#08111a]"><Upload className="w-4 h-4 mr-1" /> সব যোগ করুন</Button>
        </section>

        <section className="bg-[#0f2436] rounded-2xl border border-white/10 shadow-lg shadow-[#a78bfa]/10">
          <div className="p-4 border-b border-white/10 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="আইডি / নাম / মোবাইল / IP সার্চ..." className="pl-9" />
            </div>
            <div className="text-sm text-muted-foreground">মোট: {rows?.length ?? 0}</div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#0f2436]">
                  <TableHead>ইউজার আইডি</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>IP / Username</TableHead>
                  <TableHead>নোট</TableHead>
                  <TableHead className="text-right">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">কোনো ইউজার নেই।</TableCell></TableRow>
                )}
                {filtered?.map((r) => {
                  const isEditing = editingId === r.id;
                  return (
                    <TableRow key={r.id}>
                      {isEditing ? (
                        <>
                          <TableCell><Input value={editForm.user_id} onChange={(e) => setEditForm({ ...editForm, user_id: e.target.value })} className="h-8" /></TableCell>
                          <TableCell><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-8" /></TableCell>
                          <TableCell><Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="h-8" /></TableCell>
                          <TableCell><Input value={editForm.mobile} onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} className="h-8" /></TableCell>
                          <TableCell><Input value={editForm.ip_username} onChange={(e) => setEditForm({ ...editForm, ip_username: e.target.value })} className="h-8" /></TableCell>
                          <TableCell><Input value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} className="h-8" /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" onClick={saveEdit} className="bg-[#4ade80] text-[#08111a] font-semibold hover:bg-[#a78bfa]"><Save className="w-4 h-4" /></Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="font-semibold">{r.user_id}</TableCell>
                          <TableCell>{r.name || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-sm">{r.address || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell>{r.mobile || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell>{r.ip_username || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.note}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" onClick={() => startEdit(r)}><Pencil className="w-4 h-4" /></Button>
                              <Button size="sm" variant="destructive" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      </main>
    </div>
  );
}
