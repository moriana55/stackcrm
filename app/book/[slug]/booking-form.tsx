"use client";

import { useState, useMemo } from "react";

type Service = { id: string; name: string; category: string | null; duration: number; price: number; price_max: number | null; description: string | null };
type Staff = { id: string; name: string; title: string | null; photo: string | null; serviceIds: string[] };
type Schedule = { memberId: string; dayOfWeek: number; startTime: string; endTime: string; breakStart: string | null; breakEnd: string | null; isOff: boolean };

type Props = {
  tenantId: string;
  accent: string;
  services: Service[];
  staff: Staff[];
  schedules: Schedule[];
};

type Step = "service" | "staff" | "datetime" | "info" | "done";

export default function BookingForm({ tenantId, accent, services, staff, schedules }: Props) {
  const [step, setStep] = useState<Step>("service");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedService = services.find((s) => s.id === serviceId);
  const selectedStaff = staff.find((s) => s.id === staffId);

  const availableStaff = useMemo(() => {
    if (!serviceId) return [];
    return staff.filter((s) => s.serviceIds.length === 0 || s.serviceIds.includes(serviceId));
  }, [serviceId, staff]);

  const availableSlots = useMemo(() => {
    if (!date || !selectedService) return [];
    const dayOfWeek = new Date(date + "T12:00:00").getDay();
    const memberSchedules = staffId
      ? schedules.filter((s) => s.memberId === staffId && s.dayOfWeek === dayOfWeek && !s.isOff)
      : schedules.filter((s) => s.dayOfWeek === dayOfWeek && !s.isOff);

    if (memberSchedules.length === 0) return [];

    const slots: string[] = [];
    for (const sched of memberSchedules) {
      let [h, m] = sched.startTime.split(":").map(Number);
      const [endH, endM] = sched.endTime.split(":").map(Number);
      const endMinutes = endH * 60 + endM;
      const duration = selectedService.duration;

      while (h * 60 + m + duration <= endMinutes) {
        if (sched.breakStart && sched.breakEnd) {
          const [bh, bm] = sched.breakStart.split(":").map(Number);
          const [beh, bem] = sched.breakEnd.split(":").map(Number);
          const slotEnd = h * 60 + m + duration;
          const breakStart = bh * 60 + bm;
          const breakEnd = beh * 60 + bem;
          if (!(slotEnd <= breakStart || h * 60 + m >= breakEnd)) {
            m += 30;
            if (m >= 60) { h++; m -= 60; }
            continue;
          }
        }
        const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        if (!slots.includes(label)) slots.push(label);
        m += 30;
        if (m >= 60) { h++; m -= 60; }
      }
    }
    return slots.sort();
  }, [date, staffId, selectedService, schedules]);

  const grouped = useMemo(() => {
    return services.reduce((acc, s) => {
      const cat = s.category || "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
      return acc;
    }, {} as Record<string, Service[]>);
  }, [services]);

  const minDate = new Date().toISOString().split("T")[0];

  async function handleSubmit() {
    if (!serviceId || !date || !time || !name.trim()) return;
    setSubmitting(true);
    setError("");

    const [h, m] = time.split(":").map(Number);
    const endMin = h * 60 + m + (selectedService?.duration ?? 30);
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;

    const res = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        service_id: serviceId,
        member_id: staffId,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_email: email.trim(),
        booking_date: date,
        start_time: time,
        end_time: endTime,
        notes: notes.trim(),
        amount: selectedService?.price ?? 0,
      }),
    });

    if (!res.ok) {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    setStep("done");
    setSubmitting(false);
  }

  if (step === "done") {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: accent + "15" }}>
          <span className="material-symbols-outlined text-3xl" style={{ color: accent }}>check_circle</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
        <p className="text-gray-500 mb-1">{selectedService?.name} on {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        <p className="text-gray-500">at {time}{selectedStaff ? ` with ${selectedStaff.name}` : ""}</p>
        <p className="text-sm text-gray-400 mt-6">You will receive a confirmation shortly.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <div className="flex items-center gap-2 justify-center">
        {(["service", "staff", "datetime", "info"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step === s ? "text-white" : i < ["service", "staff", "datetime", "info"].indexOf(step) ? "bg-gray-200 text-gray-600" : "bg-gray-100 text-gray-400"
              }`}
              style={step === s ? { backgroundColor: accent } : undefined}
            >
              {i + 1}
            </div>
            {i < 3 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step: Service */}
      {step === "service" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose a service</h2>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="mb-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{cat}</h3>
              <div className="flex flex-col gap-2">
                {items.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setServiceId(s.id); setStep("staff"); }}
                    className={`text-left p-4 rounded-xl border transition-colors hover:border-gray-400 ${serviceId === s.id ? "border-2" : "border-gray-200"}`}
                    style={serviceId === s.id ? { borderColor: accent } : undefined}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{s.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {s.duration >= 60 ? `${Math.floor(s.duration / 60)}h${s.duration % 60 ? ` ${s.duration % 60}m` : ""}` : `${s.duration}min`}
                          {s.description && ` · ${s.description}`}
                        </div>
                      </div>
                      <span className="font-semibold text-gray-900 text-sm whitespace-nowrap ml-4">
                        ${Number(s.price).toFixed(0)}{s.price_max ? `–$${Number(s.price_max).toFixed(0)}` : ""}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step: Staff */}
      {step === "staff" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose a stylist</h2>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { setStaffId(null); setStep("datetime"); }}
              className="text-left p-4 rounded-xl border border-gray-200 hover:border-gray-400 transition-colors"
            >
              <div className="font-medium text-gray-900 text-sm">No preference</div>
              <div className="text-xs text-gray-500">Any available stylist</div>
            </button>
            {availableStaff.map((s) => (
              <button
                key={s.id}
                onClick={() => { setStaffId(s.id); setStep("datetime"); }}
                className="text-left p-4 rounded-xl border border-gray-200 hover:border-gray-400 transition-colors flex items-center gap-3"
              >
                {s.photo ? (
                  <img src={s.photo} alt={s.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-gray-400">person</span>
                  </div>
                )}
                <div>
                  <div className="font-medium text-gray-900 text-sm">{s.name}</div>
                  {s.title && <div className="text-xs text-gray-500">{s.title}</div>}
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setStep("service")} className="mt-4 text-sm text-gray-500 hover:text-gray-700">Back</button>
        </div>
      )}

      {/* Step: Date & Time */}
      {step === "datetime" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pick date & time</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              min={minDate}
              value={date}
              onChange={(e) => { setDate(e.target.value); setTime(""); }}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none"
            />
          </div>
          {date && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Available times</label>
              {availableSlots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setTime(slot)}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${time === slot ? "text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                      style={time === slot ? { backgroundColor: accent } : undefined}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No available slots for this date.</p>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 mt-4">
            <button onClick={() => setStep("staff")} className="text-sm text-gray-500 hover:text-gray-700">Back</button>
            {time && (
              <button
                onClick={() => setStep("info")}
                className="ml-auto py-2.5 px-6 text-white rounded-xl text-sm font-medium"
                style={{ backgroundColor: accent }}
              >
                Continue
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step: Contact Info */}
      {step === "info" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your details</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none" placeholder="(555) 123-4567" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none resize-y" placeholder="Any special requests..." />
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 p-4 rounded-xl bg-gray-50">
            <div className="text-sm font-medium text-gray-900">{selectedService?.name}</div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at {time}
              {selectedStaff ? ` with ${selectedStaff.name}` : ""}
              {" · "}{selectedService && selectedService.duration >= 60 ? `${Math.floor(selectedService.duration / 60)}h${selectedService.duration % 60 ? ` ${selectedService.duration % 60}m` : ""}` : `${selectedService?.duration}min`}
            </div>
            <div className="text-sm font-semibold text-gray-900 mt-1">${Number(selectedService?.price ?? 0).toFixed(0)}</div>
          </div>

          {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

          <div className="flex items-center gap-3 mt-4">
            <button onClick={() => setStep("datetime")} className="text-sm text-gray-500 hover:text-gray-700">Back</button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || submitting}
              className="ml-auto py-2.5 px-6 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: accent }}
            >
              {submitting ? "Booking..." : "Confirm Booking"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
