import os
import json
import openai
import pinecone
from dotenv import load_dotenv
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
from textblob import TextBlob
import string

# Load environment variables
load_dotenv()

# Initialize Pinecone
pinecone_api_key = os.getenv("PINECONE_API_KEY")
pinecone.init(api_key=pinecone_api_key, environment="us-east1-gcp")

# Initialize OpenAI API
openai.api_key = os.getenv("OPENAI_API_KEY")

# Download necessary NLTK data
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('wordnet')

lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words('english'))

# Preprocess function
def preprocess_review(review_text):
    review_text = review_text.lower()
    review_text = review_text.translate(str.maketrans('', '', string.punctuation))
    words = word_tokenize(review_text)
    filtered_words = [word for word in words if word not in stop_words]
    lemmatized_words = [lemmatizer.lemmatize(word) for word in filtered_words]
    return ' '.join(lemmatized_words).strip()

# Analyze sentiment
def analyze_sentiment(review_text):
    blob = TextBlob(review_text)
    return blob.sentiment.polarity

# Get OpenAI embedding
def get_openai_embedding(text):
    try:
        response = openai.Embedding.create(input=text, model="text-embedding-ada-002")
        return response['data'][0]['embedding']
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return None

# Create Pinecone index if it doesn't exist
index_name = "rag"
if index_name not in pinecone.list_indexes():
    pinecone.create_index(index_name, dimension=1536, metric="cosine")

index = pinecone.Index(index_name)

# Load reviews.json
with open("../backend/reviews.json", "r") as f:
    data = json.load(f)

# Process reviews and embed them
processed_data = []
for review in data["reviews"]:
    cleaned_review = preprocess_review(review['review'])
    sentiment_score = analyze_sentiment(review['review'])
    embedding = get_openai_embedding(cleaned_review)

    if embedding is None:
        print(f"Skipping review due to failed embedding: {cleaned_review}")
        continue

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

# Upsert embeddings into Pinecone
try:
    upsert_response = index.upsert(vectors=processed_data)
    print(f"Upserted count: {upsert_response.get('upserted_count')}")
except Exception as e:
    print(f"Failed to upsert data into Pinecone: {e}")
