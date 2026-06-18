import { supabase } from './supabase'

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import' | 'clean'

export interface AuditLogEntry {
  user_id: string
  action: AuditAction
  table_name: string
  record_id?: string
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
}

/**
 * Log an audit event to Supabase
 * Silently fails if Supabase is not configured (client-side usage)
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: entry.user_id,
        action: entry.action,
        table_name: entry.table_name,
        record_id: entry.record_id || null,
        old_data: entry.old_data || null,
        new_data: entry.new_data || null,
        ip_address: entry.ip_address || null,
        user_agent: entry.user_agent || null,
        created_at: new Date().toISOString(),
      })

    if (error) {
      console.warn('[audit] Failed to log:', error.message)
    }
  } catch (err) {
    // Silently fail — audit logging should never break the app
    console.warn('[audit] Error:', err)
  }
}

/**
 * Get audit logs for a user (admin function)
 */
export async function getAuditLogs(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[audit] Failed to fetch logs:', error.message)
    return []
  }

  return data
}

/**
 * Helper to create audit log entry for transaction changes
 */
export async function logTransactionAudit(
  userId: string,
  action: 'create' | 'update' | 'delete',
  transactionId: string,
  oldData?: Record<string, unknown>,
  newData?: Record<string, unknown>
) {
  return logAudit({
    user_id: userId,
    action,
    table_name: 'transactions',
    record_id: transactionId,
    old_data: oldData,
    new_data: newData,
  })
}

/**
 * Helper to create audit log entry for budget changes
 */
export async function logBudgetAudit(
  userId: string,
  action: 'create' | 'update' | 'delete',
  categoryId: string,
  oldData?: Record<string, unknown>,
  newData?: Record<string, unknown>
) {
  return logAudit({
    user_id: userId,
    action,
    table_name: 'budgets',
    record_id: categoryId,
    old_data: oldData,
    new_data: newData,
  })
}

/**
 * Helper to create audit log entry for auth events
 */
export async function logAuthAudit(
  userId: string,
  action: 'login' | 'logout',
  metadata?: Record<string, unknown>
) {
  return logAudit({
    user_id: userId,
    action,
    table_name: 'auth',
    new_data: metadata,
  })
}
