// Pure check: may this signed-in person open this association?
// scope.all is only the account owner. Everyone else must be listed on that exact name.
export function allows(scope, org) {
  const name = String(org || '').trim();
  if (!name || name.length > 120) return false;
  if (scope?.all) return true;
  return Array.isArray(scope?.orgs) && scope.orgs.includes(name);
}
