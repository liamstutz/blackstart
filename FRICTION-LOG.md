# Friction log — October 19, 2026

These entries distinguish observed documentation friction from implementation defects. No private SDK access, support conversation, or device test is implied.

## 1. Finding the correct transport starter

- **Task:** Build a server meeting the Alexa+ track's minimum specification and Streamable HTTP requirement.
- **Steps:** Read the official rules, opened the MCP “Build an MCP server” page, then opened the versioned transport specification.
- **Expected:** A direct HTTP example matching the contest's protocol requirements.
- **Observed:** The general tutorial emphasizes stdio and a desktop-client setup; the HTTP Accept, Origin, notification, and protocol-version requirements live in the versioned transport page.
- **Severity:** Important documentation navigation friction; not a runtime outage.
- **Workaround:** Implemented a minimal local transport against the 2025-11-25 reference and added end-to-end tests for its supported methods and failure responses.
- **Suggestion:** Link a pinned, ready-to-run Streamable HTTP starter directly from the hackathon resources, including a browser simulator and a protocol transcript.
- **Evidence:** https://modelcontextprotocol.io/docs/develop/build-server ; https://modelcontextprotocol.io/specification/2025-11-25/basic/transports ; `mcp.test.mjs`.

## 2. Separating Alexa+ preview access from the permitted submission path

- **Task:** Determine whether the demo could use Alexa+ developer tooling directly.
- **Steps:** Read the track rules and the FAQ's preview-access answer before implementing the demo.
- **Expected:** A clear route from track selection to a tool available to entrants.
- **Observed:** The FAQ says Category SDK, MCP Toolkit, CLI and Web Simulator are gated and unavailable to hackathon participants; it directs entrants to a self-hosted server or their own simulation instead.
- **Severity:** Important onboarding constraint, clarified by the FAQ. No attempted access failure is claimed.
- **Workaround:** Built a real MCP server and labeled the browser experience as a simulation throughout the UI and submission.
- **Suggestion:** Put an “available now / preview only” matrix at the start of the Alexa+ resources, alongside the exact eligible alternatives.
- **Evidence:** https://amazonappdev2026.devpost.com/details/faqs ; UI header and developer trace.

## Internal issue, excluded from platform feedback

A missing brace in an initial JavaScript schema caused the MCP test file to fail to import. It was corrected, after which all 24 tests passed. This was a project coding defect, not an Amazon or MCP defect.
