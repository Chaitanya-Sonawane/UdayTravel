export interface AuthActionConfig {
  label: string
  type: 'switch_to_login' | 'switch_to_register' | 'retry' | 'contact_support'
}

export interface FormattedAuthError {
  code: string
  title: string
  message: string
  suggestion?: string
  action?: AuthActionConfig
}

/**
 * Maps raw Firebase authentication errors or network exceptions into
 * user-friendly, structured, actionable errors matching Uday Travels branding.
 */
export function parseAuthError(
  err: unknown,
  context?: { identifier?: string; mode?: 'register' | 'login' }
): FormattedAuthError {
  let rawCode = ''
  let rawMsg = ''

  if (typeof err === 'object' && err !== null) {
    if ('code' in err && typeof (err as any).code === 'string') {
      rawCode = (err as any).code
    }
    if ('message' in err && typeof (err as any).message === 'string') {
      rawMsg = (err as any).message
    }
  } else if (typeof err === 'string') {
    rawMsg = err
  }

  const cleanIdent = context?.identifier ? context.identifier.trim() : ''
  const displayIdent = cleanIdent ? `+91 ${cleanIdent.replace(/^\+91/, '')}` : 'this mobile number or email'

  // 1. Account already exists
  if (
    rawCode === 'auth/email-already-in-use' ||
    rawMsg.includes('auth/email-already-in-use') ||
    rawMsg.includes('email-already-in-use')
  ) {
    return {
      code: 'auth/email-already-in-use',
      title: 'Mobile / Email Already Registered',
      message: `An account for ${displayIdent} already exists with Uday Travels.`,
      suggestion: 'You do not need to register again. Please log in with your password to view availability and book seats.',
      action: {
        label: `Log In with ${displayIdent} →`,
        type: 'switch_to_login',
      },
    }
  }

  // 2. User not found (during login)
  if (
    rawCode === 'auth/user-not-found' ||
    rawMsg.includes('auth/user-not-found') ||
    rawMsg.includes('user-not-found')
  ) {
    return {
      code: 'auth/user-not-found',
      title: 'Account Not Found',
      message: `No passenger profile found for ${displayIdent}.`,
      suggestion: 'Please verify the mobile number or create a new free account to book your journey.',
      action: {
        label: `Create Account for ${displayIdent} →`,
        type: 'switch_to_register',
      },
    }
  }

  // 3. Wrong password / Invalid credential
  if (
    rawCode === 'auth/wrong-password' ||
    rawCode === 'auth/invalid-credential' ||
    rawMsg.includes('auth/wrong-password') ||
    rawMsg.includes('auth/invalid-credential') ||
    rawMsg.includes('invalid-credential')
  ) {
    return {
      code: 'auth/wrong-password',
      title: 'Incorrect Password or Mobile',
      message: 'The mobile number or password entered does not match our passenger records.',
      suggestion: 'Please double-check your password. If you forgot your password, contact customer care.',
      action: {
        label: 'Need Help? Call +91 98900 66580',
        type: 'contact_support',
      },
    }
  }

  // 4. Weak password
  if (
    rawCode === 'auth/weak-password' ||
    rawMsg.includes('auth/weak-password') ||
    rawMsg.includes('weak-password')
  ) {
    return {
      code: 'auth/weak-password',
      title: 'Password Too Short or Weak',
      message: 'Your chosen password is too weak.',
      suggestion: 'Please enter a password with at least 6 characters (using letters and numbers).',
    }
  }

  // 5. Rate limit / Too many requests
  if (
    rawCode === 'auth/too-many-requests' ||
    rawMsg.includes('auth/too-many-requests') ||
    rawMsg.includes('too-many-requests')
  ) {
    return {
      code: 'auth/too-many-requests',
      title: 'Temporarily Blocked (Too Many Attempts)',
      message: 'Access has been temporarily suspended due to consecutive failed sign-in attempts.',
      suggestion: 'For your security, please wait 2 to 3 minutes before attempting to log in again.',
      action: {
        label: 'Wait & Retry',
        type: 'retry',
      },
    }
  }

  // 6. Network connection failure
  if (
    rawCode === 'auth/network-request-failed' ||
    rawMsg.toLowerCase().includes('network') ||
    rawMsg.toLowerCase().includes('failed to fetch')
  ) {
    return {
      code: 'auth/network-request-failed',
      title: 'Network Connection Issue',
      message: 'Unable to reach the Uday Travels authentication service.',
      suggestion: 'Please check your internet connection and try again.',
      action: {
        label: 'Try Again',
        type: 'retry',
      },
    }
  }

  // 7. Invalid email / identifier format
  if (
    rawCode === 'auth/invalid-email' ||
    rawMsg.includes('auth/invalid-email')
  ) {
    return {
      code: 'auth/invalid-email',
      title: 'Invalid Mobile Number or Email',
      message: 'The provided mobile number or email format is invalid.',
      suggestion: 'Please enter a valid 10-digit Indian mobile number (e.g. 9890066580).',
    }
  }

  // 8. Account disabled
  if (
    rawCode === 'auth/user-disabled' ||
    rawMsg.includes('auth/user-disabled')
  ) {
    return {
      code: 'auth/user-disabled',
      title: 'Account Deactivated',
      message: 'This passenger account has been deactivated.',
      suggestion: 'Please contact Uday Travels official support for assistance.',
      action: {
        label: 'Call Support (+91 98900 66580)',
        type: 'contact_support',
      },
    }
  }

  // Clean generic fallback without raw Firebase prefixes
  const cleanMessage = rawMsg
    .replace(/^Firebase:\s*(Error\s*)?(\(auth\/[^)]+\)\.?\s*)?/i, '')
    .trim()

  return {
    code: rawCode || 'AUTH_ERROR',
    title: 'Authentication Notice',
    message: cleanMessage || 'Unable to complete your request. Please try again.',
    suggestion: 'If the problem persists, please check your network or contact support.',
  }
}

export class UdayAuthError extends Error {
  code: string
  title: string
  suggestion?: string
  action?: AuthActionConfig

  constructor(formatted: FormattedAuthError) {
    super(formatted.message)
    this.name = 'UdayAuthError'
    this.code = formatted.code
    this.title = formatted.title
    this.suggestion = formatted.suggestion
    this.action = formatted.action
  }
}
