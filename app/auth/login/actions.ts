'use server'

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function login(_prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Please enter both email and password.' }
  }

  let redirectPath: string | null = null
  try {
    console.error('DEBUG_LOG: Login attempt for:', email)
    console.error('DEBUG_LOG: Password length:', password.length)
    console.error('DEBUG_LOG: Secret status:', !!process.env.BETTER_AUTH_SECRET)
    console.error('DEBUG_LOG: First char:', password.substring(0, 1))
    console.error('DEBUG_LOG: Last char:', password.substring(password.length - 1))

    const result = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    })

    if (result && 'user' in result) {
      const role = (result.user as { role?: string }).role
      if (role === 'admin') redirectPath = '/dashboard'
      else if (role === 'doctor') redirectPath = '/doctor'
      else if (role === 'receptionist') redirectPath = '/receptionist'
      else redirectPath = '/dashboard'
    } else {
      return { error: 'Invalid credentials.' }
    }
  } catch (error) {
    console.error('Login error:', error)
    return { error: 'Invalid credentials.' }
  }

  if (redirectPath) {
    redirect(redirectPath)
  }

  redirect('/')
}
