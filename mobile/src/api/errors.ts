export class ApiRequestError extends Error {
  readonly status: number;
  readonly detail: string | undefined;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.detail = detail;
  }
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof ApiRequestError) return false;
  return err instanceof Error && /network|fetch/i.test(err.message);
}
