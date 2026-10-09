export const managerRoles = ["manager", "property_manager", "content_manager"] as const;
export type ManagerRole = typeof managerRoles[number];
export const managerApps: Record<ManagerRole, { label: string; login: string }> = {
  manager: { label: "Primefield Farm", login: "https://farm.primefieldagric.com/login" },
  property_manager: { label: "Property", login: "https://leads.ultratidycleaning.com/property/login" },
  content_manager: { label: "Content", login: "https://leads.ultratidycleaning.com/content/login" },
};
export function isManagerRole(role: string): role is ManagerRole {
  return (managerRoles as readonly string[]).includes(role);
}
