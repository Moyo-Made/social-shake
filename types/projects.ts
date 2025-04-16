
  export enum ProjectStatus{
	PENDING = 'pending',
	ACTIVE = 'active',
	COMPLETED = 'completed',
	REJECTED = 'rejected',
	REQUEST_EDIT = 'request_edit'

  }

  export interface DraftStatus{
	draftStatus: "draft"; 
  }