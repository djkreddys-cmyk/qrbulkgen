import { Suspense } from "react"

import ResetPasswordClient from "./reset-password-client"

function LoadingState() {
  return (
    <div className="flex justify-center mt-32 px-6">
      <div className="w-full max-w-md border p-6 rounded bg-white">
        <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
        <p className="text-sm text-gray-600">Loading reset form...</p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResetPasswordClient />
    </Suspense>
  )
}
