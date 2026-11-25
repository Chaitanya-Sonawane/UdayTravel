export {
  signUpUser,
  signInUser,
  signOutUser,
  subscribeToAuth,
  fetchCurrentProfile,
  isUserLoggedIn,
} from '@/lib/auth/client-auth'
export { requireUser } from '@/lib/server/guard'
export type { AuthResult, GuardErrorPayload } from '@/lib/server/guard'
