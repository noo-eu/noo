export async function getUserProfile(nooSession: {
  sessionId: string;
  userId: string;
}) {
  const response = await fetch(`${process.env.NOO_ID_URL}/_noo/user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // TODO: some authentication?
    },
    body: JSON.stringify({
      id: nooSession.userId,
      sessionId: nooSession.sessionId,
    }),
  });

  if (!response.ok) {
    console.error(
      "Failed to fetch user profile",
      response.status,
      response.statusText,
    );
    return undefined;
  }

  const data = await response.json();
  if (!data || !data.user) {
    console.error("Invalid user profile response", data);
    return undefined;
  }

  return data.user;
}
