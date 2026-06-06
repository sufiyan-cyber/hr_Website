/**
 * DashboardLayout — main app shell.
 *
 * Wraps authenticated pages with the Sidebar + TopNavbar.
 * The main content area renders child routes via <Outlet />.
 * FloatingChatWidget is rendered globally so HRBot is accessible on every page.
 */

import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopNavbar from './TopNavbar'
import FloatingChatWidget from '@components/FloatingChatWidget'

export default function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-layout__main">
        <TopNavbar />

        <main className="dashboard-layout__content page-transition">
          <Outlet />
        </main>
      </div>

      {/* Global floating HRBot — visible on all authenticated pages */}
      <FloatingChatWidget />
    </div>
  )
}

