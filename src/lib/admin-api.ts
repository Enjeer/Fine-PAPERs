import { adminApi } from "@/lib/admin-auth-api";

export interface AdminSection {
  key: "dashboard" | "role_management" | "support";
  label: string;
  path: string;
}

export interface AdminProfile {
  user: {
    id: string;
    user_name: string;
  };
  roles: string[];
  permissions: string[];
  sections: AdminSection[];
}

export interface AdminRole {
  name: "Admin" | "Support" | "Moderator" | "Analyst";
  label: string;
}

export interface UserRoleAssignment {
  user: {
    id: string;
    user_name: string;
    is_superuser: boolean;
  };
  roles: AdminRole["name"][];
}

export async function getAdminProfile() {
  const response = await adminApi.get<AdminProfile>("admin/me/");
  return response.data;
}

export async function getAdminRoles() {
  const response = await adminApi.get<AdminRole[]>("admin/roles/");
  return response.data;
}

export async function getUserRoleAssignment(userId: string) {
  const response = await adminApi.get<UserRoleAssignment>(
    `admin/users/${encodeURIComponent(userId)}/roles/`,
  );
  return response.data;
}

export async function updateUserRoleAssignment(
  userId: string,
  payload: { roles: AdminRole["name"][]; reason: string },
) {
  const response = await adminApi.put<UserRoleAssignment>(
    `admin/users/${encodeURIComponent(userId)}/roles/`,
    payload,
  );
  return response.data;
}
