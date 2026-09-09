import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DriverShell } from "@/components/mf/driver-shell";

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [{ title: "MarichiFleet Driver" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <DriverShell>
      <Outlet />
    </DriverShell>
  ),
});
