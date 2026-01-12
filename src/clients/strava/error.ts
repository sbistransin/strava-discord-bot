export class StravaApiError extends Error {
  constructor(message: string, public code: string, public statusCode: number) {
    super(message);
    this.name = "StravaApiError";
  }
}
