from fastapi import FastAPI, HTTPException
import pinecone
import os
from dotenv import load_dotenv

# Initialize FastAPI
app = FastAPI()

# Load environment variables
load_dotenv()

# Initialize Pinecone
pinecone_api_key = os.getenv("PINECONE_API_KEY")
pinecone.init(api_key=pinecone_api_key, environment="us-east1-gcp")
index = pinecone.Index("rag")

@app.get("/")
async def read_root():
    return {"message": "Rate My Professors AI Assistant"}

@app.post("/reviews")
async def get_reviews(professor_name: str):
    try:
        # Query Pinecone for embeddings
        results = index.query(
            top_k=5,
            include_values=True,
            include_metadata=True,
            vector=[0] * 1536  # Placeholder vector, replace with actual query embedding
        )
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
