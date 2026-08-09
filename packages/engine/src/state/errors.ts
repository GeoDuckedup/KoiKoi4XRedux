export class EngineCommandError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "EngineCommandError";
    this.code = code;
  }
}

export function rejectCommand(code: string, message: string): never {
  throw new EngineCommandError(code, message);
}
