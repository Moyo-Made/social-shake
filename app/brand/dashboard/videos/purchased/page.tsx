import PurchasedVideosLibrary from '@/components/brand/brandProfile/dashboard/PurchasedVideos'
import SideNavLayout from '@/components/brand/brandProfile/dashboard/SideNav'
import React from 'react'

const page = () => {
  return (
	<SideNavLayout>
	  <PurchasedVideosLibrary />
	</SideNavLayout>
  )
}

export default page
