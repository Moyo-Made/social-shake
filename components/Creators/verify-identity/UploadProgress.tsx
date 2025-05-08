import React from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

interface UploadProgressProps {
  isUploading: boolean;
  currentFile: string | null;
  progress: number;
  totalFiles: number;
  completedFiles: number;
}

const UploadProgress: React.FC<UploadProgressProps> = ({
  isUploading,
  currentFile,
  progress,
  totalFiles,
  completedFiles,
}) => {
  if (!isUploading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-xl font-bold mb-4 text-center">
          Uploading Your Files
        </h3>
        
        {/* Overall progress */}
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-medium">{completedFiles} of {totalFiles} files</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-orange-500 h-2.5 rounded-full" 
              style={{ width: `${(completedFiles / totalFiles) * 100}%` }}
            ></div>
          </div>
        </div>
        
        {/* Current file progress */}
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 flex-shrink-0">
            <CircularProgressbar
              value={progress}
              text={`${Math.round(progress)}%`}
              styles={buildStyles({
                textSize: '22px',
                pathColor: '#3B82F6',
                textColor: '#111827',
                trailColor: '#E5E7EB',
              })}
            />
          </div>
          
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">
              {currentFile === 'verificationVideo' && 'Uploading Verification Video'}
              {currentFile === 'verifiableID' && 'Uploading ID Document'}
              {currentFile === 'profilePicture' && 'Uploading Profile Picture'}
            </h4>
            <p className="text-sm text-gray-500 mt-1">
              {progress < 100 
                ? "Please don't close this window" 
                : "Processing..."
              }
            </p>
          </div>
        </div>
        
        <div className="mt-4 text-center text-sm text-gray-500">
          This might take a few moments depending on your connection speed
        </div>
      </div>
    </div>
  );
};

export default UploadProgress;