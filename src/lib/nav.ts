import { useNavigate } from "@tanstack/react-router";

/**
 * Navigation helper for links that come from data (notification deep links,
 * search results) where the path is only known at runtime.
 */
export function useGo() {
  const navigate = useNavigate();
  return (to: string) => navigate({ to: to as unknown as "/" });
}
