const PERMISSION_KEY = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*){1,2}$/;
export function isPermissionKey(value: string): boolean {
  return PERMISSION_KEY.test(value);
}
