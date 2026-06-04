"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

type RevenueData = { month: string; revenue: number }[];
type AppointmentData = { day: string; count: number }[];
type StatusData = { name: string; value: number }[];

const COLORS = ["#111827", "#e11d48", "#6366f1", "#f59e0b", "#10b981", "#8b5cf6"];

export function RevenueChart({ data }: { data: RevenueData }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue (6 months)</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} />
          <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, "Revenue"]} />
          <Bar dataKey="revenue" fill="#111827" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AppointmentChart({ data }: { data: AppointmentData }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-4">This Week&apos;s Appointments</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} />
          <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke="#e11d48" strokeWidth={2} dot={{ fill: "#e11d48", r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusPieChart({ data, title }: { data: StatusData; title: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
