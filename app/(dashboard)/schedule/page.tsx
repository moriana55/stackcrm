"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Member = {
  id: string;
  display_name: string | null;
  title: string | null;
};

type Schedule = {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  is_off: boolean;
};

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

export default function SchedulePage() {
  const [supabase] = useState(createClient);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchStaff = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const { data: tenantData } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .limit(1)
        .single();

      if (!tenantData) return;

      const { data, error } = await supabase
        .from("tenant_members")
        .select("id, display_name, title")
        .eq("tenant_id", tenantData.tenant_id)
        .eq("is_bookable", true);

      if (error) throw error;
      setMembers(data || []);
      if (data && data.length > 0) {
        setSelectedMemberId(data[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Error fetching staff:", err);
      setLoading(false);
    }
  }, [supabase]);

  const fetchSchedules = useCallback(async (memberId: string) => {
    await Promise.resolve();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("staff_schedules")
        .select("id, day_of_week, start_time, end_time, break_start, break_end, is_off")
        .eq("member_id", memberId);

      if (error) throw error;

      // Populate missing days default schedule
      const finalScheds = DAYS.map((d) => {
        const found = data?.find((s) => s.day_of_week === d.value);
        return (
          found || {
            day_of_week: d.value,
            start_time: "09:00",
            end_time: "18:00",
            break_start: "12:00",
            break_end: "13:00",
            is_off: d.value === 0, // default Sunday off
          }
        );
      });

      setSchedules(finalScheds);
    } catch (err) {
      console.error("Error fetching schedules:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchStaff(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchStaff]);

  useEffect(() => {
    if (selectedMemberId) {
      const timer = window.setTimeout(() => void fetchSchedules(selectedMemberId), 0);
      return () => window.clearTimeout(timer);
    }
  }, [fetchSchedules, selectedMemberId]);

  async function saveSchedule() {
    setSaving(true);
    setMessage("");
    try {
      const { data: tenantData } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("id", selectedMemberId)
        .single();

      if (!tenantData) throw new Error("Tenant not found");

      const payload = schedules.map((s) => ({
        ...s,
        tenant_id: tenantData.tenant_id,
        member_id: selectedMemberId,
      }));

      // Upsert the schedule records
      const { error } = await supabase.from("staff_schedules").upsert(payload, {
        onConflict: "member_id,day_of_week",
      });

      if (error) throw error;

      setMessage("Working hours saved successfully!");
      setTimeout(() => setMessage(""), 3000);
      void fetchSchedules(selectedMemberId);
    } catch (err: unknown) {
      console.error("Error saving schedule:", err);
      setMessage(`Error: ${err instanceof Error ? err.message : "Schedule could not be saved"}`);
    } finally {
      setSaving(false);
    }
  }

  function handleScheduleChange<K extends keyof Schedule>(dayOfWeek: number, field: K, value: Schedule[K]) {
    setSchedules((prev) =>
      prev.map((s) => (s.day_of_week === dayOfWeek ? { ...s, [field]: value } : s))
    );
  }

  if (loading && members.length === 0) {
    return <div className="py-20 text-center text-sm text-gray-400">Loading schedules...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Staff Schedules</h1>
          <p className="text-sm text-gray-500 mt-1">Configure staff availability, breaks, and off days.</p>
        </div>
        {members.length > 0 && (
          <button
            onClick={saveSchedule}
            disabled={saving}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-sm flex justify-center items-center"
          >
            {saving ? "Saving..." : "Save Schedule"}
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold ${
            message.startsWith("Error")
              ? "bg-red-50 border-red-150 text-red-700"
              : "bg-emerald-50 border-emerald-150 text-emerald-700"
          }`}
        >
          {message}
        </div>
      )}

      {members.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          No bookable staff members found. Ensure you have members marked as bookable.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Member selector tabs */}
          <div className="md:col-span-4 bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
            <div className="text-xs font-bold text-gray-400 uppercase px-2 mb-3">Select Team Member</div>
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMemberId(m.id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all border ${
                  selectedMemberId === m.id
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : "bg-white border-transparent text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div>{m.display_name || "Staff Member"}</div>
                {m.title && <div className="text-xs text-gray-400 font-normal mt-0.5">{m.title}</div>}
              </button>
            ))}
          </div>

          {/* Schedule list */}
          <div className="md:col-span-8 bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {DAYS.map((day) => {
              const sched = schedules.find((s) => s.day_of_week === day.value) || {
                day_of_week: day.value,
                start_time: "09:00",
                end_time: "18:00",
                break_start: "12:00",
                break_end: "13:00",
                is_off: true,
              };

              return (
                <div key={day.value} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Day and Off toggle */}
                  <div className="flex items-center justify-between sm:justify-start gap-4 sm:w-48">
                    <span className="font-semibold text-gray-800 text-sm sm:w-28">{day.label}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!sched.is_off}
                        onChange={(e) => handleScheduleChange(day.value, "is_off", !e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                      <span className="ml-2 text-xs font-semibold text-gray-500 w-8 select-none">
                        {sched.is_off ? "Off" : "Active"}
                      </span>
                    </label>
                  </div>

                  {/* Hours inputs */}
                  {!sched.is_off && (
                    <div className="flex flex-wrap gap-4 items-center sm:justify-end">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Hours:</span>
                        <input
                          type="time"
                          value={sched.start_time.slice(0, 5)}
                          onChange={(e) => handleScheduleChange(day.value, "start_time", e.target.value)}
                          className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 outline-none focus:border-rose-500 focus:bg-white transition-all font-mono"
                        />
                        <span className="text-xs text-gray-400">–</span>
                        <input
                          type="time"
                          value={sched.end_time.slice(0, 5)}
                          onChange={(e) => handleScheduleChange(day.value, "end_time", e.target.value)}
                          className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 outline-none focus:border-rose-500 focus:bg-white transition-all font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Break:</span>
                        <input
                          type="time"
                          value={sched.break_start ? sched.break_start.slice(0, 5) : ""}
                          onChange={(e) => handleScheduleChange(day.value, "break_start", e.target.value || null)}
                          className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 outline-none focus:border-rose-500 focus:bg-white transition-all font-mono"
                        />
                        <span className="text-xs text-gray-400">–</span>
                        <input
                          type="time"
                          value={sched.break_end ? sched.break_end.slice(0, 5) : ""}
                          onChange={(e) => handleScheduleChange(day.value, "break_end", e.target.value || null)}
                          className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 outline-none focus:border-rose-500 focus:bg-white transition-all font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {sched.is_off && (
                    <div className="text-xs text-gray-400 italic sm:text-right pr-4">Staff is not working on this day.</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
