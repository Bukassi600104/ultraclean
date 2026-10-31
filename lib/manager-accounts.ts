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
export const supportRoles=['farm_vet','farm_accountant'] as const;
export type SupportRole=typeof supportRoles[number];
export const managedStaffRoles=[...managerRoles,...supportRoles] as const;
export type ManagedStaffRole=typeof managedStaffRoles[number];
export const staffApps={...managerApps,farm_vet:{label:'Farm vet · assigned health only',login:'https://farm.primefieldagric.com/login'},farm_accountant:{label:'Farm accountant · assigned reports only',login:'https://farm.primefieldagric.com/login'}};
export function isSupportRole(role:string):role is SupportRole{return (supportRoles as readonly string[]).includes(role);}
export function isManagedStaffRole(role:string):role is ManagedStaffRole{return isManagerRole(role)||isSupportRole(role);}
