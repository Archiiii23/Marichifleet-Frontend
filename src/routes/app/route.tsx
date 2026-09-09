import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/mf/app-shell";

export const Route = createFileRoute("/app")({
  ssr: false,
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
