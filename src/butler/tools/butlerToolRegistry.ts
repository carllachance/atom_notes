export interface ButlerTool<Input, Output> {
  id: string;
  label: string;
  run(input: Input): Promise<Output> | Output;
}

export interface ButlerToolRegistry {
  getTool<TInput, TOutput>(id: string): ButlerTool<TInput, TOutput>;
  hasTool(id: string): boolean;
}

export function createButlerToolRegistry(tools: Array<ButlerTool<unknown, unknown>>): ButlerToolRegistry {
  const byId = new Map(tools.map((tool) => [tool.id, tool]));
  return {
    getTool<TInput, TOutput>(id: string) {
      const tool = byId.get(id);
      if (!tool) throw new Error(`Unknown Butler tool: ${id}`);
      return tool as ButlerTool<TInput, TOutput>;
    },
    hasTool(id: string) {
      return byId.has(id);
    }
  };
}
