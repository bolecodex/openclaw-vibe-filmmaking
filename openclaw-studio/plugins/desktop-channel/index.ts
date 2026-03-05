export default function register(api: any) {
  api.registerGatewayMethod(
    "desktop.chat",
    async ({ params, respond }: any) => {
      const { message, context } = params;
      try {
        const response = await api.agent.chat(message, { context });
        respond(true, {
          text: response.text || response.content || String(response),
          actions: response.actions || [],
        });
      } catch (err: any) {
        respond(false, { error: err.message });
      }
    },
  );

  api.registerCommand({
    name: "studio-status",
    description: "Show Desktop Channel status",
    handler: () => ({
      text: "Desktop Channel plugin is active.",
    }),
  });
}
