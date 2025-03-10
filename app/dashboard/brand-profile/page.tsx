import BrandProfileDisplay from '@/components/dashboard/BrandProfileDisplay'
import SideNavLayout from '@/components/dashboard/SideNav'
import React from 'react'

const page = () => {
  return (
	<SideNavLayout>
	  <BrandProfileDisplay />
	</SideNavLayout>
  )
}

export default page
