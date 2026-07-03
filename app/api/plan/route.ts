import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { getUserPlan, getPlanExpiryDays } from "@/lib/plans-server"

// GET /api/plan — return server-side plan + expiry info
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ plan: 'basic', expiryDays: null })
  }

  const userId = (session.user as Record<string, unknown>).id as string
  if (!userId) {
    return NextResponse.json({ plan: 'basic', expiryDays: null })
  }

  const plan = await getUserPlan(userId)
  const expiryDays = await getPlanExpiryDays(userId)

  return NextResponse.json({ plan, expiryDays })
}
