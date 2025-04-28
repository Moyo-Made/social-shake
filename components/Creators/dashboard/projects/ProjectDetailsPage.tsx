import React from "react";
import ProjectDetails from "@/components/Creators/dashboard/projects/ProjectDetails";
import { ProjectFormProvider } from "@/components/brand/brandProjects/ProjectFormContext";

interface PageParams {
  projectId: string;
}

const ContestDetailsPage = ({ params }: { params: PageParams }) => {
  console.log("Page component received params:", params); 
  
  return (
    <ProjectFormProvider>
      <ProjectDetails projectId={params.projectId} />
    </ProjectFormProvider>
  );
};

export default ContestDetailsPage;