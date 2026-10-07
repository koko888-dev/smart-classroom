This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Classroom simulation

Start the app with `npm run dev`, then run `npm run generator` in a second terminal.
Configure `INFLUX_URL`, `INFLUX_TOKEN`, `INFLUX_ORG`, and `INFLUX_BUCKET` in `.env.local`.
The generator targets `http://localhost:3000`; set `CLASSROOM_APP_URL` if the app uses another address.

The simulator produces a sample every five seconds. Environmental values move gradually,
and occasional entry/exit events change occupancy by 1–3 people. This is a demo scenario,
not a calibrated physical sensor model. After InfluxDB confirms each write, the generator
posts that sample to the authenticated publish endpoint, which immediately forwards it
to connected browsers through SSE. There is no periodic database polling. A browser
reads stored data when it connects or reconnects, and deduplicates samples by timestamp.
Failed notifications are retried on the next sample, with up to one hour of pending samples.

The event subscribers live in one local Next.js process. Multiple server instances would
need a shared message broker. Previously saved random data remains visible until it leaves
the one-hour history window. Run `npm test` to check simulation continuity and bounds.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
