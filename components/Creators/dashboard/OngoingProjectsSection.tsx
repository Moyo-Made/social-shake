import { Eye } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

interface UserProject {
	projectId: string;
	projectName: string;
	approvedVideos: number;
	totalVideos: number;
	completionPercentage: number;
}

// This is the Ongoing Projects section that exactly matches the image provided
export function OngoingProjectsSection({ userId }: { userId: string }) {
	const [loading, setLoading] = useState(true);
	const [userProjects, setUserProjects] = useState<UserProject[]>([]);

	// Fetch User Projects
	useEffect(() => {
		const fetchUserProjects = async () => {
			if (!userId) return;

			try {
				setLoading(true);
				const response = await fetch(`/api/user-project?userId=${userId}`);

				if (!response.ok) {
					throw new Error("Failed to fetch user projects");
				}

				const data = await response.json();

				if (data.success) {
					setUserProjects(data.data);
				} else {
					console.error("Error fetching user projects:", data.error);
				}
			} catch (error) {
				console.error("Failed to fetch user projects:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchUserProjects();
	}, [userId]);

	if (loading) {
		return (
			<div className="mb-12">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-semibold text-gray-800">
						Ongoing Projects
					</h2>
				</div>
				<div className="flex justify-center items-center h-32">
					<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				</div>
			</div>
		);
	}

	return (
		<div className="mb-12">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-semibold text-gray-800">
					Ongoing Projects
				</h2>
				<Link
					href="/creator/dashboard/project/all"
					className="bg-orange-500 hover:bg-orange-600 text-white text-sm py-2 px-6 rounded-md"
				>
					View All Projects
				</Link>
			</div>

			{userProjects.length > 0 ? (
				userProjects.map((project) => (
					<div key={project.projectId} className="w-full mb-6">
						<div className="flex justify-between items-center mb-2">
							<h3 className="text-base font-medium text-gray-800">
								{project.projectName}
							</h3>
							<Link
								href={`/creator/dashboard/project/${project.projectId}`}
								className="text-orange-500 hover:text-orange-600 text-sm flex items-center"
							>
								View Project
								<Eye size={18} className="ml-1" />
							</Link>
						</div>

						<div className="flex justify-between mb-2">
							<div className="text-sm font-normal text-gray-800">
								Project Progress
							</div>
							<div className="text-sm text-gray-800">
								{project.approvedVideos}/{project.totalVideos} videos approved
							</div>
						</div>

						<div className="h-3 bg-[#FFD9C3] rounded-full w-full overflow-hidden">
							<div
								className="h-full bg-orange-500 rounded-full"
								style={{ width: `${project.completionPercentage}%` }}
							></div>
						</div>
					</div>
				))
			) : (
				<div className="text-center py-8 bg-white rounded-lg shadow p-6">
					<p>No ongoing projects found.</p>
					<Link
						href="/creator/dashboard/project/all"
						className="mt-4 inline-block bg-orange-500 hover:bg-orange-600 text-white py-2 px-6 rounded-md"
					>
						Explore Projects
					</Link>
				</div>
			)}
		</div>
	);
}
