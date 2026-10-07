"use client";

import { useState } from "react";
import Dashboard from "@/src/components/dashboard";
import { systems } from "@/src/lib/school";

export default function ClassroomsPage() {
  const [room, setRoom] = useState("ENG-301");
  return <>
    <header className="page-header">
      <div><div className="eyebrow">ภาพรวมการตรวจวัด / สภาพห้องเรียน</div>
        <h1>สภาพห้องเรียน</h1><p>ติดตามสภาพแวดล้อมและจำนวนคนในห้องเรียน</p>
      </div>
      <div className="source-picker">
        <label htmlFor="room">เลือกห้องเรียน</label>
        <select id="room" value={room} onChange={(event) => setRoom(event.target.value)}>
          {systems.classroom.locations.map((source) => <option key={source} value={source}>ห้อง {source}</option>)}
        </select>
      </div>
    </header>
    <Dashboard key={room} kind="classroom" location={room} />
  </>;
}

