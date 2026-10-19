# Devpost submission copy

## Name
Blackstart — Know Your Power Runway

## Elevator pitch
An Alexa+ MCP power planner for renters: turn a portable battery into an outage plan that protects essential loads, checks startup surges, and shows exactly when the numbers stop working.

## Inspiration

“How long will my battery last?” sounds like one question. It hides three: how much energy is available, how much power the appliances draw, and whether their startup demand exceeds the inverter's limit.

My interest in energy and software led me to a customer I wanted to build for: an apartment renter with a portable power station, a refrigerator, and no whole-home backup system. A number printed on a battery does not tell that person what can stay running until morning. Their question is personal and specific: “Can I keep the fridge and internet on, and still have something left?”

Blackstart brings that decision into a conversational interface while keeping the arithmetic in a testable engine. The name comes from restarting a power system without relying on the grid. The product starts at the scale of one apartment.

## What it does

Blackstart rehearses an outage using a battery profile, a time target, and appliance priorities. It protects the loads the user marks as essential, reserves a chosen share of the battery, accounts for conversion losses and idle overhead, and selects optional appliances only when the complete plan fits.

The demo starts with a synthetic 1,536 Wh battery at 80% charge. After a 15% reserve and 88% conversion efficiency, it has 878.592 AC Wh to spend. All five selected appliances reach reserve in about 4.5 hours under the high-use assumptions. Keeping the refrigerator, router, and light extends that estimate to 8.7 hours.

Then the conversation changes the problem. “What if it lasts 12 hours?” produces an explicit shortfall while preserving the protected loads. “Can I add a kettle?” catches a different failure: a 1,800 W appliance exceeds a 1,500 W inverter even if there is plenty of energy left.

Every answer has a calculation receipt: assumptions, reserve, losses, power checks, and the resulting load selection. Typical and high-use scenarios make uncertainty visible without pretending to be statistical confidence intervals.

## How it was built

The project uses a dependency-free Node.js server implementing the read-only tool-serving subset of MCP 2025-11-25 over Streamable HTTP. The browser initializes the protocol, discovers three tools, and makes real tool calls to the planning engine. Its developer view exposes the actual request and response trace.

The planner enumerates bounded appliance subsets, preserves all enabled protected loads, and compares optional selections by the user's priority order. It evaluates energy, simultaneous running power, and simultaneous startup demand independently. An impossible plan stays impossible.

The browser experience is explicitly a rule-based Alexa+ conversation simulation. It includes typed follow-ups and optional browser speech playback; it does not claim access to Amazon's gated preview tools or a physical Alexa device. ChatGPT/Codex provided substantial assistance with implementation, testing, design, and submission preparation.

## Challenges

The hardest design problem was deciding what the assistant must never quietly change. Spending the emergency reserve or dropping the refrigerator would make more scenarios appear successful, but would violate the user's intent. Those constraints are enforced in code.

Another challenge was avoiding a deceptively simple watts-times-hours answer. A cycling compressor needs a different treatment for energy than for startup power. The UI separates those figures and makes the higher-use assumption editable.

The hackathon FAQ clarified that the Alexa+ preview toolkit is not available to participants. The implemented path is therefore a real local MCP server plus a clearly labeled browser simulator, with no paid service or private SDK required to reproduce the demo.

## Accomplishments

- A working MCP integration with discoverable tools and visible execution traces.
- A reproducible calculation engine and 24 passing automated tests, including real HTTP protocol tests.
- A complete interface that shows both a useful plan and the point where that plan stops working.
- A demo that runs locally with Node.js and no package installation, API keys, or hardware.

## What I learned

A useful conversational product needs to make its boundaries as understandable as its answers. “This cannot meet your target” is a successful response when it preserves the user's priorities and explains the exact shortfall. Energy software also needs to distinguish uncertainty in the inputs from certainty in the arithmetic.

## What's next

Test the workflow with renters and portable-battery owners; compare modeled demand with plug-in meter measurements; add explicit import of measured usage; and connect the same MCP tools to an approved Alexa+ agent when access is available. Future work would also add saved household profiles and verified manufacturer-specific ratings.

The current version is a rehearsal tool. It does not forecast grid restoration, switch appliances, establish food or medicine safety, or certify medical-device backup. The appliance and battery data are illustrative, and actual performance can differ.

## Track
Alexa+ — self-hosted MCP server, with browser simulation.

## Built with
JavaScript, Node.js, Model Context Protocol, HTML5, CSS3, SVG, Web Speech API, ChatGPT, Codex.

## Mini challenges
No AWS services are used; do not select AWS Builder. Open Source eligibility requires an additional qualifying public contribution and its actual URL; none is claimed in this draft.
