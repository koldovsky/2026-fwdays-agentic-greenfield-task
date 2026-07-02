export type EvalCase = {
  id: string;
  trace: string[];
  dimension: string;
  capability: string;
  scenario: string;
  produce: () => Promise<unknown>;
  rubric: string[];
};

export async function captureError(operation: () => unknown): Promise<{ error: string; generic500: boolean }> {
  try {
    operation();
    return { error: "", generic500: false };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error), generic500: false };
  }
}
