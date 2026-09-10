import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PortalShell } from "@/components/mf/portal-shell";
import { requireSignIn } from "@/domain/guard";

export const Route = createFileRoute("/portal")({
  ssr: false,
  beforeLoad: requireSignIn,
  head: () => ({
    meta: [{ title: "MarichiFleet Client Portal" }, { name: "robots", content: "noindex" }],
  }),

  component: () => (
    <PortalShell>
      <Outlet />
    </PortalShell>
  ),
});
