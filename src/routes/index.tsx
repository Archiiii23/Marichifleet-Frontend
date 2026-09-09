import { createFileRoute } from "@tanstack/react-router";

import { SmoothScroll } from "@/components/site/smooth-scroll";
import { SiteNav } from "@/components/site/nav";
import { HeroStage } from "@/components/site/hero-stage";
import { BillingScene, ControlScene, DeliveryScene, FinalScene, MovementScene, ProblemScene } from "@/components/site/landing-scenes";

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
    <div className="marketing-site">
      <SmoothScroll />
      <SiteNav />

      <main className="relative bg-background text-foreground">
        <HeroStage />
        <ProblemScene />
        <ControlScene />
        <MovementScene />
        <DeliveryScene />
        <BillingScene />
        <FinalScene />
      </main>
    </div>
  );
}
