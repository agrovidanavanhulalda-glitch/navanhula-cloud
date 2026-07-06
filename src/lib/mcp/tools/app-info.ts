import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "app_info",
  title: "App info",
  description: "Return basic information about the Navanhula Cloud app exposed via MCP.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify({
          name: "Navanhula Cloud",
          description: "Sistema Empresarial / Plataforma de Gestão (POS, estoque, fiscal, RH, agricultura, avicultura).",
          modules: [
            "POS", "Caixa", "Produtos", "Estoque", "Vendas", "Relatórios",
            "Financeiro", "RH", "Fiscal", "CRM", "BI", "Agricultura", "Avicultura",
          ],
        }),
      },
    ],
  }),
});
