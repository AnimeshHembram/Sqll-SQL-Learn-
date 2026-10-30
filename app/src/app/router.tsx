import { createBrowserRouter } from 'react-router'
import { AppShell } from '../components/layout/AppShell.tsx'
import { ChallengeRoute } from '../pages/ChallengeRoute.tsx'
import { ChallengesPage } from '../pages/ChallengesPage.tsx'
import { DashboardPage } from '../pages/DashboardPage.tsx'
import { LearnPage } from '../pages/LearnPage.tsx'
import { LessonPage } from '../pages/LessonPage.tsx'
import { ModulePage } from '../pages/ModulePage.tsx'
import { NotFoundPage } from '../pages/NotFoundPage.tsx'
import { PracticeRoute } from '../pages/PracticeRoute.tsx'
import { QuizPage } from '../pages/QuizPage.tsx'
import { QuizzesPage } from '../pages/QuizzesPage.tsx'
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
          { path: `${NAV.learn.path}/:moduleId`, element: <ModulePage /> },
          { path: `${NAV.learn.path}/:moduleId/:lessonId`, element: <LessonPage /> },
          { path: NAV.practice.path, element: <PracticeRoute /> },
          { path: NAV.challenges.path, element: <ChallengesPage /> },
          { path: `${NAV.challenges.path}/:challengeId`, element: <ChallengeRoute /> },
          { path: NAV.quizzes.path, element: <QuizzesPage /> },
          { path: `${NAV.quizzes.path}/:quizId`, element: <QuizPage /> },
          { path: NAV.reference.path, element: <ReferencePage /> },
          { path: NAV.settings.path, element: <SettingsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
