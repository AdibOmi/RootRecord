/**
 * All user-facing strings. To add Bangla later, create `bn.ts` with the same
 * shape (typed as `Messages`) and switch the export in `i18n/index.ts`.
 */
export const en = {
  app: {
    name: 'Root Record',
    tagline: 'Patient records for modern dental care',
    headline: 'Every patient, visit and payment — in one calm place.',
  },
  nav: {
    dashboard: 'Dashboard',
    patients: 'Patients',
    appointments: 'Appointments',
    recalls: 'Recalls',
    billing: 'Billing',
    reports: 'Reports',
    settings: 'Settings',
    mainMenu: 'Main menu',
    openMenu: 'Open menu',
  },
  roles: {
    admin: 'Admin',
    dentist: 'Dentist',
    receptionist: 'Receptionist',
  },
  auth: {
    signInTitle: 'Sign in to Root Record',
    signInSubtitle: 'Use the staff account your clinic admin created for you.',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    signOut: 'Sign out',
    signedOut: 'You have been signed out',
    sessionExpired: 'Your session has expired. Please sign in again.',
    staffOnly: 'Staff access only. Forgot your password? Ask the clinic admin to reset it.',
    changePassword: 'Change password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    passwordChanged: 'Password changed. Please sign in again.',
    changePasswordHint: 'You will be signed out on every device after changing it.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
  search: {
    placeholder: 'Search patients by name, phone or ID…',
    trigger: 'Search patients…',
    title: 'Search',
    description: 'Search patients or jump to a page',
    goTo: 'Go to',
    noResults: 'No results found.',
    patientsComingSoon: 'Patient search becomes available once patients are added.',
  },
  userMenu: {
    account: 'My account',
  },
  dashboard: {
    greetingMorning: 'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening: 'Good evening',
    todayIs: 'Today is',
    patientsToday: 'Patients today',
    newThisMonth: 'New this month',
    recallsThisWeek: 'Recalls this week',
    todaysCollection: "Today's collection",
    todaysAppointments: "Today's appointments",
    recallsDue: 'Recalls due',
  },
  placeholder: {
    title: 'Coming soon',
    body: 'This section will be built in an upcoming phase.',
    backToDashboard: 'Back to dashboard',
  },
  notFound: {
    title: 'Page not found',
    body: 'The page you were looking for does not exist or has moved.',
  },
  forbidden: {
    title: 'No access',
    body: 'Your role does not have permission to view this page.',
  },
  common: {
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving…',
    confirm: 'Confirm',
    retry: 'Try again',
    loading: 'Loading…',
    somethingWrong: 'Something went wrong',
    networkError: 'Cannot reach the server. Check your connection and try again.',
  },
  validation: {
    required: 'This field is required',
    email: 'Enter a valid email address',
    passwordMin: 'Use at least 8 characters',
    passwordsMatch: 'Passwords do not match',
    phone: 'Enter a valid Bangladeshi mobile number (01XXXXXXXXX)',
  },
} as const

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }
export type Messages = Widen<typeof en>
