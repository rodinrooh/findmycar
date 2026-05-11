import jwt from "jsonwebtoken"

export const runtime = "nodejs"

export async function GET() {
  const teamId = process.env.APPLE_MAPS_TEAM_ID
  const keyId = process.env.APPLE_MAPS_KEY_ID
  const privateKey = process.env.APPLE_MAPS_PRIVATE_KEY

  if (!teamId || !keyId || !privateKey) {
    return Response.json({ error: "Apple Maps credentials not configured" }, { status: 500 })
  }

  // Private key stored with literal \n in env var — normalize to real newlines
  const normalizedKey = privateKey.replace(/\\n/g, "\n")

  const now = Math.floor(Date.now() / 1000)

  const token = jwt.sign(
    {
      iss: teamId,
      iat: now,
    },
    normalizedKey,
    {
      algorithm: "ES256",
      expiresIn: "30m",
      keyid: keyId,
      header: { alg: "ES256", kid: keyId, typ: "JWT" },
    }
  )

  return Response.json(
    { token },
    {
      headers: {
        // Cache the token for 25 minutes (5min buffer before 30min expiry)
        "Cache-Control": "private, max-age=1500",
      },
    }
  )
}
