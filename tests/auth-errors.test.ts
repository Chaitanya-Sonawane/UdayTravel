import { describe, it, expect } from 'vitest'
import { parseAuthError, UdayAuthError } from '../lib/auth/auth-errors'

describe('parseAuthError and UdayAuthError', () => {
  it('correctly parses auth/email-already-in-use with switch_to_login action', () => {
    const rawError = {
      code: 'auth/email-already-in-use',
      message: 'Firebase: Error (auth/email-already-in-use).',
    }
    const result = parseAuthError(rawError, { identifier: '9890066580' })

    expect(result.code).toBe('auth/email-already-in-use')
    expect(result.title).toContain('Already Registered')
    expect(result.message).toContain('+91 9890066580')
    expect(result.action?.type).toBe('switch_to_login')
    expect(result.action?.label).toContain('Log In with +91 9890066580')
  })

  it('correctly parses auth/user-not-found with switch_to_register action', () => {
    const rawError = {
      code: 'auth/user-not-found',
      message: 'Firebase: Error (auth/user-not-found).',
    }
    const result = parseAuthError(rawError, { identifier: '9890066580' })

    expect(result.code).toBe('auth/user-not-found')
    expect(result.title).toBe('Account Not Found')
    expect(result.action?.type).toBe('switch_to_register')
  })

  it('correctly parses auth/wrong-password and auth/invalid-credential', () => {
    const rawWrong = { code: 'auth/wrong-password', message: 'Wrong password' }
    const resWrong = parseAuthError(rawWrong)
    expect(resWrong.title).toBe('Incorrect Password or Mobile')

    const rawInvalid = { code: 'auth/invalid-credential', message: 'Invalid credential' }
    const resInvalid = parseAuthError(rawInvalid)
    expect(resInvalid.title).toBe('Incorrect Password or Mobile')
  })

  it('correctly parses weak-password and network-request-failed', () => {
    const weak = parseAuthError({ code: 'auth/weak-password' })
    expect(weak.title).toBe('Password Too Short or Weak')

    const network = parseAuthError({ code: 'auth/network-request-failed' })
    expect(network.title).toBe('Network Connection Issue')
    expect(network.action?.type).toBe('retry')
  })

  it('instantiates UdayAuthError with properties intact', () => {
    const formatted = parseAuthError({ code: 'auth/email-already-in-use' }, { identifier: '9890066580' })
    const err = new UdayAuthError(formatted)

    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(UdayAuthError)
    expect(err.code).toBe('auth/email-already-in-use')
    expect(err.title).toBe(formatted.title)
    expect(err.action?.type).toBe('switch_to_login')
  })
})
