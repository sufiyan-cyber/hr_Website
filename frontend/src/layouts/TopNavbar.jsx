/**
 * TopNavbar — Phase 1 (fully styled)
 *
 * Shows page title, role badge, user avatar, and sign-out button.
 * Uses useLocation to derive page title from path.
 */

import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@context/AuthContext'

// ── Path → page title map ─────────────────────────────────────────────────────

const PATH_TITLES = {
  '/admin/dashboard':    'Dashboard',
  '/hr/dashboard':       'Dashboard',
  '/hr/screening':       'AI Resume Screening',
  '/manager/dashboard':  'Dashboard',
  '/employee/dashboard': 'Dashboard',
  '/employees':          'Employees',
  '/departments':        'Departments',
  '/recruitment':        'Recruitment',
  '/candidates':         'Candidates',
  '/pipeline':           'Candidate Pipeline',
  '/analytics':          'Analytics',
  '/settings':           'Settings',
  '/attendance':         'Attendance',
  '/payroll':            'Payroll',
  '/performance':        'Performance',
  '/approvals':          'Approvals',
  '/profile':            'My Profile',
  '/chatbot':            'AI Assistant',
}

const ROLE_LABELS = {
  management_admin: 'Admin',
  hr_recruiter:     'HR Recruiter',
  senior_manager:   'Sr. Manager',
  employee:         'Employee',
}

// Sign-out icon
const IconLogOut = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
  </svg>
)

// ── Component ─────────────────────────────────────────────────────────────────

export default function TopNavbar() {
  const { user, role, displayName, initials, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  const pageTitle = PATH_TITLES[location.pathname] ?? 'HRMS Platform'
  const roleLabel = ROLE_LABELS[role] ?? 'User'

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out successfully')
    navigate('/login', { replace: true })
  }

  return (
    <header className="topnav" role="banner">
      {/* Left: page title */}
      <div className="topnav__left">
        <h1 className="topnav__page-title">{pageTitle}</h1>
      </div>

      {/* Right: role badge + user + logout */}
      <div className="topnav__right">
        <span className="topnav__role-badge" aria-label={`Role: ${roleLabel}`}>
          {roleLabel}
        </span>

        <div className="topnav__avatar" aria-hidden="true" title={displayName}>
          {initials || '?'}
        </div>

        <span className="topnav__user-name">{displayName}</span>

        <button
          id="topnav-signout-btn"
          className="topnav__signout-btn"
          onClick={handleSignOut}
          aria-label="Sign out"
        >
          <IconLogOut />
          Sign out
        </button>
      </div>
    </header>
  )
}
