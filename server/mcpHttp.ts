import type { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { OfficeTools } from './ceo.ts';
import { mcpInputWithinBounds } from './mcpInput.ts';

/** Shared, independently testable HTTP handler after the private token lookup.
 * No server is constructed until both the session and the input budget pass.
 */
export async function handleOfficeMcp(office: Pick<OfficeTools, 'serve'> | undefined, req: Request, res: Response) {
  if (!office) {
    res.status(404).json({ jsonrpc: '2.0', error: { code: -32001, message: 'This session has ended.' }, id: null });
    return;
  }
  if (!mcpInputWithinBounds(req.body)) {
    res.status(413).json({ jsonrpc: '2.0', error: { code: -32600, message: 'MCP input exceeds the collection or nesting limit.' }, id: null });
    return;
  }
  const server = office.serve();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
