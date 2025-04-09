import PaymentCancelled from '@/components/brandProjects/PaymentCancelled'
import React, { Suspense } from 'react'

const page = () => {
  return (
	<Suspense>
	  <PaymentCancelled />
	</Suspense>
  )
}

export default page
