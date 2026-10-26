# School Monitor

Local school dashboard with two independent simulators and immediate SSE updates.

## ติดตั้งบนเครื่องใหม่ / สำหรับผู้ตรวจงาน

ระบบใช้ฐานข้อมูล InfluxDB ของเครื่องผู้รับงานได้ ไม่ต้องเข้าถึงฐานข้อมูลของผู้จัดทำ
และไม่ต้องมีอุปกรณ์เซนเซอร์ เพราะมีตัวสร้างข้อมูลจำลองห้องเรียนและไฟฟ้าอยู่แล้ว

### 1. เตรียมโปรแกรม

- ติดตั้ง Node.js เวอร์ชัน 20.9.0 ขึ้นไป พร้อม npm (ตามข้อกำหนด Next.js ที่ติดตั้งในโปรเจกต์)
- ติดตั้ง Docker Desktop พร้อม Docker Compose และเปิด Docker Desktop ให้ทำงาน
- เปิด PowerShell ในโฟลเดอร์ `smart-classroom` ที่มี `package.json` และ `compose.yaml`

### 2. เปิดฐานข้อมูลของเครื่องผู้รับงาน

```powershell
docker compose up -d
docker compose ps
```

ครั้งแรกต้องเชื่อมต่ออินเทอร์เน็ตเพื่อดาวน์โหลด image จากนั้นเปิด
[InfluxDB](http://localhost:8086) และเลือก **Get Started** เพื่อตั้งค่าครั้งแรก:

- Username: ตั้งชื่อผู้ใช้ของตนเอง
- Password: ตั้งรหัสผ่านของตนเองตามเงื่อนไขบนหน้าจอ
- Initial Organization Name: `school`
- Initial Bucket Name: `school-monitor`

เก็บ API token ที่หน้าตั้งค่าแสดงไว้สำหรับขั้นตอนถัดไป หากต้องสร้าง token เพิ่มภายหลัง
ให้ไปที่ **Load Data → API Tokens** และให้สิทธิ์อ่านและเขียน bucket `school-monitor`
โทเคนกับรหัสผ่านเข้าสู่เว็บเป็นคนละค่า ห้ามนำรหัสผ่านมาใส่แทนโทเคน

หากพบหน้า Sign In แทน Get Started แสดงว่าฐานข้อมูลชุดนี้เคยตั้งค่าแล้ว
ให้ใช้บัญชีและข้อมูลการเชื่อมต่อเดิม ไม่ต้องสร้างใหม่

Compose ผูกพอร์ต 8086 เฉพาะเครื่องนี้ และใช้ named volumes เก็บข้อมูลกับการตั้งค่า
หากพอร์ต 8086 ถูกใช้โดย InfluxDB ตัวเดิม สามารถใช้ฐานข้อมูลเดิมและข้ามการเปิด Compose ได้
โดยตั้งค่าการเชื่อมต่อในขั้นตอนถัดไปให้ตรงกับฐานข้อมูลนั้น
ไฟล์ Compose นี้ไม่ได้นำข้อมูลจาก InfluxDB ตัวเดิมเข้ามาเอง

### 3. ตั้งค่าการเชื่อมต่อเว็บ

```powershell
Copy-Item .env.example .env.local
```

คำสั่งคัดลอกนี้ใช้กับเครื่องใหม่ที่ยังไม่มี `.env.local` เท่านั้น
หากมีไฟล์อยู่แล้วให้แก้ไฟล์เดิม เพื่อรักษาค่าการเชื่อมต่อที่ใช้อยู่
เปิด `.env.local` และเติม `INFLUX_TOKEN` ด้วย token ของตนเอง
ชื่อ `INFLUX_ORG` และ `INFLUX_BUCKET` ต้องตรงกับค่าที่สร้างไว้
หากตั้งชื่ออื่นให้แก้สองค่านี้ตามนั้น บันทึกไฟล์ก่อนเปิดโปรแกรม

### 4. ติดตั้งแพ็กเกจและเปิดระบบ

```powershell
npm ci
```

เปิดเทอร์มินัลสามช่องในโฟลเดอร์เดียวกัน แล้วรันแยกกัน:

| เทอร์มินัล | คำสั่ง |
| --- | --- |
| 1: เว็บ | `npm run dev` |
| 2: ข้อมูลห้องเรียน | `npm run generator:classroom` |
| 3: ข้อมูลไฟฟ้า | `npm run generator:power` |

รอเว็บแสดงว่าพร้อมใช้งานที่พอร์ต 3000 ก่อนเปิดตัวสร้างข้อมูล
แล้วเข้า [School Monitor](http://localhost:3000) เพื่อดูห้อง ENG-301 / ENG-302
หรือเลือกเมนูการใช้ไฟฟ้าสำหรับอาคาร ENG / SCI
เมื่อบันทึกและส่งข้อมูลสำเร็จ การ์ดจะแสดงค่าและกราฟจะเริ่มสะสมข้อมูลใหม่
ตัวสร้างทำงานโดยมีรอบเป้าหมายทุก 5 วินาที
ฐานข้อมูลใหม่ไม่มีประวัติเดิมย้อนหลังทันที กราฟจึงเริ่มจากข้อมูลที่สร้างหลังเปิดระบบ

หากเว็บเปลี่ยนไปใช้พอร์ตอื่น ให้ตั้ง `CLASSROOM_APP_URL` ให้ตรงกัน
แล้วเปิดตัวสร้างทั้งสองใหม่หลังแก้ `.env.local`

### หยุดและเปิดใช้งานอีกครั้ง

กด Ctrl+C ในเทอร์มินัลเว็บและตัวสร้างทั้งสอง แล้วหยุดฐานข้อมูลด้วย:

```powershell
docker compose down
```

คำสั่งนี้เก็บ named volumes ไว้ จึงเปิดใช้บัญชีและข้อมูลเดิมได้ด้วย
`docker compose up -d` ในโฟลเดอร์เดิม แล้วรันเว็บกับตัวสร้างตามขั้นตอนข้างต้น
อย่าเติม `--volumes` หรือ `-v` ให้คำสั่ง down หากต้องการเก็บข้อมูลไว้

### ไฟล์ที่ต้องส่ง

ส่งซอร์สโค้ด พร้อม `package.json`, `package-lock.json`, `compose.yaml`,
`.env.example`, `README.md` และโฟลเดอร์ `app/`, `src/`, `scripts/`, `tests/`, `public/`
รวมถึงไฟล์ตั้งค่าอื่นของโปรเจกต์ ไม่ต้องส่ง `node_modules/`, `.next/`, `.git/`
หรือ `.env.local` ที่มีโทเคนจริง ให้ผู้รับงานสร้าง `.env.local` ของตนเอง

อ้างอิงการติดตั้งและตำแหน่ง volumes:
[คู่มือติดตั้ง InfluxDB](https://docs.influxdata.com/influxdb/v2/install/?t=Docker),
[โครงสร้างไฟล์ InfluxDB](https://docs.influxdata.com/influxdb/v2/reference/internals/file-system-layout/)

## Run

Configure `INFLUX_URL`, `INFLUX_TOKEN`, `INFLUX_ORG`, and `INFLUX_BUCKET` in `.env.local`.
Run these in three terminals from this directory:

```powershell
npm run dev
npm run generator:classroom
npm run generator:power
```

Open http://localhost:3000 (redirects to `/classrooms`). The sidebar links to separate
pages: `/classrooms` for classroom data and `/power` for electricity data.
The location selector chooses a room or building. Stop a generator with Ctrl+C before
restarting it. Each generator holds an exclusive local port (43101 for classrooms,
43102 for power) to prevent duplicate runs.
Stop any older generator process once before using the new version; older versions did
not acquire the exclusive port.

## Data

| Measurement | Tag | Locations | Fields |
| --- | --- | --- | --- |
| classroom_environment | room | ENG-301, ENG-302 | temperature, humidity, co2, people |
| school_power_usage | building | ENG, SCI | power_w, energy_kwh |

Both generators run every five seconds and retain independent state per location.
Classroom values move gradually; occupancy changes on simulated entry/exit events.
Power loads vary gradually. Cumulative energy uses average power over elapsed time:
`energy_kwh += average_power_w * elapsed_seconds / 3600000`.
The power generator loads the latest saved energy within 30 days on startup, so normal
restarts continue the existing meter instead of resetting it. Simulation is a demo model,
not a calibrated physical device.

Each generator writes its two points as a batch, waits for InfluxDB confirmation, then
posts the samples to its own publish endpoint: `/api/classroom/publish` or
`/api/power/publish`. Each endpoint accepts only its system's samples and authenticates using the server
InfluxDB token, validates the sample, and forwards it to the selected SSE subscribers.
There is no periodic database polling. The browser reads stored history on connection
or reconnection and deduplicates samples by timestamp. Switching dashboards closes the
previous stream and clears its data before connecting to the new location.

`CLASSROOM_APP_URL` optionally overrides the publisher target (default localhost:3000).
Unsent notifications retry on the next cycle, retaining up to 1440 samples per generator.
Historical data is not deleted. The dashboard shows the last hour.

The classroom page uses `/api/classroom/latest`, `/api/classroom/history`, and
`/api/classroom/stream` with a `room` query parameter (ENG-301 or ENG-302).
The power page uses `/api/power/latest`, `/api/power/history`, and `/api/power/stream`
with a `building` query parameter (ENG or SCI). The shared `/api/school/*` API is removed.
Examples: `/api/classroom/history?room=ENG-302`, `/api/power/history?building=SCI`.
Restart both generators after this API change; already-running processes keep their old
publish address until restarted. Shared UI components render charts and the sidebar, while
each page owns its own location selector. Every route contains its own query, validation,
or SSE logic. Only the InfluxDB connection and the event subscriber registry are shared
between APIs; types and dashboard configuration remain in `src/lib/school.ts`.
Event subscribers live in one local Next.js process. A deployment across multiple server
instances would require a shared message broker.

## Check

```powershell
npm test
npm run lint
npx tsc --noEmit
```

Tests cover simulation continuity, independent location state, watt-to-kWh integration,
and preventing duplicate generator processes.
