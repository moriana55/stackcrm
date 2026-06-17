"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#e11d48", "#111827", "#6366f1", "#f59e0b", "#10b981", "#8b5cf6", "#0ea5e9", "#ec4899"];

const tl = (v: number) => `₺${Number(v).toLocaleString("tr-TR")}`;

function Empty({ label }: { label: string }) {
  return (
    <div className="h-[240px] flex flex-col items-center justify-center text-center">
      <span className="material-symbols-outlined text-3xl text-gray-300 mb-2">bar_chart</span>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}

// ── Gelir (aylık) ──────────────────────────────────────────────────────────
export function RevenueBars({ data }: { data: { label: string; value: number }[] }) {
  if (!data.some((d) => d.value > 0)) return <Empty label="Bu aralıkta gelir verisi yok." />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9ca3af" }} />
        <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}b`} width={48} />
        <Tooltip formatter={(v) => [tl(Number(v)), "Gelir"]} />
        <Bar dataKey="value" fill="#e11d48" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Randevu doluluk (gün bazında) ──────────────────────────────────────────
export function FillLine({ data }: { data: { label: string; booked: number; capacity: number }[] }) {
  if (!data.some((d) => d.capacity > 0 || d.booked > 0)) return <Empty label="Randevu verisi yok." />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9ca3af" }} />
        <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} allowDecimals={false} width={32} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="booked" name="Dolu" stroke="#e11d48" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="capacity" name="Kapasite" stroke="#9ca3af" strokeWidth={2} strokeDasharray="4 4" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Personel performansı ───────────────────────────────────────────────────
export function StaffBars({ data, valueLabel = "Gelir", money = true }: { data: { label: string; value: number }[]; valueLabel?: string; money?: boolean }) {
  if (!data.some((d) => d.value > 0)) return <Empty label="Personel verisi yok." />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(240, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12, fill: "#9ca3af" }} tickFormatter={money ? (v) => `₺${(v / 1000).toFixed(0)}b` : undefined} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "#374151" }} width={110} />
        <Tooltip formatter={(v) => [money ? tl(Number(v)) : Number(v), valueLabel]} />
        <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Pasta (durum/kategori dağılımı) ────────────────────────────────────────
export function DistributionPie({ data }: { data: { name: string; value: number }[] }) {
  if (!data.some((d) => d.value > 0)) return <Empty label="Veri yok." />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
