import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import type { Package } from "@/lib/packages";
import logo from "@/assets/logo.jpg";

export const Route = createFileRoute("/_authenticated/packages")({
  head: () => ({ meta: [{ title: "প্যাকেজ ম্যানেজমেন্ট — অ্যাডমিন" }] }),
  component: PackagesPage,
});

type Row = Package & { sort_order: number; enabled: boolean };

function PackagesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [nRow, setNRow] = useState({ id: "", name: "", speed: "", price: 0, description: "", sort_order: 0, enabled: true });

  const load = async () => {
    const { data, error } = await supabase
      .from("packages")
      .select("id, name, speed, price, description, sort_order, enabled")
      .order("sort_order");
    if (error) { toast.error("লোড করতে সমস্যা: " + error.message); return; }
    setRows((data as Row[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<Row>) => {
    setRows((cur) => cur?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? null);
  };

  const saveAll = async () => {
    if (!rows) return;
    setSaving(true);
    for (const r of rows) {
      const { error } = await supabase.from("packages").update({
        name: r.name, speed: r.speed, price: r.price, description: r.description,
        sort_order: r.sort_order, enabled: r.enabled,
      }).eq("id", r.id);
      if (error) { toast.error(`${r.id}: ${error.message}`); setSaving(false); return; }
    }
    setSaving(false);
    toast.success("সব প্যাকেজ সেভ হয়েছে");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("প্যাকেজটি ডিলিট করবেন?")) return;
    const { error } = await supabase.from("packages").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ডিলিট হয়েছে");
    load();
  };

  const add = async () => {
    if (!nRow.id.trim() || !nRow.name.trim() || !nRow.speed.trim() || !nRow.price) {
      toast.error("ID, নাম, স্পিড, দাম দিন"); return;
    }
    const { error } = await supabase.from("packages").insert({
      id: nRow.id.trim(), name: nRow.name.trim(), speed: nRow.speed.trim(),
      price: nRow.price, description: nRow.description,
      sort_order: nRow.sort_order || (rows?.length ?? 0) + 1, enabled: nRow.enabled,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("নতুন প্যাকেজ যোগ হয়েছে");
    setNRow({ id: "", name: "", speed: "", price: 0, description: "", sort_order: 0, enabled: true });
    load();
  };

  return (
    <div className="min-h-screen bg-[#0f2436]">
      <header className="bg-[#0f2436]/80 backdrop-blur-xl border-b border-[#a78bfa]/20 text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="BFN" className="w-10 h-10 rounded-full object-cover ring-2 ring-[#a78bfa]/40" />
            <div>
              <h1 className="text-lg font-bold">প্যাকেজ ম্যানেজমেন্ট</h1>
              <p className="text-white/80 text-xs">নতুন প্যাকেজ যোগ করুন বা পরিবর্তন করুন</p>
            </div>
          </div>
          <Link to="/admin">
            <Button size="sm" variant="secondary"><ArrowLeft className="w-4 h-4 mr-1" /> অ্যাডমিন প্যানেল</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-[#0f2436] rounded-2xl shadow-lg shadow-[#a78bfa]/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#a78bfa]">বর্তমান প্যাকেজ</h2>
            <Button onClick={saveAll} disabled={saving || !rows} className="bg-[#4ade80] text-[#08111a] font-semibold hover:bg-[#a78bfa] hover:text-[#08111a]">
              <Save className="w-4 h-4 mr-1" /> {saving ? "সেভ হচ্ছে..." : "সব সেভ করুন"}
            </Button>
          </div>
          {rows === null ? (
            <p className="text-sm text-muted-foreground py-6 text-center">লোড হচ্ছে...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">কোনো প্যাকেজ নেই। নিচে থেকে যোগ করুন।</p>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead>স্পিড</TableHead>
                  <TableHead>দাম (৳)</TableHead>
                  <TableHead>বিবরণ</TableHead>
                  <TableHead>ক্রম</TableHead>
                  <TableHead>চালু</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell><Input value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} /></TableCell>
                    <TableCell><Input value={r.speed} onChange={(e) => update(r.id, { speed: e.target.value })} className="w-28" /></TableCell>
                    <TableCell><Input type="number" value={r.price} onChange={(e) => update(r.id, { price: Number(e.target.value) })} className="w-24" /></TableCell>
                    <TableCell><Input value={r.description} onChange={(e) => update(r.id, { description: e.target.value })} /></TableCell>
                    <TableCell><Input type="number" value={r.sort_order} onChange={(e) => update(r.id, { sort_order: Number(e.target.value) })} className="w-16" /></TableCell>
                    <TableCell><Switch checked={r.enabled} onCheckedChange={(v) => update(r.id, { enabled: v })} /></TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                        <Trash2 className="w-4 h-4 text-[#a78bfa]" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </section>

        <section className="bg-[#0f2436] rounded-2xl shadow-lg shadow-[#a78bfa]/10 p-5">
          <h2 className="font-bold text-[#a78bfa] mb-4">নতুন প্যাকেজ যোগ করুন</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>ID (ইংরেজিতে, ইউনিক)</Label>
              <Input value={nRow.id} onChange={(e) => setNRow({ ...nRow, id: e.target.value })} placeholder="যেমন: ultra" />
            </div>
            <div>
              <Label>নাম</Label>
              <Input value={nRow.name} onChange={(e) => setNRow({ ...nRow, name: e.target.value })} placeholder="যেমন: আলট্রা" />
            </div>
            <div>
              <Label>স্পিড</Label>
              <Input value={nRow.speed} onChange={(e) => setNRow({ ...nRow, speed: e.target.value })} placeholder="যেমন: 100 Mbps" />
            </div>
            <div>
              <Label>দাম (৳)</Label>
              <Input type="number" value={nRow.price} onChange={(e) => setNRow({ ...nRow, price: Number(e.target.value) })} />
            </div>
            <div className="sm:col-span-2">
              <Label>বিবরণ</Label>
              <Input value={nRow.description} onChange={(e) => setNRow({ ...nRow, description: e.target.value })} />
            </div>
            <div>
              <Label>ক্রম</Label>
              <Input type="number" value={nRow.sort_order} onChange={(e) => setNRow({ ...nRow, sort_order: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={nRow.enabled} onCheckedChange={(v) => setNRow({ ...nRow, enabled: v })} />
              <Label>চালু</Label>
            </div>
          </div>
          <Button onClick={add} className="mt-4 bg-[#4ade80] text-[#08111a] font-semibold hover:bg-[#a78bfa] hover:text-[#08111a]">
            <Plus className="w-4 h-4 mr-1" /> যোগ করুন
          </Button>
        </section>
      </main>
    </div>
  );
}
