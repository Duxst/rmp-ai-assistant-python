import { NextResponse } from 'next/server'
import axios from 'axios'

export async function POST(request: Request) {
  const { query } = await request.json()

  try {
    // Send the query to the FastAPI backend
    const backendResponse = await axios.post('http://127.0.0.1:8000/reviews', { query })
    return NextResponse.json({ message: backendResponse.data })
  } catch (error) {
    console.error('Error fetching embeddings:', error)
    return NextResponse.json({ message: 'Error fetching embeddings' }, { status: 500 })
  }
}
