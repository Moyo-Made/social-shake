import { format } from 'date-fns';

interface ContestProps {
  contest: {
    id: string;
    title: string;
    description: string;
    endDate: string;
    status: string;
    contestType: string;
    creatorCount: number;
    organizationId: string;
    organizationName: string;
    organizationLogo: string;
    joinedAt?: string;
    applicationId?: string;
    interestId?: string;
  };
}

export default function ContestCard({ contest }: ContestProps) {
  const formattedDate = format(new Date(contest.endDate), 'MMMM d, yyyy');
  
  // Function to get status label and color
  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'joined':
        return { label: 'Joined', color: 'text-green-600', bgColor: 'bg-green-100' };
      case 'pending':
        return { label: 'Pending Approval', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
      case 'interested':
        return { label: 'Interested', color: 'text-pink-600', bgColor: 'bg-pink-100' };
      case 'rejected':
        return { label: 'Rejected', color: 'text-red-600', bgColor: 'bg-red-100' };
      case 'completed':
        return { label: 'Completed', color: 'text-gray-600', bgColor: 'bg-gray-100' };
      default:
        return { label: 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  // Function to determine what action buttons to show based on status
  const renderActionButtons = (status: string) => {
    switch(status) {
      case 'joined':
        return (
          <>
            <ActionButton text="View Leaderboard" icon="arrow-right" primary />
            <ActionButton text="View Channel" icon="mail" secondary />
          </>
        );
      case 'pending':
        return (
          <>
            <ActionButton text="View Contest" icon="arrow-right" primary />
            <ActionButton text="Cancel Application" icon="x" danger />
          </>
        );
      case 'interested':
        return (
          <>
            <ActionButton text="View Contest" icon="arrow-right" primary />
            <ActionButton text="Remove Interest" icon="bookmark" secondary />
          </>
        );
      case 'rejected':
        return (
          <ActionButton text="View Details" icon="arrow-right" primary />
        );
      case 'completed':
        return (
          <>
            <ActionButton text="View Results" icon="arrow-right" primary />
            <ActionButton text="View Channel" icon="mail" secondary />
          </>
        );
      default:
        return <ActionButton text="View Contest" icon="arrow-right" primary />;
    }
  };

  const { label, color, bgColor } = getStatusInfo(contest.status);
  
  // Helper component for action buttons
  interface ActionButtonProps {
    text: string;
    icon: 'arrow-right' | 'mail' | 'x' | 'bookmark';
    primary?: boolean;
    secondary?: boolean;
    danger?: boolean;
  }

  function ActionButton({ text, icon, primary = false, secondary = false, danger = false }: ActionButtonProps) {
    let buttonClasses = "flex items-center justify-center py-2 px-4 rounded font-medium";
    
    if (primary) {
      buttonClasses += " bg-orange-500 hover:bg-orange-600 text-white";
    } else if (secondary) {
      buttonClasses += " bg-gray-900 hover:bg-black text-white";
    } else if (danger) {
      buttonClasses += " bg-red-500 hover:bg-red-600 text-white";
    }
    
    return (
      <button className={buttonClasses}>
        {text}
        {icon === 'arrow-right' && (
          <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        )}
        {icon === 'mail' && (
          <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )}
        {icon === 'x' && (
          <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {icon === 'bookmark' && (
          <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        )}
      </button>
    );
  }

  // Helper component for time labels (joined, applied, published)
  function TimeLabel({ status, time }: { status: string; time: string }) {
    let label = '';
    
    switch(status) {
      case 'joined':
        label = 'Joined:';
        break;
      case 'pending':
        label = 'Applied:';
        break;
      case 'interested':
      case 'rejected':
        label = 'Published:';
        break;
      default:
        label = 'Date:';
    }
    
    return (
      <div className="text-gray-500 text-sm">
        {label} <span className="text-gray-700">{time}</span>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="flex">
        {/* Contest Image */}
        <div className="w-1/4 bg-gray-200">
          <img 
            src="/api/placeholder/300/200" 
            alt={contest.title}
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Contest Details */}
        <div className="w-3/4 p-4">
          {/* Status and Title */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${color}`}>
                  {status === 'joined' && (
                    <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-green-400" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                  )}
                  {status === 'pending' && (
                    <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-yellow-400" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                  )}
                  {status === 'interested' && (
                    <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-pink-400" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                  )}
                  {status === 'rejected' && (
                    <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-red-400" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                  )}
                  {label}
                </span>
              </div>
              <h3 className="text-lg font-semibold mt-1">{contest.title}</h3>
            </div>
            <TimeLabel status={contest.status} time="2 days ago" />
          </div>
          
          {/* Organization */}
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
              <img 
                src="/api/placeholder/32/32" 
                alt={contest.organizationName}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="ml-2 text-sm font-medium text-gray-700">{contest.organizationName || "Social Shake"}</span>
          </div>
          
          {/* Description */}
          <p className="text-gray-600 mb-4 text-sm">
            {contest.description || "We're looking for an energetic and engaging TikTok ad for XYZ Shoes. Highlight comfort and style, and encourage users to try them out!"}
          </p>
          
          {/* Contest Details */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <h4 className="text-sm font-normal text-orange-500">Contest Type</h4>
              <p className="text-sm font-medium">{contest.contestType || "Leaderboard"}</p>
            </div>
            <div>
              <h4 className="text-sm font-normal text-orange-500">Contest End Date</h4>
              <p className="text-sm font-medium">{formattedDate}</p>
            </div>
            <div>
              <h4 className="text-sm font-normal text-orange-500">Creators Joined</h4>
              <p className="text-sm font-medium">{contest.creatorCount || 10} Creators</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            {renderActionButtons(contest.status)}
          </div>
        </div>
      </div>
    </div>
  );
}