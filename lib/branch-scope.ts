export type ScopeUser = {
  role?: string | null;
  branch_id?: string | null;
};

type BranchScopedQuery = {
  eq: (column: string, value: string) => unknown;
  in?: (column: string, values: string[]) => unknown;
};

export const MAIN_BRANCH_NAME = "\u0e08\u0e15\u0e38\u0e08\u0e31\u0e01\u0e23";

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
    query.eq("branch_id", "__missing_branch__");
    return query;
  }

  query.eq("branch_id", user.branch_id);
  return query;
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
    query.eq("branch_id", "__missing_branch__");
    return query;
  }

  if (branchIds.length === 1 || !query.in) {
    query.eq("branch_id", branchIds[0]);
    return query;
  }

  query.in("branch_id", branchIds);
  return query;
}
