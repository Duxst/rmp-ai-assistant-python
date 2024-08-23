'use client'

import { useState } from 'react'
import axios from 'axios'

const Home = () => {
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    setLoading(true)
    try {
      // Make a POST request to the Next.js API route
      const res = await axios.post('/api/get-reviews', { query })
      setResponse(res.data.message)
    } catch (error) {
      console.error('Error:', error)
      setResponse('Error fetching reviews.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-6">Rate My Professors AI Assistant</h1>
      
      <input
        type="text"
        placeholder="Search for a professor"
        className="p-2 border rounded w-80 mb-4"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <button
        onClick={handleSearch}
        className="bg-blue-500 text-white p-2 rounded"
        disabled={loading}
      >
        {loading ? 'Searching...' : 'Search'}
      </button>

      {response && (
        <div className="mt-6 bg-white p-4 shadow rounded w-80">
          <h2 className="text-xl font-semibold mb-2">Results:</h2>
          <pre className="whitespace-pre-wrap">{response}</pre>
        </div>
      )}
    </div>
  )
}

export default Home
