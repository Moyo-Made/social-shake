import { ProjectFormData, ProjectStatus } from "@/types/contestFormData";

export function determineProjectStatus(formData: ProjectFormData): ProjectStatus {
	// If project is already marked completed, keep it that way
	if (formData.status === 'Completed') {
	  return 'Completed';
	}
	
	// Check if it's a draft (missing critical information)
	if (!formData.projectDetails.projectName || 
		!formData.projectDetails.projectDescription?.[0] ||
		!formData.projectRequirements.contentType ||
		!formData.projectRequirements.platform?.[0]) {
	  return 'Draft';
	}
	
	// Check if it's ready for accepting pitches (has all required info but no selected creators)
	if ((formData.creatorPricing.selectionMethod === "Invite Specific Creators" || 
		 formData.creatorPricing.selectionMethod === "Post Public Brief") &&
		formData.creatorPricing.budgetPerVideo > 0) {
	  return 'Accepting Pitches';
	}
	
	// Check if it has selected creators and budget but isn't completed
	if (((formData.creatorPricing.selectedCreators ?? []).length > 0 || 
		 (formData.creatorPricing.creator?.selectedCreators ?? []).length > 0) && 
		formData.creatorPricing.budgetPerVideo > 0) {
	  return 'Ongoing Project';
	}
	
	// Default to draft if we can't determine status
	return 'Draft';
  }