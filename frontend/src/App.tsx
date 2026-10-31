import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { toast } from 'sonner'

import { ApiError, setSessionExpiredHandler } from '@/api/client'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { RequireAuth, RequirePermission } from '@/features/auth/guards'
import { ME_KEY, resetSession } from '@/features/auth/hooks'
import { t } from '@/i18n'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PatientDetailPage } from '@/pages/PatientDetailPage'
import { PatientsPage } from '@/pages/PatientsPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { PrescriptionReviewPage } from '@/pages/PrescriptionReviewPage'
import { PrescriptionsPage } from '@/pages/PrescriptionsPage'
import { ScanPage } from '@/pages/ScanPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Retry only transient failures (network / 5xx), never 4xx.
      retry: (count, err) =>
        count < 2 && err instanceof ApiError && (err.status === 0 || err.status >= 500),
    },
  },
})

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          {
            path: 'scan',
            element: (
              <RequirePermission permission="clinical:edit">
                <ScanPage />
              </RequirePermission>
            ),
          },
          { path: 'prescriptions', element: <PrescriptionsPage /> },
          { path: 'prescriptions/:id', element: <PrescriptionReviewPage /> },
          { path: 'patients', element: <PatientsPage /> },
          { path: 'patients/:id', element: <PatientDetailPage /> },
          { path: 'appointments/*', element: <PlaceholderPage title={t.nav.appointments} /> },
          { path: 'recalls/*', element: <PlaceholderPage title={t.nav.recalls} /> },
          {
            path: 'billing/*',
            element: (
              <RequirePermission permission="billing:view">
                <PlaceholderPage title={t.nav.billing} />
              </RequirePermission>
            ),
          },
          {
            path: 'reports/*',
            element: (
              <RequirePermission permission="reports:view">
                <PlaceholderPage title={t.nav.reports} />
              </RequirePermission>
            ),
          },
          {
            path: 'settings/*',
            element: (
              <RequirePermission permission="settings:manage">
                <PlaceholderPage title={t.nav.settings} />
              </RequirePermission>
            ),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])

export function App() {
  useEffect(() => {
    setSessionExpiredHandler(() => {
      const wasSignedIn = queryClient.getQueryData(ME_KEY) != null
      resetSession(queryClient, null)
      if (wasSignedIn) toast.error(t.auth.sessionExpired, { id: 'session-expired' })
    })
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  )
}
