import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { traceAI } from "@/lib/langfuse"
import { getUserPlan } from "@/lib/plans-server"
import { createHash } from "crypto"

function emailToUserId(email: string): string {
  const hash = createHash('md5').update(email.toLowerCase().trim()).digest('hex')
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`
}

export const maxDuration = 30

function bearer(key: string) {
  return "Bearer " + key
}

// POST /api/ai/voice-transcribe
export async function POST(req: Request) {
  // Auth check — allow logged-in users (Premium gate removed for voice input)
  const session = await getServerSession(authOptions).catch(() => null)

  try {
    const formData = await req.formData()
    const audioFile = formData.get("audio") as File | null

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file" }, { status: 400 })
    }

    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "Audio too large (max 25MB)" }, { status: 400 })
    }

    console.log("[voice-transcribe] Received:", audioFile.name, audioFile.size, "bytes")

    // Wrap entire transcription in Langfuse trace
    const result = await traceAI(
      "voice-transcribe",
      {
        userId: session?.user?.email ?? 'anonymous',
        fileName: audioFile.name,
        fileSize: audioFile.size,
        mimeType: audioFile.type,
      },
      async (span) => {
        // Try Groq Whisper (free, fast)
        const groqKey = process.env.GROQ_API_KEY
        if (groqKey) {
          try {
            const form = new FormData()
            form.append("file", audioFile, audioFile.name || "audio.webm")
            form.append("model", "whisper-large-v3-turbo")
            form.append("language", "id")
            form.append("response_format", "json")

            const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
              method: "POST",
              headers: { Authorization: bearer(groqKey) },
              body: form,
            })

            if (res.ok) {
              const data = await res.json()
              console.log("[voice-transcribe] Groq OK:", data.text)
              span.update({
                output: data.text,
                metadata: { provider: "groq", model: "whisper-large-v3-turbo" },
              })
              return { text: data.text }
            }
            console.error("[voice-transcribe] Groq error:", res.status, await res.text())
          } catch (err) {
            console.error("[voice-transcribe] Groq failed:", err)
          }
        }

        // Try OpenAI Whisper
        const openaiKey = process.env.OPENAI_API_KEY
        if (openaiKey) {
          try {
            const form = new FormData()
            form.append("file", audioFile, audioFile.name || "audio.webm")
            form.append("model", "whisper-1")
            form.append("language", "id")
            form.append("response_format", "json")

            const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
              method: "POST",
              headers: { Authorization: bearer(openaiKey) },
              body: form,
            })

            if (res.ok) {
              const data = await res.json()
              console.log("[voice-transcribe] OpenAI OK:", data.text)
              span.update({
                output: data.text,
                metadata: { provider: "openai", model: "whisper-1" },
              })
              return { text: data.text }
            }
            console.error("[voice-transcribe] OpenAI error:", res.status, await res.text())
          } catch (err) {
            console.error("[voice-transcribe] OpenAI failed:", err)
          }
        }

        // Fallback: Gemini multimodal
        const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
        if (geminiKey) {
          try {
            const arrayBuffer = await audioFile.arrayBuffer()
            const base64 = Buffer.from(arrayBuffer).toString("base64")
            const mimeType = audioFile.type || "audio/webm"

            const res = await fetch(
              "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + geminiKey,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{
                    parts: [
                      { inlineData: { mimeType, data: base64 } },
                      { text: "Transcribe this audio exactly. Output ONLY the text, nothing else. Language: Indonesian." },
                    ],
                  }],
                }),
              }
            )

            if (res.ok) {
              const data = await res.json()
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
              if (text) {
                console.log("[voice-transcribe] Gemini OK:", text)
                span.update({
                  output: text,
                  metadata: { provider: "gemini", model: "gemini-2.0-flash" },
                })
                return { text }
              }
            }
            console.error("[voice-transcribe] Gemini error:", res.status)
          } catch (err) {
            console.error("[voice-transcribe] Gemini failed:", err)
          }
        }

        return null // No provider available
      },
      session?.user?.email ?? 'anonymous'
    )

    if (!result) {
      return NextResponse.json(
        { error: "No transcription service configured. Set GROQ_API_KEY or OPENAI_API_KEY in Vercel env." },
        { status: 503 }
      )
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error("[voice-transcribe] Error:", err)
    // Sentry will auto-capture this via the global error handler
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
