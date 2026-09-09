import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PortalShell } from "@/components/mf/portal-shell";

export const Route = createFileRoute("/portal")({
  ssr: false,
  head: () => ({
    meta: [{ title: "MarichiFleet Client Portal" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <PortalShell>
      <Outlet />
    </PortalShell>
  ),
});
