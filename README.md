# Blackstart

**Keep the essentials. Know the limit.**

A portable-battery outage rehearsal for renters, with a working MCP server and an Alexa+ conversational simulator. Built for **Build, Ship, Shape: Amazon Developer Hackathon 2026 — Alexa+ track**.

Blackstart turns a battery's nameplate capacity into a specific plan: which appliances can stay on, what must wait, and which constraint breaks first. It distinguishes stored energy (Wh), running power (W), startup demand (W), and a reserve the planner cannot spend.

## Run it in under a minute

Install Node.js 22 or later from [nodejs.org](https://nodejs.org/). No package installation, account, API key, hardware, or paid service is needed.

```sh
node server.mjs
```

Open **http://127.0.0.1:4173**. The MCP endpoint is **http://127.0.0.1:4173/mcp**.

```sh
node --test
```

The test suite includes hand-calculated energy balances, an impossible target, protected-load preservation, charge at or below reserve, separate running/surge failures, a deterministic scenario sweep, and real HTTP MCP discovery and execution.

## Judge's walkthrough

1. Open the app. The synthetic 1,536 Wh battery starts at 80% charge, retains a 15% nameplate reserve, and uses 88% conversion efficiency. That leaves **878.592 AC Wh** above reserve.
2. All five appliances last **4.48 hours** in the high-use scenario. The optimizer protects the refrigerator and router, adds the higher-priority 9 W light, and defers the fan and laptop. The recommended 101 W total reaches reserve in **8.70 hours**.
3. Click **What if it lasts 12 hours?** The protected pair needs 1,104 Wh. Blackstart reports a **225.408 Wh shortfall** and preserves the protected loads. It does not claim the target is achievable.
4. Reset; click **Can I add a kettle?** The sample 1,800 W kettle exceeds the 1,500 W continuous rating even by itself. Extra battery capacity cannot fix that mismatch.
5. Reset; edit the refrigerator's high-use duty cycle, protect a different appliance, or change starting charge. Every result is recalculated through MCP.
6. Open the **calculation receipt** and **live MCP tool trace**. These expose the inputs, formulas, tool requests, and structured results behind the answer.

## What actually works

- Dependency-free Node.js server implementing the tool-serving subset of **MCP 2025-11-25 over Streamable HTTP**, with JSON responses, initialization, notification handling, tool discovery, tool execution, and ping.
- Three runtime tools: `get_outage_example`, `plan_backup_power`, and `compare_outage_plan`.
- A deterministic, bounded subset optimizer (up to 12 loads) that retains all enabled protected loads and compares optional loads lexicographically by priority.
- Separate energy, continuous power, and simultaneous-start surge constraints.
- Typical and high-use duty-cycle scenarios; no invented confidence intervals.
- Responsive browser UI, editable appliance assumptions, typed follow-ups, optional browser speech playback, and a downloadable JSON receipt.
- Local-only operation, no telemetry or external requests, local Origin/Host checks, and a restrictive content security policy.

## What this is not

The browser is an explicitly labeled **rule-based conversational simulator**, not an LLM or an authenticated Alexa+ connection. It invokes the real MCP tools; it does not imitate Amazon's private API. It does not control appliances, measure battery telemetry, forecast grid restoration, guarantee internet availability, or model food/medicine temperatures. It is not validated for medical equipment. No AWS service is used in this version, and no AWS Builder qualification is claimed.

The browser maintains the active scenario in memory. Reloading resets it. Export the receipt to preserve the inputs and result. The local app can run without internet while its laptop has power; Alexa itself and home internet may be unavailable during an outage, so the primary use is **rehearsal before an outage**.

## Calculations

```text
usable DC Wh = capacity Wh × max(0, charge % − reserve %) / 100
usable AC Wh = usable DC Wh × efficiency % / 100
high-use draw W = Σ(running W × high-use duty % / 100) + idle W
target energy Wh = high-use draw W × target hours
runtime to reserve h = usable AC Wh / high-use draw W
continuous peak W = Σ(running W)
simultaneous startup W = Σ(startup W)
```

Idle power is explicitly **AC-equivalent** overhead and is charged when at least one load is selected. A startup assumption is a bound supplied by the user, not a measurement. The prototype checks startup power but does not model transient duration or waveform. Actual temperature, battery age, varying inverter efficiency, unmodeled load variation, and rating accuracy can change real runtime. Solar input is zero. A successful calculation is conditional on these inputs.

## Architecture

The web simulator initializes an MCP client, discovers tools, and sends `tools/call` requests to `/mcp`. The server dispatches those requests to the same pure planning engine used by the tests. The engine validates the inputs and returns structured calculations plus a concise spoken summary. The browser renders a chart, load selection, physical-limit checks, and the underlying calculation receipt.

| File | Responsibility |
| --- | --- |
| `server.mjs` | HTTP transport, MCP lifecycle, tool dispatch, local origin restrictions, static app |
| `engine.mjs` | Validation, energy accounting, constraints, subset selection, scenarios |
| `tools.mjs` | Discoverable tool schemas and handlers |
| `index.html`, `app.js`, `style.css` | UI, conversation intent rules, MCP client, chart and receipt |
| `engine.test.mjs`, `mcp.test.mjs` | Calculation and transport tests |
| Root Markdown documents | Submission text, feedback, friction log, demo script |

The HTTP implementation intentionally supports the required read-only tool subset. It does not offer server-initiated SSE events, subscriptions, remote OAuth, or sampling. GET `/mcp` returns 405 as permitted for servers without a standalone event stream. Do not expose this local development service publicly without adding deployment-appropriate authentication and TLS.

## Connect an MCP client

Use the Streamable HTTP URL `http://127.0.0.1:4173/mcp`, initialize with version `2025-11-25`, and include `Accept: application/json, text/event-stream`. Subsequent calls send `MCP-Protocol-Version: 2025-11-25`. Begin with `get_outage_example`, then pass the returned object to `plan_backup_power`.

An agent should ask for missing ratings, use `spokenSummary` to answer, preserve protected loads, and describe all results as conditional estimates. See [agent instructions](AGENT-INSTRUCTIONS.md) and [testing instructions](TESTING.md).

## Build provenance

New project created during the October 2026 submission window for Liam Stutz. Developed with substantial AI assistance through ChatGPT/Codex, including implementation, tests, interface, and draft submission material. The current project has not been field-tested with battery hardware or independently validated by users. No claims of interviews, deployments, measured savings, or production Alexa access are made.

MIT licensed. All sample household data is synthetic. No third-party music, stock footage, or product logos are included.

## References

- [Hackathon rules](https://amazonappdev2026.devpost.com/rules)
- [Hackathon FAQ: preview access and local judging](https://amazonappdev2026.devpost.com/details/faqs)
- [MCP 2025-11-25 transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [MCP tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)

The planning assumptions are illustrative engineering inputs, not sourced appliance specifications.
