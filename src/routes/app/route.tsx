import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/mf/app-shell";
import { requireSignIn } from "@/domain/guard";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: requireSignIn,
  head: () => ({
    meta: [
      { title: "MarichiFleet ERP — Transport Control Tower" },
      { name: "robots", content: "noindex" },
    ],
  }),

  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
