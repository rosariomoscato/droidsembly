// Bound work before SDK/Zod validation. The Anthropic MCP factory does not expose
// McpServer's maxToolInputElements option; upgrading the SDK alone leaves it off.
export const MCP_MAX_ELEMENTS = 10_000;
export const MCP_MAX_DEPTH = 64;
export const MCP_BODY_LIMIT = '1mb';

/** For parsed JSON only. Count all object keys/array slots, including the envelope,
 * so unknown fields and batches cannot bypass the budget. Never recurse on input.
 */
export function mcpInputWithinBounds(body: unknown): boolean {
  const pending = [{ value: body, depth: 0 }];
  let elements = 0;
  while (pending.length) {
    const { value, depth } = pending.pop()!;
    if (value === null || typeof value !== 'object') continue;
    if (depth > MCP_MAX_DEPTH) return false;
    for (const key in value) {
      if (!Object.hasOwn(value, key)) continue;
      if (++elements > MCP_MAX_ELEMENTS) return false;
      const child = (value as Record<string, unknown>)[key];
      if (child !== null && typeof child === 'object') pending.push({ value: child, depth: depth + 1 });
    }
  }
  return true;
}
