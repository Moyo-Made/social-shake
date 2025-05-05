"use client";

import { useEffect, useState } from "react";
import { db } from "@/config/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  issueType: string;
  createdAt: Timestamp;
  lastUpdated: Timestamp;
  status: string;
  userId: string;
  createdBy: string;
  messages: Array<{
	content: string;
	sender: string;
  }>;
}

export default function SupportTicketHistory() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;

  // Fetch tickets from Firestore
  useEffect(() => {
	const fetchTickets = async () => {
	  if (!userId) {
		console.error("User not authenticated");
		setIsLoading(false);
		return;
	  }

	  try {
		const ticketsQuery = query(
		  collection(db, "tickets"),
		  where("userId", "==", userId),
		  orderBy("createdAt", "desc")
		);

		const querySnapshot = await getDocs(ticketsQuery);
		const ticketData: Ticket[] = [];
		
		querySnapshot.forEach((doc) => {
		  const data = doc.data();
		  ticketData.push({
			id: doc.id,
			subject: data.subject,
			description: data.description,
			issueType: data.issueType,
			createdAt: data.createdAt,
			lastUpdated: data.lastUpdated,
			status: data.status,
			userId: data.userId,
			createdBy: data.createdBy,
			messages: data.messages || [],
		  });
		});
		
		setTickets(ticketData);
		setFilteredTickets(ticketData);
	  } catch (error) {
		console.error("Error fetching tickets:", error);
	  } finally {
		setIsLoading(false);
	  }
	};

	fetchTickets();
  }, [userId]);

  // Filter tickets based on search query and status filter
  useEffect(() => {
	let results = tickets;
	
	// Apply status filter
	if (statusFilter !== "all") {
	  results = results.filter((ticket) => ticket.status.toLowerCase() === statusFilter);
	}
	
	// Apply search filter
	if (searchQuery) {
	  const query = searchQuery.toLowerCase();
	  results = results.filter((ticket) => 
		ticket.subject.toLowerCase().includes(query) || 
		ticket.id.toLowerCase().includes(query) ||
		ticket.description.toLowerCase().includes(query)
	  );
	}
	
	setFilteredTickets(results);
  }, [searchQuery, statusFilter, tickets]);

  // Format date to display
  const formatDate = (timestamp: Timestamp | null) => {
	if (!timestamp) return "N/A";
	
	const date = timestamp.toDate();
	return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  // Get status badge based on ticket status
  const getStatusBadge = (status: string) => {
	switch (status.toLowerCase()) {
	  case "open":
		return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFF0C3] border border-[#FDD849] text-[#1A1A1A]">• Open</span>;
	  case "resolved":
		return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ Resolved</span>;
	  case "in progress":
		return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">• In Progress</span>;
	  case "closed":
		return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">✓ Closed</span>;
	  default:
		return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
	}
  };

  return (
	<div className="w-full">
	  <h1 className="text-2xl font-bold mb-6">Support Ticket History</h1>
	  
	  <div className="flex flex-col md:flex-row gap-4 mb-6">
		<div className="relative flex-grow">
		  <Input
			type="text"
			placeholder="Search Tickets"
			value={searchQuery}
			onChange={(e) => setSearchQuery(e.target.value)}
			className="pl-10"
		  />
		  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
			<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
		  </div>
		</div>
		
		<div className="md:w-48">
		  <Select value={statusFilter} onValueChange={setStatusFilter}>
			<SelectTrigger>
			  <SelectValue placeholder="Filter by Status" />
			</SelectTrigger>
			<SelectContent>
			  <SelectItem value="all">All Statuses</SelectItem>
			  <SelectItem value="open">Open</SelectItem>
			  <SelectItem value="in progress">In Progress</SelectItem>
			  <SelectItem value="resolved">Resolved</SelectItem>
			  <SelectItem value="closed">Closed</SelectItem>
			</SelectContent>
		  </Select>
		</div>
	  </div>

	  {isLoading ? (
		<div className="text-center py-8">
		  <div className="inline-block h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-solid border-orange-500 border-r-transparent"></div>
		  <p className="mt-2 text-gray-600">Loading tickets...</p>
		</div>
	  ) : (
		<>
		  {filteredTickets.length === 0 ? (
			<div className="text-center py-8 border rounded-lg">
			  <p className="text-gray-500">No tickets found</p>
			  {searchQuery || statusFilter !== "all" ? (
				<p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
			  ) : (
				<p className="text-sm text-gray-400 mt-1">Submit a new support request to get help</p>
			  )}
			</div>
		  ) : (
			<div className="overflow-x-auto border rounded-lg">
			  <table className="min-w-full divide-y divide-gray-200">
				<thead className="bg-gray-50">
				  <tr>
					<th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-500">
					  Ticket ID
					</th>
					<th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-500 ">
					  Subject
					</th>
					<th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-500 ">
					  Created At
					</th>
					<th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-500 ">
					  Last Updated
					</th>
					<th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-500 ">
					  Status
					</th>
					<th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-500 ">
					  Actions
					</th>
				  </tr>
				</thead>
				<tbody className="bg-white divide-y divide-gray-200">
				  {filteredTickets.map((ticket) => (
					<tr key={ticket.id} className="hover:bg-gray-50">
					  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
						#{ticket.id.substring(0, 4)}
					  </td>
					  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
						{ticket.subject}
					  </td>
					  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
						{formatDate(ticket.createdAt)}
					  </td>
					  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
						{formatDate(ticket.lastUpdated)}
					  </td>
					  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
						{getStatusBadge(ticket.status)}
					  </td>
					  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
						<Link href={`/brand/dashboard/help-support/tickets/${ticket.id}`} className="text-orange-500 hover:underline">
						  View Ticket
						</Link>
					  </td>
					</tr>
				  ))}
				</tbody>
			  </table>
			</div>
		  )}
		</>
	  )}
	</div>
  );
}