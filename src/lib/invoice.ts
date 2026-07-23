import logo from "@/assets/logo.jpg";

export type InvoiceData = {
  id?: string;
  user_id_input: string;
  package_name: string;
  package_speed: string;
  amount: number;
  payment_method: string;
  transaction_id: string;
  sender_number: string;
  status?: string;
  created_at?: string;
};

export function downloadInvoice(r: InvoiceData) {
  const created = r.created_at ? new Date(r.created_at) : new Date();
  const dateStr = created.toLocaleString("bn-BD");
  const invNo = (r.id ?? String(Date.now())).slice(0, 8).toUpperCase();
  const statusColor =
    r.status === "approved" ? "#059669" : r.status === "rejected" ? "#dc2626" : "#d97706";

  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="utf-8" />
<title>Invoice ${invNo}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif; margin: 0; padding: 24px; background: #f3f4f6; color: #111827; }
  .card { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.08); }
  .head { background: #064e3b; color: #fff; padding: 24px; display: flex; justify-content: space-between; align-items: center; }
  .head h1 { margin: 0; font-size: 22px; }
  .head p { margin: 4px 0 0; opacity: .85; font-size: 13px; }
  .body { padding: 24px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e5e7eb; font-size: 14px; }
  .row:last-child { border-bottom: none; }
  .label { color: #6b7280; }
  .val { font-weight: 600; }
  .total { background: #ecfdf5; margin-top: 16px; padding: 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; }
  .total .amt { font-size: 24px; font-weight: 800; color: #065f46; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; color: #fff; background: ${statusColor}; text-transform: uppercase; }
  .foot { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; border-top: 1px solid #f3f4f6; }
  .actions { max-width: 640px; margin: 16px auto 0; text-align: center; }
  .btn { background: #065f46; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
  @media print { body { background: #fff; padding: 0; } .actions { display: none; } .card { box-shadow: none; } }
</style>
</head>
<body>
  <div class="card">
    <div class="head">
      <div style="display:flex;align-items:center;gap:12px">
        <img src="${logo}" alt="BFN" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.3)" />
        <div>
          <h1>ইনভয়েস</h1>
          <p>Net Bill Pay</p>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:12px;opacity:.8">Invoice #</div>
        <div style="font-weight:700">${invNo}</div>
        ${r.status ? `<div style="margin-top:6px"><span class="badge">${r.status}</span></div>` : ""}
      </div>
    </div>
    <div class="body">
      <div class="row"><span class="label">তারিখ</span><span class="val">${dateStr}</span></div>
      <div class="row"><span class="label">ইউজার আইডি</span><span class="val">${escapeHtml(r.user_id_input)}</span></div>
      <div class="row"><span class="label">প্যাকেজ</span><span class="val">${escapeHtml(r.package_name)} (${escapeHtml(r.package_speed)})</span></div>
      <div class="row"><span class="label">পেমেন্ট মেথড</span><span class="val" style="text-transform:capitalize">${escapeHtml(r.payment_method)}</span></div>
      <div class="row"><span class="label">ট্রানজেকশন আইডি</span><span class="val" style="font-family:monospace">${escapeHtml(r.transaction_id)}</span></div>
      <div class="row"><span class="label">প্রেরকের নম্বর</span><span class="val">${escapeHtml(r.sender_number)}</span></div>
      <div class="total"><span style="font-weight:600;color:#065f46">সর্বমোট</span><span class="amt">৳${Number(r.amount).toFixed(2)}</span></div>
    </div>
    <div class="foot">ধন্যবাদ আমাদের সেবা ব্যবহার করার জন্য।</div>
  </div>
  <div class="actions">
    <button class="btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
