export async function requestOtp(phone: string) {
  await new Promise((resolve) => setTimeout(resolve, 900))
  if (phone === '0000000000') throw new Error('network')
  return { accepted: true, phone }
}

export async function verifyOtp(code: string) {
  await new Promise((resolve) => setTimeout(resolve, 700))
  return code === '123456'
}
