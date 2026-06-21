// ──────────────────────────────────────────────
// SmartWorkingDays — UserBadge component
// ──────────────────────────────────────────────
// Mostra il nome utente e la sua regola SW in un badge.
// ──────────────────────────────────────────────

import { describeSwRule } from '../shared/userProfile.ts'
import type { SwRule } from '../shared/userProfile.ts'

interface UserBadgeProps {
  displayName: string
  swRule: SwRule
}

export default function UserBadge({ displayName, swRule }: UserBadgeProps) {
  const ruleDesc = describeSwRule(swRule)
  const isPercentage = swRule.type === 'percentage'

  return (
    <div className="user-badge">
      <span className="user-badge-name">{displayName}</span>
      <span className={`user-badge-rule ${isPercentage ? 'percentage' : 'fixed'}`}>
        {ruleDesc}
      </span>
    </div>
  )
}
