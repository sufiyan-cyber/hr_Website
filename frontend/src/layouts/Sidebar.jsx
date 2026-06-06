/**
 * Sidebar — Phase 1 (Fully styled, role-based navigation)
 *
 * Renders a role-specific nav menu with icons and a user profile block.
 * Includes a sign-out button in the footer.
 */

import { NavLink, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@context/AuthContext'

// ── SVG icon helpers ──────────────────────────────────────────────────────────

const Icon = ({ d, d2, circle, rect, line }) => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    {d  && <path d={d}/>}
    {d2 && <path d={d2}/>}
    {circle && <circle {...circle}/>}
    {rect   && <rect {...rect}/>}
    {line   && line.map((l,i) => <line key={i} {...l}/>)}
  </svg>
)

const icons = {
  dashboard:    <Icon d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" d2="M9 22V12h6v10"/>,
  employees:    <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" circle={{cx:9,cy:7,r:4}} d2="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>,
  recruitment:  <Icon d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z"/>,
  analytics:    <Icon d="M18 20V10M12 20V4M6 20v-6"/>,
  settings:     <Icon d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>,
  resume:       <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" d2="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>,
  candidates:   <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" circle={{cx:12,cy:7,r:4}}/>,
  pipeline:     <Icon d="M22 12h-4l-3 9L9 3l-3 9H2"/>,
  team:         <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" circle={{cx:9,cy:7,r:4}} d2="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>,
  performance:  <Icon d="M12 20V10M18 20V4M6 20v-4"/>,
  approvals:    <Icon d="M9 11l3 3L22 4" d2="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>,
  profile:      <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" circle={{cx:12,cy:7,r:4}}/>,
  attendance:   <Icon d="M8 2v4M16 2v4M3 10h18" rect={{x:3,y:4,width:18,height:18,rx:2}}/>,
  payroll:      <Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>,
  logout:       <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>,
}

// ── Role-based navigation definitions ────────────────────────────────────────

const NAV_CONFIG = {
  management_admin: {
    label: 'Admin',
    color: 'hsl(262,83%,68%)',
    sections: [
      {
        title: 'Overview',
        items: [
          { label: 'Dashboard',   path: '/admin/dashboard',  icon: icons.dashboard },
        ],
      },
      {
        title: 'People',
        items: [
          { label: 'Employees',   path: '/employees',        icon: icons.employees },
          { label: 'Departments', path: '/departments',      icon: icons.team },
        ],
      },
      {
        title: 'Recruitment',
        items: [
          { label: 'Recruitment', path: '/recruitment',      icon: icons.recruitment },
          { label: 'Candidates',  path: '/candidates',       icon: icons.candidates },
        ],
      },
      {
        title: 'Reports',
        items: [
          { label: 'Analytics',   path: '/analytics',        icon: icons.analytics },
          { label: 'Settings',    path: '/settings',         icon: icons.settings },
        ],
      },
    ],
  },

  hr_recruiter: {
    label: 'HR',
    color: 'hsl(196,83%,60%)',
    sections: [
      {
        title: 'Overview',
        items: [
          { label: 'Dashboard',        path: '/hr/dashboard',      icon: icons.dashboard },
        ],
      },
      {
        title: 'Recruitment',
        items: [
          { label: 'AI Screening',     path: '/hr/screening',      icon: icons.resume },
          { label: 'Resume Screening', path: '/recruitment',       icon: icons.recruitment },
          { label: 'Candidates',       path: '/candidates',        icon: icons.candidates },
          { label: 'Pipeline',         path: '/pipeline',          icon: icons.pipeline },
        ],
      },
    ],
  },

  senior_manager: {
    label: 'Manager',
    color: 'hsl(38,92%,55%)',
    sections: [
      {
        title: 'Overview',
        items: [
          { label: 'Dashboard',   path: '/manager/dashboard',  icon: icons.dashboard },
        ],
      },
      {
        title: 'Team',
        items: [
          { label: 'My Team',     path: '/employees',          icon: icons.team },
          { label: 'Performance', path: '/performance',        icon: icons.performance },
          { label: 'Approvals',   path: '/approvals',          icon: icons.approvals },
        ],
      },
    ],
  },

  employee: {
    label: 'Employee',
    color: 'hsl(142,71%,45%)',
    sections: [
      {
        title: 'Overview',
        items: [
          { label: 'Dashboard',   path: '/employee/dashboard', icon: icons.dashboard },
        ],
      },
      {
        title: 'My Account',
        items: [
          { label: 'My Profile',  path: '/profile',            icon: icons.profile },
          { label: 'Attendance',  path: '/attendance',         icon: icons.attendance },
          { label: 'Payroll',     path: '/payroll',            icon: icons.payroll },
        ],
      },
    ],
  },
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { role, displayName, initials, signOut } = useAuth()
  const navigate = useNavigate()

  const config = NAV_CONFIG[role] ?? NAV_CONFIG.employee

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out successfully')
    navigate('/login', { replace: true })
  }

  return (
    <aside className="sidebar" aria-label="Main navigation">
      {/* ── Brand ── */}
      <div className="sidebar__brand">
        <div className="sidebar__brand-icon" aria-hidden="true">🧠</div>
        <span className="sidebar__brand-text">HRMS</span>
      </div>

      {/* ── Navigation ── */}
      <nav className="sidebar__nav" aria-label="Site navigation">
        {config.sections.map((section) => (
          <div key={section.title}>
            <p className="sidebar__section-label">{section.title}</p>
            <ul>
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
                    }
                  >
                    <span className="sidebar__link-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── User footer ── */}
      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__avatar" aria-hidden="true">
            {initials || '?'}
          </div>
          <div className="sidebar__user-info">
            <div className="sidebar__user-name" title={displayName}>{displayName}</div>
            <div className="sidebar__user-role"
                 style={{ color: config.color }}>
              {config.label}
            </div>
          </div>
          <button
            className="sidebar__logout-btn"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
          >
            {icons.logout}
          </button>
        </div>
      </div>
    </aside>
  )
}
