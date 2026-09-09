import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/driver/")({
  beforeLoad: () => {
    throw redirect({ to: "/driver/home" });
  },
});
