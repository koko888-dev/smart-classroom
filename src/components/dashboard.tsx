"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { systems, sampleLocation, type SchoolSample, type SystemKind } from "@/src/lib/school";

type Metric = { field: string; label: string; unit: string; color: string; decimals: number };
const metrics: Record<SystemKind, Metric[]> = {
  classroom: [
    { field: "temperature", label: "อุณหภูมิ", unit: "°C", color: "#e78045", decimals: 1 },
    { field: "humidity", label: "ความชื้น", unit: "%", color: "#478bd6", decimals: 0 },
    { field: "co2", label: "คาร์บอนไดออกไซด์", unit: "ppm", color: "#259b83", decimals: 0 },
    { field: "people", label: "จำนวนคน", unit: "คน", color: "#8a6ace", decimals: 0 },
  ],
  power: [
    { field: "power_w", label: "กำลังไฟขณะนี้", unit: "W", color: "#d68b24", decimals: 0 },
    { field: "energy_kwh", label: "พลังงานสะสม", unit: "kWh", color: "#259b83", decimals: 4 },
  ],
};
function formatTime(time: string) {
  return new Date(time).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function reading(sample: SchoolSample, field: string) {
  return Number((sample as unknown as Record<string, unknown>)[field]);
}
export default function Dashboard({ kind, location }: { kind: SystemKind; location: string }) {
  const [latest, setLatest] = useState<SchoolSample | null>(null);
  const [history, setHistory] = useState<SchoolSample[]>([]);
  const [status, setStatus] = useState<"connecting" | "connected" | "reconnecting">("connecting");
  const [historyError, setHistoryError] = useState(false);

  useEffect(() => {
    const abort = new AbortController();
    const params = new URLSearchParams({ [systems[kind].tag]: location });
    const matches = (sample: SchoolSample) => sample.kind === kind && sampleLocation(sample) === location;
    const merge = (existing: SchoolSample[], incoming: SchoolSample[]) => {
      const cutoff = Date.now() - 3600000;
      const samples = new Map(existing.map((sample) => [sample.time, sample]));
      for (const sample of incoming) if (matches(sample)) samples.set(sample.time, sample);
      return Array.from(samples.values()).filter((sample) => Date.parse(sample.time) >= cutoff)
        .sort((a, b) => a.time.localeCompare(b.time));
    };
    const loadHistory = async () => {
      try {
        const response = await fetch(`/api/${kind}/history?${params}`, { cache: "no-store", signal: abort.signal });
        if (!response.ok) throw new Error("Cannot load history");
        const samples: SchoolSample[] = await response.json();
        if (!abort.signal.aborted) {
          setHistory((existing) => merge(existing, samples));
          const last = samples[samples.length - 1];
          if (last) setLatest((previous) => !previous || last.time > previous.time ? last : previous);
          setHistoryError(false);
        }
      } catch (error) {
        if (!abort.signal.aborted) { console.error(error); setHistoryError(true); }
      }
    };
    const events = new EventSource(`/api/${kind}/stream?${params}`);
    events.onopen = () => {
      if (abort.signal.aborted) return;
      setStatus("connected");
      void loadHistory();
    };
    events.onmessage = (event) => {
      if (abort.signal.aborted) return;
      const sample: SchoolSample = JSON.parse(event.data);
      if (!matches(sample)) return;
      setLatest((previous) => !previous || sample.time > previous.time ? sample : previous);
      setHistory((existing) => merge(existing, [sample]));
    };
    events.onerror = () => { if (!abort.signal.aborted) setStatus("reconnecting"); };
    return () => { abort.abort(); events.close(); };
  }, [kind, location]);

  return <>
    <div className="live-bar" role="status">
      <span className={`connection ${status === "connected" ? "online" : ""}`}>
        <span className="status-dot" />
        {status === "connected" ? "เชื่อมต่อข้อมูลสดแล้ว" : status === "connecting" ? "กำลังเชื่อมต่อ..." : "กำลังเชื่อมต่อใหม่..."}
      </span>
      <span>บันทึกล่าสุด <strong>{latest ? formatTime(latest.time) : "—"}</strong></span>
      <span className="cadence">ข้อมูลใหม่ทุก 5 วินาที</span>
    </div>
    {historyError && <p role="alert" className="alert">โหลดข้อมูลย้อนหลังไม่สำเร็จ จะลองใหม่เมื่อเชื่อมต่ออีกครั้ง</p>}
    <section className={`cards ${kind === "power" ? "power-cards" : ""}`} aria-label="ค่าล่าสุด">
      {metrics[kind].map((metric) => <article className="card" key={metric.field}>
        <div className="metric-label"><span className="metric-mark" style={{ background: metric.color }} />{metric.label}</div>
        <p className="metric-value">{latest ? reading(latest, metric.field).toLocaleString("th-TH", { minimumFractionDigits: metric.decimals, maximumFractionDigits: metric.decimals }) : "—"}<span>{metric.unit}</span></p>
        <div className="metric-foot">{kind === "classroom" ? `ห้อง ${location}` : `อาคาร ${location}`}</div>
      </article>)}
    </section>
    {!latest && <div className="empty-state" role="status">ยังไม่มีข้อมูลของ{kind === "classroom" ? "ห้อง" : "อาคาร"} {location} กำลังรอข้อมูลจากเครื่องวัดจำลอง</div>}
    {kind === "power" && <p className="energy-note">กำลังไฟ (W) คือการใช้ไฟขณะนั้น ส่วนพลังงานสะสม (kWh) จะเพิ่มตามกำลังไฟและเวลาที่ผ่านไป</p>}
    <div className="section-heading"><h2>แนวโน้มย้อนหลัง</h2><span>ช่วง 1 ชั่วโมงล่าสุด</span></div>
    <section className="charts" aria-label="กราฟย้อนหลัง">
      {metrics[kind].map((metric) => <article className="chart" key={metric.field}>
        <div className="chart-heading"><h3>{metric.label}</h3><span>{metric.unit}</span></div>
        {history.length ? <ResponsiveContainer width="100%" height={240}>
          <LineChart data={history} margin={{ top: 10, right: 12, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e9eef3" />
            <XAxis dataKey="time" tickFormatter={formatTime} minTickGap={40} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis width={64} domain={["auto", "auto"]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => Number(value).toLocaleString("th-TH", { maximumFractionDigits: metric.decimals })} />
            <Tooltip labelFormatter={(label) => formatTime(String(label))} formatter={(value) => [`${Number(value).toLocaleString("th-TH", { maximumFractionDigits: metric.decimals })} ${metric.unit}`, metric.label]} />
            <Line type="linear" dataKey={metric.field} stroke={metric.color} strokeWidth={2} dot={history.length === 1} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer> : <div className="chart-empty">ยังไม่มีข้อมูลย้อนหลัง</div>}
      </article>)}
    </section>
  </>;
}


