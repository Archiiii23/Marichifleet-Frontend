import type { Role } from "./types";

export type Capability =
  | "view_operations"
  | "view_finance"
  | "edit_finance"
  | "dispatch"
  | "edit_fleet"
  | "edit_booking"
  | "view_workshop"
  | "edit_workshop"
  | "view_admin"
  | "driver_app"
  | "client_portal";

/** Frontend mirror of the database role policies. The database is the real boundary. */
export const CAPABILITIES: Record<Role, Capability[]> = {
  owner: [
    "view_operations", "view_finance", "edit_finance", "dispatch", "edit_fleet",
    "edit_booking", "view_workshop", "edit_workshop", "view_admin",
  ],
  manager: ["view_operations", "view_finance", "dispatch", "edit_fleet", "edit_booking", "view_workshop", "view_admin"],
  dispatcher: ["view_operations", "dispatch", "edit_booking"],
  accountant: ["view_operations", "view_finance", "edit_finance"],
  workshop: ["view_operations", "view_workshop", "edit_workshop", "edit_fleet"],
  viewer: ["view_operations"],
  driver: ["driver_app"],
  client: ["client_portal"],
};

export function roleLabel(role: Role) {
  return {
    owner: "Owner / Director",
    manager: "Operations Manager",
    dispatcher: "Dispatcher",
    driver: "Driver",
    accountant: "Accountant",
    workshop: "Workshop Manager",
    viewer: "Viewer",
    client: "Client",
  }[role];
}

export function homeRouteFor(roles: Role[]): string {
  if (roles.includes("driver") && roles.length === 1) return "/driver/home";
  if (roles.includes("client") && roles.length === 1) return "/portal/dashboard";
  return "/app/dashboard";
}
