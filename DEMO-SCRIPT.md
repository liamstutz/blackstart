# Demo narration — target under 3 minutes

Use the running browser app. Avoid slides that replace the functioning product. The sample household and all readings are synthetic. Present as an Alexa+ track MCP project with a simulated conversational front end.

## 0:00–0:20 · Open on the working dashboard

A battery can say fifteen hundred watt-hours and still leave you asking one practical question: can I keep the fridge and internet running until morning? Blackstart is an outage rehearsal for apartment renters. It turns battery capacity into a plan, with the limits visible.

## 0:20–0:45 · Compare all loads with the selected plan

This sample battery starts at eighty percent. We keep fifteen percent in reserve and account for conversion losses. All five appliances reach that reserve in about four and a half hours. Blackstart protects the fridge and router, keeps the higher-priority light, and defers the fan and laptop. Under the high-use assumptions, the plan reaches reserve in eight point seven hours.

## 0:45–1:10 · Click the twelve-hour question

Now ask: what if the outage lasts twelve hours? The answer changes. Even the protected pair falls short by two hundred twenty-five watt-hours. Blackstart leaves those loads protected and tells us the target cannot be met. It does not lower the reserve or quietly drop the fridge to manufacture a successful answer.

## 1:10–1:35 · Reset; add the kettle

Here is a different failure. This example kettle draws eighteen hundred watts, but the inverter is rated for fifteen hundred. More stored energy cannot fix a power-limit mismatch. Blackstart checks average energy, running power and startup demand separately. A compressor can use little energy on average and still have a large startup surge.

## 1:35–2:00 · Reset; open the receipt, then the MCP trace

Every number has a receipt. Here are the reserve, conversion loss, high-use demand, and remaining margin. The browser makes actual MCP calls to a local server implementing the November twenty twenty-five specification over Streamable HTTP. The visible trace shows tool discovery and calculation results. The same tools can be called by an agent.

## 2:00–2:20 · Close on the dashboard

This is a working MCP project and a clearly labeled conversation simulator. It does not claim access to Alexa preview tools or control physical appliances. It runs with one Node command, without API keys, and its calculation and transport tests pass. Blackstart's job is simple: keep the essentials, and make the point where the plan stops working impossible to miss.
