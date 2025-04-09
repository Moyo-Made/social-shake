import SideNavLayout from '@/components/brandProfile/dashboard/SideNav'
import SupportHistory from '@/components/help-and-support/TicketHistory'
import React from 'react'

const page = () => {
  return (
	<SideNavLayout>
	  <SupportHistory />
	</SideNavLayout>
  )
}

export default page
