import { redirect } from 'next/navigation'

// Redirect /verify-invite → dashboard (registration is now open, no invite code needed)
export default function VerifyInvitePage() {
  redirect('/')
}
