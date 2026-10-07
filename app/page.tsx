"use client";

import { useEffect, useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type LatestData = {
  time: string;
  room: string;
  temperature: number;
  humidity: number;
  co2: number;
  people: number;
};

type HistoryData = {
  time: string;
  temperature?: number;
  humidity?: number;
  co2?: number;
  people?: number;
};

function formatTime(time: string) {
  return new Date(time).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function Home() {
  const [latest, setLatest] = useState<LatestData | null>(null);
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [connected, setConnected] = useState(false);
  const [historyError, setHistoryError] = useState(false);

  useEffect(() => {
    const abort = new AbortController();
    const mergeHistory = (existing: HistoryData[], incoming: HistoryData[]) => {
      const cutoff = Date.now() - 60 * 60 * 1000;
      // Use the full timestamp as the identity, even when sensor values are equal.
      const samples = new Map(existing.map((sample) => [sample.time, sample]));
      for (const sample of incoming) samples.set(sample.time, sample);
      return Array.from(samples.values())
        .filter((sample) => Date.parse(sample.time) >= cutoff)
        .sort((a, b) => a.time.localeCompare(b.time));
    };
    const loadHistory = async () => {
      try {
        const response = await fetch("/api/classroom/history", {
          cache: "no-store",
          signal: abort.signal,
        });
        if (!response.ok) throw new Error("Cannot load classroom history");
        const samples: HistoryData[] = await response.json();
        if (!abort.signal.aborted) {
          setHistory((existing) => mergeHistory(existing, samples));
          setHistoryError(false);
        }
      } catch (error) {
        if (!abort.signal.aborted) {
          console.error(error);
          setHistoryError(true);
        }
      }
    };
    const events = new EventSource("/api/classroom/stream");
    events.onopen = () => {
      setConnected(true);
      // Reload on reconnect to recover history missed during a disconnection.
      void loadHistory();
    };
    events.onmessage = (event) => {
      const sample: LatestData = JSON.parse(event.data);
      setLatest((previous) =>
        !previous || sample.time > previous.time ? sample : previous,
      );
      setHistory((existing) => mergeHistory(existing, [sample]));
    };
    events.onerror = () => setConnected(false);
    return () => {
      abort.abort();
      events.close();
    };
  }, []);

  if (!latest) {
    return <main>{connected ? "กำลังรอข้อมูลจากเครื่องวัด..." : "กำลังเชื่อมต่อข้อมูลสด..."}</main>;
  }

  return (
    <main className="container">

      <h1>{latest.room}</h1>

      <p role="status">
        {connected ? "เชื่อมต่อข้อมูลสดแล้ว" : "การเชื่อมต่อขาด กำลังเชื่อมต่อใหม่..."}
        {" · บันทึกล่าสุด: "}{formatTime(latest.time)}
        {" · สร้างข้อมูลทุก 5 วินาที"}
      </p>
      {historyError && <p role="alert">โหลดข้อมูลย้อนหลังไม่สำเร็จ</p>}

      <div className="cards">

        <div className="card">
          <h2>Temperature</h2>
          <p>{latest.temperature} °C</p>
        </div>

        <div className="card">
          <h2>Humidity</h2>
          <p>{latest.humidity} %</p>
        </div>

        <div className="card">
          <h2>CO₂</h2>
          <p>{latest.co2} ppm</p>
        </div>

        <div className="card">
          <h2>People</h2>
          <p>{latest.people}</p>
        </div>

      </div>

      <div className="chart">
        <h2>Temperature ย้อนหลัง</h2>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={history}>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="time" tickFormatter={formatTime} />

            <YAxis />

            <Tooltip labelFormatter={(label) => formatTime(String(label))} />

            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="temperature"
            />

          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart">
        <h2>CO₂ ย้อนหลัง</h2>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={history}>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="time" tickFormatter={formatTime} />

            <YAxis />

            <Tooltip labelFormatter={(label) => formatTime(String(label))} />

            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="co2"
            />

          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart">
        <h2>People ย้อนหลัง</h2>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={history}>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="time" tickFormatter={formatTime} />

            <YAxis />

            <Tooltip labelFormatter={(label) => formatTime(String(label))} />

            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="people"
            />

          </LineChart>
        </ResponsiveContainer>
      </div>

    </main>
  );
}
