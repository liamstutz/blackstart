# Product feedback

## MCP 2025-11-25 / Alexa+ hackathon path

**Use:** A self-hosted Streamable HTTP server exposes three read-only tools. The browser simulator initializes MCP, discovers the tools, and invokes them to generate and compare outage plans.

**What worked:** The protocol's separation of tool schemas, execution, and structured results let the numerical engine stay independent of the conversation. Real HTTP calls made it possible to test tool discovery and invalid inputs without Amazon hardware. The FAQ's local-repository judging route reduced hosting friction.

**What needs work:** The generic current “build a server” guide is oriented toward stdio and a desktop client, while this track requires a dated minimum specification and Streamable HTTP. A task-specific starter that opens with the exact transport, version header, initialize exchange, and HTTP Accept headers would reduce setup mistakes.

**Onboarding:** Read the hackathon rules and FAQ, followed the MCP documentation, then built a small local JSON-response transport and a visible request trace. The FAQ made the unavailable Alexa+ preview tools explicit, so the project used the permitted self-hosted route.

**Would build again:** Yes. The portable tool interface is a strong fit for a domain where a conversational layer should call audited calculations rather than improvise numerical answers. Production Alexa integration remains untested.

## Node.js standard library

**Use:** HTTP service, file serving, and the built-in test runner. No third-party runtime packages are installed.

**What worked:** Straightforward local setup and deterministic tests; source is easy for judges to run without credentials.

**Needs work / tradeoff:** A hand-written transport requires deliberate protocol and input validation. The current implementation is a deliberately small read-only subset, not a general-purpose MCP framework. A future production version should adopt a maintained SDK and run a broader interoperability suite.

**Onboarding / reuse:** One command to start, one command to test. Would use it again for a compact, reproducible prototype.

## Browser APIs: Fetch, SVG, speech synthesis

**Use:** Fetch sends actual MCP requests; SVG renders the battery scenarios; optional speech synthesis reads the calculated summary.

**What worked:** A responsive UI can expose the same result in spoken and visual form. No microphone access or remote speech service is needed.

**Needs work:** Browser voices and speech availability vary. The fallback is readable text; actual Alexa speech rendering and device behavior are not validated.

**Onboarding / reuse:** Standard browser APIs keep the demo self-contained. Would reuse them for a simulator, while validating voice behavior on the target device before deployment.

## ChatGPT / Codex

**Use:** Substantial assistance with project implementation, design, tests, documentation, and preparation of submission materials.

**What worked:** Rapid iteration across code and browser observations, with explicit regression tests for the domain constraints.

**Needs work:** Generated code still required checking: an initial schema declaration had a syntax error, caught before the server could run and repaired. Tests and UI inspection were necessary; generated output was not treated as proof.

**Would use again:** Yes, with the same distinction between generated drafts and verified behavior.

## AWS usage

None in this version. No AWS runtime, Kiro, Bedrock, AgentCore, Ring, Bee, or Fire TV integration is claimed.

## Feature requests

1. **Important:** A public local Alexa+ MCP conformance harness pinned to the accepted hackathon specification. It should exercise initialize, Accept headers, notifications, tool errors, structured results, and spoken responses.
2. **Important:** A reference interaction for changes to protected user preferences. A voice assistant should distinguish “compare a scenario” from “change my protected loads.”
3. **Nice to have:** A standard compact result card for units, assumptions, and source timestamps so numerical tools can provide a short spoken answer with an inspectable visual receipt.
