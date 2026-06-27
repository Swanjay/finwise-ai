import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

interface ScoreBreakdown {
  savingRatio: number      // 30% weight
  budgetAdherence: number  // 25% weight
  debtRatio: number        // 20% weight
  spendingConsistency: number // 15% weight
  emergencyFund: number    // 10% weight
}

interface FinancialHealth {
  score: number
  grade: string
  breakdown: ScoreBreakdown
  tips: string[]
  summary: string
}

// GET /api/health-score — Calculate financial health score
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }

  try {
    const userId = (session.user as Record<string, unknown>).id as string

    // Get current month's transactions
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("type, amount, category, date")
      .eq("user_id", userId)
      .gte("date", monthStart)
      .lte("date", monthEnd)

    if (txError) {
      console.error("[health-score] Transaction error:", txError)
      return NextResponse.json({ error: "Gagal mengambil data transaksi" }, { status: 500 })
    }

    // Get budgets
    const { data: budgets, error: budgetError } = await supabase
      .from("budgets")
      .select("category, limit_amount")
      .eq("user_id", userId)

    if (budgetError) {
      console.error("[health-score] Budget error:", budgetError)
    }

    // Get goals (for emergency fund check)
    const { data: goals, error: goalError } = await supabase
      .from("goals")
      .select("name, target, saved")
      .eq("user_id", userId)

    if (goalError) {
      console.error("[health-score] Goal error:", goalError)
    }

    // Get settings (for monthly income)
    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .eq("user_id", userId)

    const monthlyIncome = settings?.find(s => s.key === "monthly_income")?.value
      ? parseFloat(settings.find(s => s.key === "monthly_income")!.value)
      : 0

    // Calculate scores
    const totalIncome = transactions?.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) || 0
    const totalExpense = transactions?.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) || 0
    const effectiveIncome = monthlyIncome || totalIncome

    // 1. Saving Ratio (30%)
    let savingRatioScore = 50 // default if no income data
    if (effectiveIncome > 0) {
      const savingRate = (effectiveIncome - totalExpense) / effectiveIncome
      savingRatioScore = Math.min(100, Math.max(0, savingRate * 100 * 2)) // scale up
    }

    // 2. Budget Adherence (25%)
    let budgetAdherenceScore = 50
    if (budgets && budgets.length > 0) {
      let totalAdherence = 0
      let budgetCount = 0
      
      for (const budget of budgets) {
        const spent = transactions?.filter(t => t.category === budget.category && t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0
        
        if (budget.limit_amount > 0) {
          const adherence = 1 - (spent / budget.limit_amount)
          totalAdherence += Math.min(1, Math.max(0, adherence))
          budgetCount++
        }
      }
      
      if (budgetCount > 0) {
        budgetAdherenceScore = (totalAdherence / budgetCount) * 100
      }
    }

    // 3. Debt Ratio (20%)
    const debtTransactions = transactions?.filter(t => t.category.toLowerCase().includes("utang") || t.category.toLowerCase().includes("debt"))
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0
    let debtRatioScore = 80 // default: assume low debt
    if (effectiveIncome > 0) {
      const debtRate = debtTransactions / effectiveIncome
      debtRatioScore = Math.min(100, Math.max(0, (1 - debtRate) * 100))
    }

    // 4. Spending Consistency (15%)
    // Calculate daily spending variance
    const dailySpending: Record<string, number> = {}
    transactions?.filter(t => t.type === "expense").forEach(t => {
      dailySpending[t.date] = (dailySpending[t.date] || 0) + Number(t.amount)
    })
    
    const dailyValues = Object.values(dailySpending)
    let spendingConsistencyScore = 50
    
    if (dailyValues.length > 1) {
      const avg = dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length
      const variance = dailyValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / dailyValues.length
      const stdDev = Math.sqrt(variance)
      const coefficientOfVariation = avg > 0 ? stdDev / avg : 1
      
      // Lower CV = more consistent = higher score
      spendingConsistencyScore = Math.min(100, Math.max(0, (1 - coefficientOfVariation) * 100))
    }

    // 5. Emergency Fund (10%)
    let emergencyFundScore = 30 // default: assume no emergency fund
    const emergencyGoal = goals?.find(g => 
      g.name.toLowerCase().includes("darurat") || 
      g.name.toLowerCase().includes("emergency") ||
      g.name.toLowerCase().includes("dana darurat")
    )
    
    if (emergencyGoal) {
      const progress = emergencyGoal.target > 0 ? emergencyGoal.saved / emergencyGoal.target : 0
      emergencyFundScore = Math.min(100, progress * 100)
    } else if (goals && goals.length > 0) {
      // Check if any goal is > 50% funded
      const anyGoalProgress = goals.some(g => g.target > 0 && g.saved / g.target > 0.5)
      emergencyFundScore = anyGoalProgress ? 60 : 30
    }

    // Calculate total score
    const breakdown: ScoreBreakdown = {
      savingRatio: Math.round(savingRatioScore),
      budgetAdherence: Math.round(budgetAdherenceScore),
      debtRatio: Math.round(debtRatioScore),
      spendingConsistency: Math.round(spendingConsistencyScore),
      emergencyFund: Math.round(emergencyFundScore),
    }

    const totalScore = Math.round(
      breakdown.savingRatio * 0.30 +
      breakdown.budgetAdherence * 0.25 +
      breakdown.debtRatio * 0.20 +
      breakdown.spendingConsistency * 0.15 +
      breakdown.emergencyFund * 0.10
    )

    // Determine grade
    let grade: string
    if (totalScore >= 80) grade = "Excellent"
    else if (totalScore >= 60) grade = "Good"
    else if (totalScore >= 40) grade = "Fair"
    else grade = "Needs Improvement"

    // Generate tips
    const tips: string[] = []
    
    if (breakdown.savingRatio < 50) {
      tips.push("💡 Coba sisihkan minimal 20% dari pendapatan untuk tabungan")
    }
    if (breakdown.budgetAdherence < 50) {
      tips.push("📊 Perketat budget pengeluaranmu, terutama di kategori yang sering over")
    }
    if (breakdown.debtRatio < 50) {
      tips.push("💳 Prioritaskan melunasi utang dengan bunga tinggi terlebih dahulu")
    }
    if (breakdown.spendingConsistency < 50) {
      tips.push("📈 Pola belanjamu tidak konsisten, coba buat budget mingguan")
    }
    if (breakdown.emergencyFund < 50) {
      tips.push("🏦 Mulai kumpulkan dana darurat minimal 3x pengeluaran bulanan")
    }
    
    if (tips.length === 0) {
      tips.push("🎉 Keuanganmu sehat! Pertahankan dan tingkatkan terus ya!")
    }

    // Summary
    let summary: string
    if (totalScore >= 80) {
      summary = "Keuanganmu sangat sehat! Kamu sudah mengelola uang dengan baik. Pertahankan!"
    } else if (totalScore >= 60) {
      summary = "Keuanganmu cukup sehat. Ada beberapa area yang bisa ditingkatkan."
    } else if (totalScore >= 40) {
      summary = "Keuanganmu perlu perhatian. Fokus perbaiki area dengan skor terendah."
    } else {
      summary = "Keuanganmu butuh perubahan signifikan. Mulai dari yang paling mudah dulu!"
    }

    return NextResponse.json({
      score: totalScore,
      grade,
      breakdown,
      tips,
      summary,
      stats: {
        totalIncome,
        totalExpense,
        savings: effectiveIncome - totalExpense,
        transactionCount: transactions?.length || 0,
      },
    })
  } catch (err) {
    console.error("[health-score] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
