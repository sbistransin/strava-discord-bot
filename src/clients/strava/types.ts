export type StravaActivity = {
  id: string;
  name: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  type: string;
};

type StravaAthlete = {
  id: string;
  username: string;
  firstname: string;
  lastname: string;
};

export type StravaTokenResponse = {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  athlete: StravaAthlete;
};

type StravaApiError = {
  // The code associated with this error.
  code: string;
  // The specific field or aspect of the resource associated with this error.
  field: string;
  // The type of resource associated with this error.
  resource: string;
};

export type StravaApiFault = {
  errors: StravaApiError[];
  message: string;
};
