export function runBoundedRole<TInput, TOutput>(input: {
  roleName: string;
  mission: string;
  allowedTools: string[];
  payload: TInput;
  handler: (payload: TInput) => TOutput;
}): TOutput {
  return input.handler(input.payload);
}
