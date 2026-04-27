export type ScopeUser = {
  role?: string | null;
  branch_id?: string | null;
};

type BranchScopedQuery = {
  eq: (column: string, value: string) => BranchScopedQuery;
};

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
