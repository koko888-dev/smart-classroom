"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SystemIcon from "@/src/components/system-icon";

export default function Sidebar() {
  const pathname = usePathname();
  return <aside className="sidebar">
    <div className="brand"><span className="brand-symbol"><SystemIcon /></span><div>School Monitor<small>ระบบติดตามโรงเรียน</small></div></div>
    <div className="nav-label">ระบบตรวจวัด</div>
    <nav aria-label="เลือกประเภทข้อมูล">
      <Link href="/classrooms" className={pathname === "/classrooms" ? "nav-item active" : "nav-item"} aria-current={pathname === "/classrooms" ? "page" : undefined}><SystemIcon /><span>สภาพห้องเรียน<small>อุณหภูมิและคุณภาพอากาศ</small></span></Link>
      <Link href="/power" className={pathname === "/power" ? "nav-item active" : "nav-item"} aria-current={pathname === "/power" ? "page" : undefined}><SystemIcon power /><span>การใช้ไฟฟ้า<small>กำลังไฟและพลังงานสะสม</small></span></Link>
    </nav>
    <div className="sidebar-footer"><span className="simulation-badge">ระบบจำลอง</span><p>2 ห้องเรียน · 2 อาคาร</p></div>
  </aside>;
}

