import { StravaApiError } from "./error";
import { StravaActivity, StravaApiFault, StravaTokenResponse } from "./types";

export class StravaApiClient {
  /* Base URL for Strava API. */
  private baseUrl = "https://www.strava.com";

  /**
   * Make a call to the Strava API.
   * @param opts.uri Uri of the Strava API endpoint i.e. `/activities`
   * @param opts.method HTTP method
   * @param opts.body Request body
   * @param opts.headers Request headers
   */
  private async makeCall<T>(opts: {
    uri: string;
    method: "GET" | "POST";
    body?: BodyInit | null | undefined;
    headers?: HeadersInit;
  }): Promise<T> {
    try {
      const url = new URL(`/${opts.uri}`, this.baseUrl);

      const response = await fetch(url, {
        method: opts.method,
        headers: {
          "Content-Type": "application/json",
          ...opts?.headers,
        },
        ...(opts?.body && { body: opts.body }),
      });

      const responseBody = await response.json();

      if (!response.ok) {
        const errorResponse = responseBody as StravaApiFault;
        throw new StravaApiError(
          errorResponse.message || "Unknown Strava API error",
          errorResponse.errors[0]?.code || "unknown_error",
          response.status
        );
      }

      return responseBody as T;
    } catch (error) {
      if (error instanceof StravaApiError) {
        throw error;
      }

      // Wrap unexpected errors (network failures, JSON parse errors, etc.)
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Strava API call failed: ${errorMessage}`);
    }
  }

  /**
   * Fetch a Strava activity by its ID.
   * @param activityId
   * @param accessToken
   * @returns Strava activity
   */
  public async getActivity(activityId: string, accessToken: string) {
    const activity = await this.makeCall<StravaActivity>({
      uri: `api/v3/activities/${activityId}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return activity;
  }

  public async tokenCall(opts: {
    grantType: string;
    refreshToken?: string;
    authCode?: string;
  }) {
    const tokenResponse = await this.makeCall<StravaTokenResponse>({
      uri: `oauth/token`,
      method: "POST",
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: opts.grantType,
        refresh_token: opts.refreshToken,
        code: opts.authCode,
      }),
    });
    return tokenResponse;
  }

  public async refreshToken(refreshToken: string) {
    return this.tokenCall({
      grantType: "refresh_token",
      refreshToken,
    });
  }

  public async getToken(authCode: string) {
    return this.tokenCall({
      grantType: "authorization_code",
      authCode,
    });
  }

  public async getAuthorizeUrl(state: string) {
    return `${this.baseUrl}/oauth/authorize?client_id=${
      process.env.STRAVA_CLIENT_ID
    }&response_type=code&redirect_uri=${encodeURIComponent(
      process.env.STRAVA_REDIRECT_URI!
    )}&scope=activity:read_all,read&state=${state}`;
  }

  // We might want to re-work the error handling to return a discord
  // message if this catches an error
  public async deauthorize(accessToken: string) {
    const queryParams = new URLSearchParams({
      access_token: accessToken,
    });

    const response = await this.makeCall<{ access_token: string }>({
      uri: `oauth/deauthorize?${queryParams}`,
      method: "POST",
    });

    return response;
  }
}
