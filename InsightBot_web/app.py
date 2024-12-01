from flask import Flask, render_template, request, jsonify, session
import os
from utils import *
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["chrome-extension://eiiahlhaagkfnmgababhglmlonbebhke"]}})

# GLOBAL
document_dir_path = "resources/documents"
transcript_dir_path = "resources/transcripts"

# route to home page
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chatbot')
def chatbot():
    return render_template('chatbot.html')

# submit multiple media files, youtube links
@app.route('/submit_media', methods=['POST'])
def submit_media():
    try:
        delete_files_in_directory(transcript_dir_path)
        delete_files_in_directory(document_dir_path)

        # Get YouTube links and documents from the request
        youtube_links = request.form.getlist('youtube_links[]')  # List of YouTube links
        files = request.files.getlist('documents[]')  # List of uploaded files

        # Validate input
        if not youtube_links and not files:
            return jsonify({"error": "At least one YouTube link or document is required"}), 400

        all_documents = []

        # Process each YouTube link
        if youtube_links:
            print("=== Processing YouTube Links ===")
            for youtube_link in youtube_links:
                if youtube_link:
                    print(f"Processing YouTube Link: {youtube_link}")
                    transcriber = YouTubeTranscriber(youtube_link, output_dir = transcript_dir_path)
                    transcriber.transcribe()
                    print(f"Transcription complete for: {youtube_link}")
            # process all transcripts
            transcript_documents = process_directory(transcript_dir_path)
            all_documents.extend(transcript_documents)

        # Process uploaded documents
        if files:
            print("=== Processing Uploaded Documents ===")
            for file in files:
                file_path = os.path.join(document_dir_path, file.filename)
                file.save(file_path)
                print(f"Saved file: {file_path}")
            # process all documents
            uploaded_documents = process_directory(document_dir_path)
            all_documents.extend(uploaded_documents)

        if not all_documents:
            return jsonify({"error": "No valid documents to process"}), 400

        # Prepare and chunk data
        document_data = prepare_data(all_documents)
        documents_chunks = chunk_data(document_data)

        # Upsert to Pinecone or your vector store
        index_name = "insight-bot"
        namespace = "media-data"
        vectorstore_from_documents = upsert_vectorstore_to_pinecone(documents_chunks, embeddings, index_name, namespace)
        print('=== Upsert to Pinecone done ===', vectorstore_from_documents)

        return jsonify({"message": "Media processed successfully!"})

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": "Failed to process media", "details": str(e)}), 500

@app.route('/ask_question', methods=['POST'])
def ask_question():
    question = request.form.get('question')
    # Get the response from the model
    index_name = "insight-bot"
    namespace = "media-data"
    pinecone_index = initialize_pinecone(index_name)
    answer=perform_rag(pinecone_index, namespace, question)
    return jsonify({"question": question, "answer": answer})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(port=port, debug=False)