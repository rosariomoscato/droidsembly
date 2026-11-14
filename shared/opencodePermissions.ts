/** Native OpenCode V2 permission rule (not V1 permission/bash/task syntax). */
export interface OpenCodePermissionRule {
  action: string;
  resource: string;
  effect: 'allow' | 'deny' | 'ask';
}
