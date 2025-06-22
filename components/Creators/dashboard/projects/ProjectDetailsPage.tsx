import React from "react";
import ProjectDetails from "@/components/Creators/dashboard/projects/ProjectDetails";
import { ProjectFormProvider } from "@/components/brand/brandProjects/ProjectFormContext";
import { ProjectFormData } from "@/types/contestFormData";

interface PageParams {
  projectId: string;
  project: ProjectFormData;
}

const ProjectDetailsPage = ({ params }: { params: PageParams }) => { 

  const { projectId, project } = params;

  return (
    <ProjectFormProvider>
      <ProjectDetails projectId={projectId} project={project} />
    </ProjectFormProvider>
  );
};

export default ProjectDetailsPage;