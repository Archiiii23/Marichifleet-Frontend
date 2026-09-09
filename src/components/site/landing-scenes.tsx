import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, CircleAlert, Navigation, ReceiptIndianRupee } from "lucide-react";
import { Reveal } from "./type";

const EVENTS = [
  ["06:42", "Mumbai depot", "Dispatched"],
  ["10:18", "NH48 · Vapi", "Moving"],
  ["14:06", "Ahmedabad", "ETA 17:25"],
];

export function ProblemScene() {
  return (
    <Scene id="problem" number="02" label="The problem" className="bg-foreground text-background">
      <div className="grid gap-12 lg:grid-cols-12 lg:items-end">
        <Reveal className="lg:col-span-8">
          <h2 className="site-display max-w-[11ch] text-[clamp(3.2rem,9vw,8.8rem)]">Freight breaks between handoffs.</h2>
        </Reveal>
        <Reveal delay={120} className="lg:col-span-3 lg:col-start-10">
          <p className="border-t border-background/30 pt-5 text-sm leading-7 text-background/70">
            Calls, spreadsheets and delayed updates separate bookings from vehicles, drivers, delivery proof and cash.
          </p>
        </Reveal>
      </div>
    </Scene>
  );
}

export function ControlScene() {
  return (
    <Scene id="control" number="03" label="One operating picture">
      <div className="grid gap-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <h2 className="site-display text-[clamp(3.2rem,7vw,7rem)]">One control tower.</h2>
          <p className="mt-7 max-w-md text-base leading-7 text-muted-foreground">Every trip, exception and commercial decision lives in the same operational record.</p>
        </Reveal>
        <Reveal delay={120} className="lg:col-span-6 lg:col-start-7">
          <div className="border-y border-border">
            <div className="grid grid-cols-[1fr_auto] items-center border-b border-border py-5">
              <div><p className="numeric text-xs text-muted-foreground">TRIP MF-2409-184</p><p className="mt-2 text-xl font-medium">Mumbai → Ahmedabad</p></div>
              <span className="text-xs uppercase tracking-[0.12em] text-success">On schedule</span>
            </div>
            <div className="grid gap-px bg-border sm:grid-cols-3">
              {[['Vehicle','MH 04 KU 4821'],['Driver','Arjun Patil'],['ETA','17:25']].map(([k,v]) => <div key={k} className="bg-background py-5 sm:px-5"><p className="text-xs text-muted-foreground">{k}</p><p className="numeric mt-2 text-sm">{v}</p></div>)}
            </div>
            <div className="flex items-center gap-3 py-5 text-sm"><CircleAlert className="size-4 text-primary"/><span>One exception needs attention</span><span className="ml-auto text-muted-foreground">Driver rest due in 42 min</span></div>
          </div>
        </Reveal>
      </div>
    </Scene>
  );
}

export function MovementScene() {
  return (
    <Scene id="movement" number="04" label="Live movement" className="overflow-hidden">
      <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
        <Reveal className="lg:col-span-7">
          <div className="relative aspect-[4/3] border border-border bg-sidebar grid-canvas">
            <svg viewBox="0 0 800 600" className="absolute inset-0 size-full" role="img" aria-label="Selected trip moving from Mumbai to Ahmedabad">
              <path d="M105 505 C240 445 258 320 395 302 S582 245 694 96" fill="none" stroke="var(--color-border-strong)" strokeWidth="2" />
              <path d="M105 505 C240 445 258 320 395 302 S582 245 694 96" fill="none" stroke="var(--color-primary)" strokeWidth="4" strokeDasharray="8 12" className="route-line" />
              <circle cx="105" cy="505" r="7" fill="var(--color-foreground)"/><circle cx="694" cy="96" r="7" fill="var(--color-foreground)"/>
              <g transform="translate(395 302)"><circle r="14" fill="var(--color-primary)"/><path d="M-5 0h10M0-5v10" stroke="var(--color-primary-foreground)" strokeWidth="2"/></g>
            </svg>
            <span className="absolute bottom-5 left-5 numeric text-xs text-muted-foreground">19.0760° N / 72.8777° E</span>
          </div>
        </Reveal>
        <Reveal delay={120} className="lg:col-span-4 lg:col-start-9">
          <Navigation className="size-5 text-primary" />
          <h2 className="site-display mt-6 text-[clamp(3rem,6vw,6rem)]">Movement, not dots.</h2>
          <div className="mt-9 border-t border-border">
            {EVENTS.map(([time, place, state]) => <div key={time} className="grid grid-cols-[4rem_1fr_auto] gap-4 border-b border-border py-4 text-sm"><span className="numeric text-muted-foreground">{time}</span><span>{place}</span><span className="text-muted-foreground">{state}</span></div>)}
          </div>
        </Reveal>
      </div>
    </Scene>
  );
}

export function DeliveryScene() {
  return (
    <Scene id="delivery" number="05" label="Delivery proof">
      <div className="grid gap-14 lg:grid-cols-12 lg:items-center">
        <Reveal className="lg:col-span-5"><p className="numeric text-xs text-primary">DELIVERED · 17:11 IST</p><h2 className="site-display mt-5 text-[clamp(3.4rem,7vw,7rem)]">Proof closes the trip.</h2></Reveal>
        <Reveal delay={120} className="lg:col-span-6 lg:col-start-7">
          <div className="border-l-2 border-primary pl-6 sm:pl-10">
            {["Receiver OTP verified", "Signature captured", "Delivery images attached", "Location and time sealed"].map((item) => <div key={item} className="flex items-center gap-4 border-b border-border py-5"><span className="flex size-7 items-center justify-center bg-success text-success-foreground"><Check className="size-4"/></span><span>{item}</span></div>)}
          </div>
        </Reveal>
      </div>
    </Scene>
  );
}

export function BillingScene() {
  return (
    <Scene id="billing" number="06" label="Billing and profitability" className="bg-surface">
      <div className="grid gap-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-5"><ReceiptIndianRupee className="size-6 text-primary"/><h2 className="site-display mt-7 text-[clamp(3.2rem,7vw,7rem)]">Proof becomes cash.</h2><p className="mt-7 max-w-md leading-7 text-muted-foreground">A verified delivery releases the invoice. Every trip cost remains attached, so margin is visible before the month closes.</p></Reveal>
        <Reveal delay={120} className="lg:col-span-6 lg:col-start-7">
          <div className="border-t border-foreground">
            {[['Invoice value','₹86,140'],['Trip cost','₹61,720'],['Gross profit','₹24,420']].map(([k,v],i) => <div key={k} className="flex items-end justify-between border-b border-border py-6"><span className="text-sm text-muted-foreground">{k}</span><span className={`numeric text-3xl sm:text-5xl ${i===2?'text-primary':''}`}>{v}</span></div>)}
            <div className="mt-5 flex justify-between text-xs uppercase tracking-[0.12em]"><span>Margin</span><span className="numeric">28.35%</span></div>
          </div>
        </Reveal>
      </div>
    </Scene>
  );
}

export function FinalScene() {
  return (
    <section id="final" className="flex min-h-[92svh] flex-col justify-between bg-primary px-5 py-24 text-primary-foreground sm:px-10 lg:px-16">
      <p className="numeric text-xs uppercase tracking-[0.16em]">07 / Take control</p>
      <div className="mx-auto w-full max-w-[1600px] py-20"><h2 className="site-display max-w-[12ch] text-[clamp(4rem,11vw,11rem)]">Every mile. Under control.</h2><div className="mt-10 flex flex-wrap gap-3"><Link to="/app/dashboard" className="inline-flex h-12 items-center gap-3 bg-foreground px-6 text-xs font-medium uppercase tracking-[0.12em] text-background">Enter MarichiFleet <ArrowRight className="size-4"/></Link><a href="mailto:demo@marichifleet.com" className="inline-flex h-12 items-center border border-primary-foreground/50 px-6 text-xs font-medium uppercase tracking-[0.12em]">Book a demo</a></div></div>
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-primary-foreground/30 pt-5 text-xs uppercase tracking-[0.12em]"><span>MarichiFleet</span><span>Transport operating system</span><span>© 2026</span></footer>
    </section>
  );
}

function Scene({ id, number, label, className = "", children }: { id: string; number: string; label: string; className?: string; children: React.ReactNode }) {
  return <section id={id} className={`flex min-h-screen items-center px-5 py-28 sm:px-10 lg:px-16 lg:py-36 ${className}`}><div className="mx-auto w-full max-w-[1600px]"><div className="mb-16 flex items-center gap-4 border-t border-current/20 pt-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground"><span className="numeric text-primary">{number}</span><span>{label}</span></div>{children}</div></section>;
}