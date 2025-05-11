import { NextResponse } from 'next/server';

export async function GET() {
  // This endpoint is just a placeholder. The actual WebSocket implementation
  // will be set up in a custom server file.
  return new NextResponse('WebSocket server is running');
}