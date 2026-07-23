import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { fetchPackageById, type Package } from "@/lib/packages";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, X, Copy, Check, CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadInvoice, type InvoiceData } from "@/lib/invoice";

const searchSchema = z.object({
  userId: z.string(),
  pkg: z.string(),
});

export const Route = createFileRoute("/payment")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "পেমেন্ট — বিল পরিশোধ" }] }),
  component: PaymentPage,
});

type PaymentMethod = {
  id: string;
  code: string;
  label: string;
  receiver_number: string;
  color: string;
};

function PaymentPage() {
  const { userId, pkg } = Route.useSearch();
  const navigate = useNavigate();
  const [pack, setPack] = useState<Package | null | undefined>(undefined);
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const [submitted, setSubmitted] = useState<InvoiceData | null>(null);

  useEffect(() => {
    fetchPackageById(pkg).then(setPack);
  }, [pkg]);

  useEffect(() => {
    const fetchMethods = () => {
      supabase
        .from("payment_methods")
        .select("id, code, label, receiver_number, color")
        .eq("enabled", true)
        .order("sort_order")
        .then(({ data }) => {
          const list = (data as PaymentMethod[]) ?? [];
          setMethods(list);
          setSelected((cur) => (cur ? list.find((m) => m.id === cur.id) ?? null : null));
        });
    };
    fetchMethods();
    const channel = supabase
      .channel("payment_methods_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_methods" }, fetchMethods)
      .subscribe();
    const onFocus = () => fetchMethods();
    window.addEventListener("focus", onFocus);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, []);


  if (pack === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">প্যাকেজ পাওয়া যায়নি।</p>
          <Link to="/" className="text-[#4ade80] underline">হোমে ফিরে যান</Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0f2436] flex items-center justify-center p-4">
        <div className="bg-[#0f2436] rounded-2xl shadow-2xl shadow-[#a78bfa]/20 border border-[#a78bfa]/20 max-w-md w-full p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-[#4ade80] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#a78bfa] mb-2">পেমেন্ট জমা হয়েছে</h2>
          <p className="text-muted-foreground mb-6">
            আপনার পেমেন্ট রিকোয়েস্ট গ্রহণ করা হয়েছে। অ্যাডমিন ভেরিফাই করার পর আপনার কানেকশন সক্রিয় হবে।
          </p>
          <Button
            onClick={() => downloadInvoice(submitted)}
            className="w-full bg-[#4ade80] text-[#08111a] font-semibold hover:bg-[#a78bfa] hover:text-[#08111a] text-white mb-2"
          >
            <Download className="w-4 h-4 mr-2" /> ইনভয়েস ডাউনলোড
          </Button>
          <Link to="/">
            <Button variant="outline" className="w-full">হোমে ফিরুন</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f2436]">
      <div className="max-w-md mx-auto p-4">
        <div className="bg-[#0f2436]/80 backdrop-blur-xl border-b border-[#a78bfa]/20 text-white rounded-t-2xl px-4 py-5">
          <div className="text-center">
            <h1 className="font-bold text-lg">পেমেন্ট পদ্ধতি বেছে নিন</h1>
            <p className="text-white/80 text-sm mt-1">
              ইউজার: <span className="font-semibold">{userId}</span> · {pack.speed} · ৳{pack.price}
            </p>
          </div>
        </div>

        {!selected && (
          <div className="bg-[#0f2436] rounded-b-2xl p-6 shadow-sm">
            {methods === null ? (
              <p className="text-center text-sm text-muted-foreground py-6">লোড হচ্ছে...</p>
            ) : methods.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                বর্তমানে কোনো পেমেন্ট মেথড চালু নেই।
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m)}
                    className="rounded-xl border border-gray-200 bg-[#0f2436] p-4 hover:shadow-md transition"
                  >
                    <div
                      className="text-white font-bold rounded-lg py-3 mb-2"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.label}
                    </div>
                    <div className="text-sm text-muted-foreground">{m.label}</div>
                  </button>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              className="w-full mt-6"
              onClick={() => navigate({ to: "/" })}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> ফিরে যান
            </Button>
          </div>
        )}

        {selected && (
          <MethodForm
            method={selected}
            amount={pack.price}
            userIdInput={userId}
            packageName={pack.name}
            packageSpeed={pack.speed}
            onBack={() => setSelected(null)}
            onClose={() => navigate({ to: "/" })}
            onSuccess={(data) => setSubmitted(data)}
          />
        )}
      </div>
    </div>
  );
}

function MethodForm({
  method, amount, userIdInput, packageName, packageSpeed, onBack, onClose, onSuccess,
}: {
  method: PaymentMethod;
  amount: number;
  userIdInput: string;
  packageName: string;
  packageSpeed: string;
  onBack: () => void;
  onClose: () => void;
  onSuccess: (data: InvoiceData) => void;
}) {
  const [trx, setTrx] = useState("");
  const [sender, setSender] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const receiver = method.receiver_number;
  const color = method.color;

  const copy = async () => {
    if (!receiver) return;
    await navigator.clipboard.writeText(receiver);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const submit = async () => {
    if (!trx.trim() || !sender.trim()) {
      toast.error("সব তথ্য পূরণ করুন");
      return;
    }
    if (!/^\d{11}$/.test(sender.trim())) {
      toast.error("আপনার নম্বর অবশ্যই ১১ ডিজিটের হতে হবে");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("payment_requests").insert({
      user_id_input: userIdInput,
      package_name: packageName,
      package_speed: packageSpeed,
      amount,
      payment_method: method.code,
      transaction_id: trx.trim(),
      sender_number: sender.trim(),
      status: "pending",
    });
    setLoading(false);
    if (error) {
      toast.error("পেমেন্ট জমা দিতে সমস্যা হয়েছে");
      return;
    }
    onSuccess({
      user_id_input: userIdInput,
      package_name: packageName,
      package_speed: packageSpeed,
      amount,
      payment_method: method.code,
      transaction_id: trx.trim(),
      sender_number: sender.trim(),
      status: "pending",
      created_at: new Date().toISOString(),
    });
  };

  return (
    <div className="bg-[#0f2436] rounded-b-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <button onClick={onBack} className="rounded-full border border-gray-300 p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="font-bold" style={{ color }}>{method.label}</div>
        <button onClick={onClose} className="p-2">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="m-4 rounded-2xl border-2 overflow-hidden" style={{ borderColor: color }}>
        <div className="text-white px-4 py-2 font-bold" style={{ backgroundColor: color }}>
          {method.label}
        </div>

        <div className="bg-[#0f2436] p-4 space-y-4">
          <div>
            <Label className="font-semibold" style={{ color }}>ট্রানজেকশন আইডি দিন</Label>
            <Input
              value={trx}
              onChange={(e) => setTrx(e.target.value)}
              placeholder="ট্রানজেকশন আইডি দিন"
              className="mt-2 h-12 bg-gray-50 border-gray-200"
            />
          </div>
          <div>
            <Label className="font-semibold" style={{ color }}>আপনার নম্বর</Label>
            <Input
              value={sender}
              onChange={(e) => setSender(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="১১ ডিজিটের নম্বর"
              inputMode="numeric"
              maxLength={11}
              className="mt-2 h-12 bg-gray-50 border-gray-200"
            />

          </div>

          <ul className="space-y-2 text-sm text-gray-700 pt-2">
            <li className="flex gap-2">
              <span style={{ color }}>●</span>
              <span>{method.label} অ্যাপে <b>Payment (Merchant Payment)</b> করুন এবং Transaction ID দিন</span>
            </li>
            {receiver && (
              <li className="flex gap-2 items-center">
                <span style={{ color }}>●</span>
                <span>
                  প্রাপক নম্বর: <b style={{ color }}>{receiver}</b>
                  <button
                    onClick={copy}
                    className="ml-2 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs"
                    style={{ borderColor: color, color }}
                  >
                    {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                  </button>
                </span>
              </li>
            )}
            <li className="flex gap-2">
              <span style={{ color }}>●</span>
              <span>টাকার পরিমাণ: <b style={{ color }}>৳{amount.toFixed(2)}</b></span>
            </li>
            <li className="flex gap-2">
              <span style={{ color }}>●</span>
              <span>উপরের বক্সে <b>Transaction ID</b> দিন এবং VERIFY বাটনে ক্লিক করুন।</span>
            </li>
          </ul>
        </div>

        <div className="p-3 flex gap-3" style={{ backgroundColor: color }}>
          <button
            onClick={onClose}
            className="flex-1 bg-white/90 text-gray-800 font-semibold rounded-xl py-3"
          >
            বাতিল
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 border-2 border-white text-white font-bold rounded-xl py-3 disabled:opacity-60"
          >
            {loading ? "..." : "VERIFY"}
          </button>
        </div>
      </div>
    </div>
  );
}
