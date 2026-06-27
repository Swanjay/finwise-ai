import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

// POST /api/ai/receipt-scan — Parse receipt image to transactions
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { image_url } = body

    if (!image_url || typeof image_url !== "string") {
      return NextResponse.json({ error: "URL gambar tidak valid" }, { status: 400 })
    }

    // For now, return a mock response
    // In production, this would call an OCR API (Google Vision, Tesseract, etc.)
    // or use an AI vision model to parse the receipt

    return NextResponse.json({
      ok: true,
      message: "Fitur scan struk akan segera hadir! Saat ini dalam pengembangan.",
      // Mock data structure for future implementation
      items: [],
      total: 0,
      store: "",
      date: new Date().toISOString().split("T")[0],
    })
  } catch (err) {
    console.error("[receipt-scan] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
