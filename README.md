# School Monitor

Local school dashboard with two independent simulators and immediate SSE updates.

## Run

Configure `INFLUX_URL`, `INFLUX_TOKEN`, `INFLUX_ORG`, and `INFLUX_BUCKET` in `.env.local`.
Run these in three terminals from this directory:

```powershell
npm run dev
npm run generator:classroom
npm run generator:power
```

Open http://localhost:3000. The sidebar selects the classroom or electricity dashboard.
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
posts the samples to `/api/school/publish`. The endpoint authenticates using the server
InfluxDB token, validates the sample, and forwards it to the selected SSE subscribers.
There is no periodic database polling. The browser reads stored history on connection
or reconnection and deduplicates samples by timestamp. Switching dashboards closes the
previous stream and clears its data before connecting to the new location.

`CLASSROOM_APP_URL` optionally overrides the publisher target (default localhost:3000).
Unsent notifications retry on the next cycle, retaining up to 1440 samples per generator.
Historical data is not deleted. The dashboard shows the last hour.

API selection example: `/api/school/history?kind=power&location=SCI`.
The previous `/api/classroom/*` endpoints remain compatible with older commands.
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
