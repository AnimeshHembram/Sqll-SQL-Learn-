import { createBrowserRouter } from 'react-router'
import { AppShell } from '../components/layout/AppShell.tsx'
import { ChallengesPage } from '../pages/ChallengesPage.tsx'
import { DashboardPage } from '../pages/DashboardPage.tsx'
import { LearnPage } from '../pages/LearnPage.tsx'
import { NotFoundPage } from '../pages/NotFoundPage.tsx'
import { PracticePage } from '../pages/PracticePage.tsx'
import { ReferencePage } from '../pages/ReferencePage.tsx'
import { RouteErrorPage } from '../pages/RouteErrorPage.tsx'
import { SettingsPage } from '../pages/SettingsPage.tsx'
import { NAV } from './navigation.ts'

export const router = createBrowserRouter([
  {
    path: NAV.dashboard.path,
    element: <AppShell />,
    // Shown without the shell if the shell itself fails to render.
    errorElement: <RouteErrorPage standalone />,
    children: [
      {
        // Page errors render inside the shell so navigation keeps working.
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: NAV.learn.path, element: <LearnPage /> },
          { path: NAV.practice.path, element: <PracticePage /> },
          { path: NAV.challenges.path, element: <ChallengesPage /> },
          { path: NAV.reference.path, element: <ReferencePage /> },
          { path: NAV.settings.path, element: <SettingsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
