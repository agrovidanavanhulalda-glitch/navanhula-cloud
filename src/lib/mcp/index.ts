import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import appInfoTool from "./tools/app-info";

export default defineMcp({
  name: "navanhula-cloud-mcp",
  title: "Navanhula Cloud MCP",
  version: "0.1.0",
  instructions:
    "Tools exposed by the Navanhula Cloud business platform. Use `echo` to verify connectivity and `app_info` to discover available modules.",
  tools: [echoTool, appInfoTool],
});
