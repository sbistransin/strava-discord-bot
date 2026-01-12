export async function fetchActivity(activityId: string, accessToken: string) {
  const response = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return await response.json();
}
