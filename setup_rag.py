import os
import json
import requests
from dotenv import load_dotenv
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
from textblob import TextBlob
from pinecone import Pinecone, ServerlessSpec

# Load environment variables
load_dotenv()

# Initialize Pinecone
pinecone = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

# Download necessary NLTK data
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('wordnet')

# Initialize lemmatizer and stopwords
lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words('english'))

# Preprocessing function
def preprocess_review(review_text):
    review_text = review_text.lower()  # Convert to lowercase
    review_text = review_text.translate(str.maketrans('', '', string.punctuation))  # Remove punctuation
    words = word_tokenize(review_text)  # Tokenize
    filtered_words = [word for word in words if word not in stop_words]  # Remove stopwords
    lemmatized_words = [lemmatizer.lemmatize(word) for word in filtered_words]  # Lemmatize
    lemmatized_words = [word for word in lemmatized_words if word.isalpha()]  # Remove non-alphabetic characters
    return ' '.join(lemmatized_words).strip()

# Sentiment analysis function
def analyze_sentiment(review_text):
    blob = TextBlob(review_text)
    return blob.sentiment.polarity

# Function to generate embedding using LLaMA API via OpenRouter
def get_llama_embedding(text):
    api_url = "https://openrouter.ai/api/v1/meta-llama/llama-3.1-8b-instruct:free/embedding"
    headers = {
        "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
        "Content-Type": "application/json"
    }
    data = {
        "input": text
    }
    response = requests.post(api_url, headers=headers, json=data)
    
    if response.status_code == 200:
        return response.json()["embedding"]
    else:
        raise Exception(f"Failed to get embedding: {response.status_code} {response.text}")

# Create a Pinecone index
pinecone.create_index(
    name="rag",
    dimension=1536,  # Assuming LLaMA embeddings are 1536-dimension
    metric="cosine",
    spec=ServerlessSpec(cloud="aws", region="us-east-1")
)

# Load review data
with open("reviews.json", "r") as f:
    data = json.load(f)

# Process and embed reviews
processed_data = []
for review in data["reviews"]:
    cleaned_review = preprocess_review(review['review'])
    sentiment_score = analyze_sentiment(review['review'])

    # Get LLaMA embedding from OpenRouter API
    try:
        embedding = get_llama_embedding(cleaned_review)
    except Exception as e:
        print(f"Error generating embedding for review: {review['review']}")
        continue

    # Store processed review with embedding and metadata
    processed_data.append({
        "values": embedding,
        "id": review["professor"],
        "metadata": {
            "cleaned_review": cleaned_review,
            "sentiment": sentiment_score,
            "subject": review["subject"],
            "stars": review["stars"],
        }
    })

# Insert embeddings into Pinecone
index = pinecone.Index("rag")
upsert_response = index.upsert(
    vectors=processed_data,
    namespace="ns1",
)
print(f"Upserted count: {upsert_response['upserted_count']}")
