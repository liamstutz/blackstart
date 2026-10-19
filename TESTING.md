# Testing instructions for judges

Requirements: Node.js 22 or later and a modern browser. No credentials, device, database, network access after download, or package installation is required.

Run `node server.mjs` from the repository root, then open `http://127.0.0.1:4173`. Run `node --test` for the automated suite. If port 4173 is occupied, set `PORT` to another available local port before starting.

Test the 8-hour, 12-hour and kettle cases described in README. The sample values are intentionally editable. Try changing a protected appliance's startup demand to 3,000 W: the recommended plan must fail its surge check even if its average consumption is small. Set starting charge to 10% with a 15% reserve: usable energy must become zero.

For MCP clients, use Streamable HTTP at `/mcp`, protocol version `2025-11-25`, and the required HTTP Accept values. Tools are read-only. `get_outage_example` returns a complete object accepted by `plan_backup_power`; `compare_outage_plan` takes `{input: <that object>, change: {horizonHours: 12}}`.

The repo implements the server directly against the protocol rather than claiming a particular SDK import. `server.mjs` is the runtime entry point; the browser calls it, and `mcp.test.mjs` tests it over a real loopback HTTP connection.

Known limitations: no actual Alexa device integration, no LLM in the simulator, no manufacturer-verified data, no hardware validation, no remote-host authentication, no SSE push, no persistence across page reloads, and no production reliability claim. The demo has a deliberately bounded conversational grammar documented in the UI. Unsupported requests receive examples instead of invented results.
