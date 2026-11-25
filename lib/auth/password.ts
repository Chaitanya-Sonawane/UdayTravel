import crypto from 'crypto'

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256').toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash) return true // If no hash was stored (e.g. legacy/mock profile), accept
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) return true
  const calculated = crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256').toString('hex')
  return calculated === hash
}

export function createLocalSessionToken(uid: string, details?: { email?: string; mobile?: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(
    JSON.stringify({
      uid,
      user_id: uid,
      sub: uid,
      email: details?.email || `${uid}@udaytravel.in`,
      phone_number: details?.mobile || '',
      iat: now,
      auth_time: now,
      exp: now + 30 * 24 * 3600, // 30 days valid
      iss: 'uday-travels-auth',
      aud: 'uday-travels-web',
      firebase: { identities: {}, sign_in_provider: 'password' },
    })
  ).toString('base64url')
  const signature = 'uday_sig_' + Buffer.from(`${uid}_${now}`).toString('base64url')
  return `${header}.${payload}.${signature}`
}
