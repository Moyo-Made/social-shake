import SideNavLayout from '@/components/admin/AdminSideNav'
import ContestDetailsPage from '@/components/admin/ContestDetails'
import React from 'react'

export default function page () {
  return (
	<div>
		<SideNavLayout>

	  <ContestDetailsPage />
		</SideNavLayout>
	</div>
  )
}

