import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DriverShell } from "@/components/mf/driver-shell";
import { requireSignIn } from "@/domain/guard";

export const Route = createFileRoute("/driver")({
  ssr: false,
  beforeLoad: requireSignIn,
  head: () => ({
    meta: [{ title: "MarichiFleet Driver" }, { name: "robots", content: "noindex" }],
  }),

  component: () => (
    <DriverShell>
      <Outlet />
    </DriverShell>
  ),
});
