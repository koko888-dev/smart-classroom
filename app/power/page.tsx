"use client";

import { useState } from "react";
import Dashboard from "@/src/components/dashboard";
import { systems } from "@/src/lib/school";

export default function PowerPage() {
  const [building, setBuilding] = useState("ENG");
  return <>
    <header className="page-header">
      <div><div className="eyebrow">ภาพรวมการตรวจวัด / การใช้ไฟฟ้า</div>
        <h1>การใช้ไฟฟ้า</h1><p>ติดตามการใช้ไฟฟ้าของแต่ละอาคาร</p>
      </div>
      <div className="source-picker">
        <label htmlFor="building">เลือกอาคาร</label>
        <select id="building" value={building} onChange={(event) => setBuilding(event.target.value)}>
          {systems.power.locations.map((source) => <option key={source} value={source}>อาคาร {source}</option>)}
        </select>
      </div>
    </header>
    <Dashboard key={building} kind="power" location={building} />
  </>;
}

