export const runtime = 'edge';

'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Lock, User, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { login } from './actions'

function SubmitButton({ isLoading }: { isLoading: boolean }) {
  return (
    <Button className="w-full" disabled={isLoading}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing In...
        </>
      ) : (
        'Sign In'
      )}
    </Button>
  )
}

export default function LoginPage() {
  const [state, action, isPending] = useActionState(login, undefined)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <form action={action}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  id="email"
                  name="email"
                  placeholder="Enter your email"
                  className="pl-10"
                  type="email"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 z-10" />
                <PasswordInput
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            {state?.error && <div className="text-sm text-red-500 text-center">{state.error}</div>}
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <SubmitButton isLoading={isPending} />
            <div className="text-sm text-center text-gray-500">
              <Link href="#" className="hover:underline">
                Forgot password?
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
