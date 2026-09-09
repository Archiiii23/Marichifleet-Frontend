import { createFileRoute } from "@tanstack/react-router";

import { BootSequence } from "@/components/site/loader";
import { Cursor } from "@/components/site/cursor";
import { SmoothScroll } from "@/components/site/smooth-scroll";
import { SiteNav } from "@/components/site/nav";
import { HeroStage } from "@/components/site/hero-stage";
import { ChaosToControl, ControlTower, LiveTracking } from "@/components/site/sections-story";
import { Milestones, ProofToMoney, WhatsAppStream } from "@/components/site/sections-lifecycle";
import { FleetIntelligence, FinalMoment, LifecycleSystems, PortScene } from "@/components/site/sections-close";
import { TakeControl } from "@/components/site/take-control";
import { Statement } from "@/components/site/type";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MarichiFleet — Every mile. Under control." },
      {
        name: "description",
        content:
          "MarichiFleet is the transport operating system for road freight: booking, dispatch, live tracking, proof of delivery, invoicing and profitability on one live control tower.",
      },
      { property: "og:title", content: "MarichiFleet — Every mile. Under control." },
      {
        property: "og:description",
        content:
          "One operating system for every vehicle, trip, driver, delivery and rupee. Booking to dispatch to POD to payment, live.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <>
      <BootSequence />
      <SmoothScroll />
      <Cursor />
      <SiteNav />

      <main className="relative bg-background text-foreground">
        {/* FREIGHT → MACHINE → MOVEMENT → ROUTE */}
        <HeroStage />

        {/* CHAOS → CONTROL */}
        <ChaosToControl />

        <Statement
          lines={["Track", "every", "mile."]}
          note="Positions, ETA drift and exceptions refresh continuously. Stale pings are flagged, never hidden."
        />

        {/* CONTROL */}
        <ControlTower />

        {/* DATA / TRACKING */}
        <LiveTracking />

        {/* DELIVERY → PROOF */}
        <Milestones />

        <Statement
          lines={["Prove", "every", "delivery."]}
          note="An invoice can only exist behind a signed, OTP-verified proof of delivery."
        />

        <ProofToMoney />

        {/* AUTOMATION */}
        <WhatsAppStream />

        <Statement lines={["Know", "every", "cost."]} note="Fuel, tolls, driver cost and maintenance land against the trip that caused them." />

        {/* INTELLIGENCE */}
        <FleetIntelligence />

        <LifecycleSystems />

        {/* INTERACTIVE */}
        <TakeControl />

        {/* SCALE */}
        <PortScene />

        <Statement lines={["Control", "the", "fleet."]} />

        {/* FINAL */}
        <FinalMoment />
      </main>
    </>
  );
}
