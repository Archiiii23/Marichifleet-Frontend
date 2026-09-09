import { useEffect, useState } from "react";
import { BadgeIndianRupee, Check, CheckCheck, FileSignature, FileText, MapPin, Send, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { range, useInView, useSectionProgress } from "@/lib/scroll";
import { Counter, Eyebrow, MaskLines, Reveal } from "./type";

/* ─────────────────────────────────────────────────────────────── MILESTONES */

const MILESTONES = [
  { k: "Booked", d: "Consignment captured with rate card, lane and SLA.", icon: FileText },
  { k: "Dispatched", d: "Only compliant vehicles and rested drivers are offered.", icon: Truck },
  { k: "Tracked", d: "Live position, ETA drift and exception alerts.", icon: MapPin },
  { k: "Delivered", d: "Arrival confirmed at the consignee gate.", icon: Check },
  { k: "POD", d: "OTP-verified signature, photos, timestamp and location.", icon: FileSignature },
  { k: "Invoiced", d: "Invoice can only be raised against a verified POD.", icon: FileText },
  { k: "Paid", d: "Receipt settles receivables and updates trip profit.", icon: BadgeIndianRupee },
];

export function Milestones() {
  const { ref, p } = useSectionProgress<HTMLDivElement>();
  const active = Math.min(MILESTONES.length - 1, Math.floor(range(p, 0.04, 0.96) * MILESTONES.length));

  return (
    <section
      ref={ref}
      className="relative border-t border-border/60"
      style={{ height: `${MILESTONES.length * 70}vh` }}
      aria-label="Reliability at every milestone"
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden px-5 sm:px-10">
        <div className="mx-auto grid w-full max-w-[1600px] gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Eyebrow>The lifecycle</Eyebrow>
            <MaskLines
              lines={["Reliability", "at every", "milestone."]}
              className="mt-5 text-[13vw] font-semibold leading-[0.86] lg:text-[6.6vw]"
            />
            <p className="mt-6 max-w-md text-sm text-muted-foreground">
              Each step is gated by the one before it. Nothing gets invoiced that was never proven delivered.
            </p>
          </div>

          <ol className="relative">
            <span className="absolute left-[13px] top-2 h-[calc(100%-1rem)] w-px bg-border" aria-hidden />
            <span
              className="absolute left-[13px] top-2 w-px bg-primary transition-[height] duration-500 ease-out"
              style={{ height: `${((active + 1) / MILESTONES.length) * 100}%` }}
              aria-hidden
            />
            {MILESTONES.map((m, i) => {
              const on = i <= active;
              return (
                <li
                  key={m.k}
                  className="relative flex gap-5 py-3 transition-all duration-500"
                  style={{ opacity: on ? 1 : 0.28, transform: `translateX(${on ? 0 : 12}px)` }}
                >
                  <span
                    className={cn(
                      "mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-500",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
                    )}
                  >
                    <m.icon className="size-3.5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-semibold uppercase tracking-tight sm:text-2xl">
                      {m.k}
                    </h3>
                    <p className="mt-0.5 max-w-sm text-xs text-muted-foreground sm:text-sm">{m.d}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── WHATSAPP STREAM */

const MESSAGES = [
  { t: "Booking confirmed", b: "BKG-10421 · Pune → Nagpur · 9 T", s: "read" },
  { t: "Driver assigned", b: "Ravi Kadam · MH12 AB 4471", s: "read" },
  { t: "Trip started", b: "Departed Chakan at 06:12", s: "read" },
  { t: "ETA updated", b: "Delayed 40 min · detention at Bhiwandi", s: "delivered" },
  { t: "Delivery completed", b: "Unloaded at 18:52", s: "delivered" },
  { t: "POD available", b: "Signed by S. Deshmukh · OTP verified", s: "sent" },
  { t: "Invoice generated", b: "INV-2291 · ₹ 1,84,500", s: "sent" },
  { t: "Payment received", b: "NEFT · ₹ 1,84,500 settled", s: "sent" },
];

export function WhatsAppStream() {
  const { ref, seen } = useInView<HTMLDivElement>(0.2);
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!seen) return;
    const id = setInterval(() => setN((x) => (x >= MESSAGES.length ? x : x + 1)), 520);
    return () => clearInterval(id);
  }, [seen]);

  return (
    <section className="relative border-t border-border/60 px-5 py-28 sm:px-10 sm:py-36">
      <div ref={ref} className="mx-auto grid max-w-[1600px] gap-14 lg:grid-cols-2 lg:items-center">
        <div>
          <Eyebrow>Automated communication</Eyebrow>
          <MaskLines
            lines={["Your fleet", "talks for you."]}
            className="mt-5 text-[12vw] font-semibold leading-[0.88] lg:text-[6.2vw]"
          />
          <Reveal as="p" className="mt-6 max-w-md text-sm text-muted-foreground sm:text-base">
            Every operational event fires the right message to the right person — client, consignee, driver or
            accounts — and the delivery receipt is written back into the audit trail.
          </Reveal>
          <div className="mt-8 flex gap-8">
            {[
              { k: "Messages / day", v: 1240 },
              { k: "Read rate", v: 96, s: "%" },
              { k: "Manual calls saved", v: 71, s: "%" },
            ].map((x) => (
              <Reveal key={x.k} className="hairline pt-3">
                <div className="font-display text-2xl font-semibold">
                  <Counter to={x.v} suffix={x.s ?? ""} />
                </div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{x.k}</div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/70 p-4 backdrop-blur sm:p-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="numeric text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Communication log
            </span>
            <span className="numeric text-[10px] uppercase tracking-[0.3em] text-success">Connected</span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {MESSAGES.map((m, i) => (
              <li
                key={m.t}
                className={cn(
                  "flex items-start gap-3 rounded-lg border border-border bg-background/70 p-3 transition-all duration-500",
                  i < n ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                )}
                style={{ transitionDelay: `${i * 40}ms` }}
              >
                <Send className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{m.t}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.b}</div>
                </div>
                <span
                  className={cn(
                    "flex items-center gap-1 text-[10px] uppercase tracking-[0.18em]",
                    m.s === "read" ? "text-info" : m.s === "delivered" ? "text-muted-foreground" : "text-muted-foreground/60",
                  )}
                >
                  {m.s === "sent" ? <Check className="size-3" aria-hidden /> : <CheckCheck className="size-3" aria-hidden />}
                  {m.s}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────── POD → INVOICE → MONEY */

export function ProofToMoney() {
  const { ref, p } = useSectionProgress<HTMLDivElement>();
  const sign = range(p, 0.16, 0.42);
  const flip = range(p, 0.46, 0.7);
  const money = range(p, 0.66, 0.95);

  return (
    <section
      ref={ref}
      className="relative border-t border-border/60"
      style={{ height: "300vh" }}
      aria-label="Proof of delivery to payment"
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden px-5 sm:px-10">
        <div className="mx-auto grid w-full max-w-[1600px] gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <Eyebrow>Delivery → proof → money</Eyebrow>
            <MaskLines
              lines={["Prove it.", "Then bill it."]}
              className="mt-5 text-[12vw] font-semibold leading-[0.88] lg:text-[6.2vw]"
            />
            <p className="mt-6 max-w-md text-sm text-muted-foreground">
              The truck stops. The signature lands. The document becomes an invoice, and the invoice becomes
              margin you can see per trip.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-6">
              {[
                { k: "Revenue", v: 184500 },
                { k: "Operating cost", v: 121300 },
                { k: "Trip profit", v: 63200 },
              ].map((x, i) => (
                <div key={x.k} className="hairline pt-3" style={{ opacity: money > i * 0.2 ? 1 : 0.25 }}>
                  <div className="numeric font-display text-lg font-semibold sm:text-2xl">
                    ₹ {Math.round(x.v * money).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{x.k}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md" style={{ perspective: "1200px" }}>
            {/* POD */}
            <div
              className="rounded-xl border border-border bg-card p-6 shadow-2xl"
              style={{
                transform: `rotateY(${flip * -90}deg) translateZ(0)`,
                opacity: 1 - flip,
                transformOrigin: "left center",
              }}
            >
              <div className="numeric text-[10px] uppercase tracking-[0.3em] text-primary">
                Proof of delivery
              </div>
              <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                <div>Trip TRP-8841 · BKG-10421</div>
                <div>Consignee · S. Deshmukh, Nagpur</div>
                <div>OTP verified · 18:52 IST · 21.14°N 79.08°E</div>
              </div>
              <svg viewBox="0 0 300 90" className="mt-6 w-full" role="img" aria-label="Signature">
                <path
                  d="M10,66 C42,10 60,84 88,48 C112,18 128,74 156,52 C180,34 196,72 226,40 C246,20 266,52 292,32"
                  fill="none"
                  stroke="var(--color-foreground)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - sign}
                />
              </svg>
              <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-success">
                <Check className="size-3" aria-hidden /> Signed & verified
              </div>
            </div>

            {/* Invoice */}
            <div
              className="absolute inset-0 rounded-xl border border-primary/50 bg-card p-6 shadow-2xl"
              style={{
                transform: `rotateY(${(1 - flip) * 90}deg)`,
                opacity: flip,
                transformOrigin: "right center",
              }}
            >
              <div className="numeric text-[10px] uppercase tracking-[0.3em] text-primary">Tax invoice</div>
              <div className="mt-1 numeric text-xs text-muted-foreground">INV-2291 · POD-linked</div>
              <dl className="mt-6 space-y-2 text-sm">
                {[
                  ["Freight", "₹ 1,56,000"],
                  ["Detention", "₹ 4,200"],
                  ["Fuel surcharge", "₹ 15,900"],
                  ["GST 5%", "₹ 8,400"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-border/60 pb-1.5">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="numeric">{v}</dd>
                  </div>
                ))}
                <div className="flex justify-between pt-2">
                  <dt className="font-display font-semibold uppercase tracking-wide">Total</dt>
                  <dd className="numeric font-display text-xl font-semibold text-primary">₹ 1,84,500</dd>
                </div>
              </dl>
              <div
                className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-success transition-opacity"
                style={{ opacity: money }}
              >
                <BadgeIndianRupee className="size-3" aria-hidden /> Payment received
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
