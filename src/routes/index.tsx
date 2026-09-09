import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, Radar, ShieldCheck, Truck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MarichiFleet — Transport ERP & live logistics control tower" },
      {
        name: "description",
        content:
          "MarichiFleet runs bookings, dispatch, live tracking, proof of delivery, invoicing and payments for road freight fleets in one control tower.",
      },
      { property: "og:title", content: "MarichiFleet — Transport ERP & live control tower" },
      {
        property: "og:description",
        content: "Booking to dispatch to POD to payment, on one live operating picture for road freight fleets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const ENTRIES = [
  { to: "/app/dashboard", label: "Control tower", desc: "Dispatchers, operations and finance", icon: Radar },
  { to: "/driver/home", label: "Driver app", desc: "Trips, checkpoints, POD and fuel", icon: Truck },
  { to: "/portal/dashboard", label: "Client portal", desc: "Shipments, tracking and invoices", icon: Boxes },
] as const;

const STATS = [
  { v: "18", l: "Vehicles live" },
  { v: "62", l: "Bookings seeded" },
  { v: "3", l: "Branches" },
  { v: "100%", l: "POD-linked invoices" },
];

function Landing() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <span className="font-display text-lg font-semibold tracking-tight">
          Marichi<span className="text-primary">Fleet</span>
        </span>
        <Link
          to="/app/dashboard"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Open demo <ArrowRight className="size-4" aria-hidden />
        </Link>
      </header>

      <section className="grid-canvas border-y border-border">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Transport ERP</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-6xl">
            Every load, vehicle and rupee on one live operating picture.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            MarichiFleet connects booking, dispatch, live tracking, proof of delivery, invoicing and
            collections — so nothing falls between the phone call and the payment.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/app/dashboard"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Enter the control tower <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              to="/portal/dashboard"
              className="inline-flex items-center rounded-md border border-border-strong px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
            >
              See the client view
            </Link>
          </div>
          <dl className="mt-14 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.l}>
                <dt className="numeric font-display text-3xl font-semibold">{s.v}</dt>
                <dd className="text-xs uppercase tracking-wide text-muted-foreground">{s.l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-2xl font-semibold">Choose an experience</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The demo runs on seeded Indian fleet data. Switch personas anytime from the top bar.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {ENTRIES.map((e) => (
            <Link
              key={e.to}
              to={e.to}
              className="group rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/60"
            >
              <e.icon className="size-6 text-primary" aria-hidden />
              <h3 className="mt-4 font-display text-lg font-semibold">{e.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{e.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary">
                Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-3">
          {[
            { t: "Dispatch that checks itself", d: "Only compliant, available vehicles and rested drivers are offered — with the reason shown when one is blocked.", i: ShieldCheck },
            { t: "Proof before paper", d: "An invoice can only be raised against a signed, OTP-verified proof of delivery.", i: Boxes },
            { t: "Live, not last-known", d: "Positions, ETAs and delays refresh continuously, and stale pings are flagged instead of hidden.", i: Radar },
          ].map((f) => (
            <div key={f.t}>
              <f.i className="size-5 text-primary" aria-hidden />
              <h3 className="mt-3 font-display text-base font-semibold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-8 text-xs text-muted-foreground">
          MarichiFleet demo environment · seeded data, simulated GPS and WhatsApp delivery.
        </div>
      </footer>
    </main>
  );
}
