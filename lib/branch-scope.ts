export type ScopeUser = {
  role?: string | null;
  branch_id?: string | null;
};

type BranchScopedQuery = {
  eq: (column: string, value: string) => BranchScopedQuery;
  in?: (column: string, values: string[]) => BranchScopedQuery;
};

export const MAIN_BRANCH_NAME = "จตุจักร";

export function isAdminRole(user: ScopeUser | null | undefined) {
  const role = (user?.role || "").toLowerCase();
  return role === "admin" || role === "super_admin";
}

export function withBranchScope<T extends BranchScopedQuery>(
  query: T,
  user: ScopeUser | null | undefined
): T {
  if (isAdminRole(user)) {
    return query;
  }

  if (!user?.branch_id) {
    return query.eq("branch_id", "__missing_branch__") as T;
  }

  return query.eq("branch_id", user.branch_id) as T;
}

export function getAccessibleMenuBranchIds(
  user: ScopeUser | null | undefined,
  mainBranchId: string | null
) {
  if (!user?.branch_id) {
    return [];
  }

  if (!mainBranchId || user.branch_id === mainBranchId) {
    return [user.branch_id];
  }

  return [user.branch_id, mainBranchId];
}

export function getInheritedBranchIds(
  branchId: string | null | undefined,
  mainBranchId: string | null
) {
  if (!branchId) {
    return [];
  }

  if (!mainBranchId || branchId === mainBranchId) {
    return [branchId];
  }

  return [branchId, mainBranchId];
}

export function withMenuReadScope<T extends BranchScopedQuery>(
  query: T,
  user: ScopeUser | null | undefined,
  mainBranchId: string | null
): T {
  if (isAdminRole(user)) {
    return query;
  }

  const branchIds = getAccessibleMenuBranchIds(user, mainBranchId);

  if (branchIds.length === 0) {
    return query.eq("branch_id", "__missing_branch__") as T;
  }

  if (branchIds.length === 1 || !query.in) {
    return query.eq("branch_id", branchIds[0]) as T;
  }

  return query.in("branch_id", branchIds) as T;
}
