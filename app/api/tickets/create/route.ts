import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/config/firebase';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    // Get authenticated user
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { issueType, subject, description, attachmentUrl } = req.body;
    
    // Validate required fields
    if (!issueType || !subject || !description) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Create ticket in Firestore
    const ticketRef = await db.collection('tickets').add({
      userId: session.user.id,
      issueType,
      subject,
      description,
      attachmentUrl: attachmentUrl || '',
      status: 'open',
      createdAt: new Date(),
      lastUpdated: new Date(),
      messages: [{
        sender: 'user',
        content: description,
        timestamp: new Date()
      }]
    });
    
    return res.status(201).json({ 
      success: true, 
      ticketId: ticketRef.id 
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}