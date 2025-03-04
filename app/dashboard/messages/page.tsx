import ChatPage from '@/components/dashboard/messages/ChatPage'
import SideNavLayout from '@/components/dashboard/SideNav'
import React from 'react'

const page = () => {
  return (
	<SideNavLayout>
	  <ChatPage />
	</SideNavLayout>
  )
}

export default page
