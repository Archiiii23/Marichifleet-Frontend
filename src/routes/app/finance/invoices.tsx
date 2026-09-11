import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/finance/invoices")({
  component: InvoiceRoutes,
});

function InvoiceRoutes() {
  return <Outlet />;
}