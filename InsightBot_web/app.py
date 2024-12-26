from flask import Flask, render_template, request, jsonify, session
import os
from utils import *
from flask_cors import CORS
import markdown
import io

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["chrome-extension://eiiahlhaagkfnmgababhglmlonbebhke"]}})

# GLOBAL
document_dir_path = "resources/documents"
transcript_dir_path = "resources/transcripts"
rag_client = RAG()

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
        rag_client.reset_memory()

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
                    transcripts = transcriber.transcribe_return_text()
                    for transcript in transcripts:
                        # Process transcript (add to `all_documents` or any other logic)
                        all_documents.append({"File": youtube_link, "Data": transcript})
                    print(f"Transcription complete for: {youtube_link}")


        # Process uploaded documents
        if files:
            print("=== Processing Uploaded Documents ===")
            for file in files:
                print(f"Processing file: {file.filename}")
                try:
                    # Read file content directly
                    file_data = file.read()  # Read file content into memory
                    
                    # Determine file type and process accordingly
                    if file.filename.endswith(".txt"):
                        content = file_data.decode("utf-8")
                    elif file.filename.endswith(".pdf"):
                        reader = PdfReader(io.BytesIO(file_data))
                        content = ""
                        for page in reader.pages:
                            content += page.extract_text()
                    elif file.filename.endswith(".docx"):
                        document = DocxDocument(io.BytesIO(file_data))
                        content = "\n".join([para.text for para in document.paragraphs])
                    else:
                        print(f"Unsupported file format: {file.filename}")
                        continue
                    
                    # Ensure valid content was extracted
                    if not content.strip():
                        print(f"Warning: No content extracted from {file.filename}. Skipping.")
                        continue
                    
                    # Append the processed document
                    all_documents.append({"File": file.filename, "Data": content})
                    print(f"Processed file: {file.filename}")
                
                except Exception as e:
                    print(f"Error processing file {file.filename}: {e}")
                    
        if not all_documents:
            return jsonify({"error": "No valid documents to process"}), 400

        # Prepare and chunk data
        document_data = prepare_data(all_documents)
        documents_chunks = chunk_data(document_data)

        # Upsert to Pinecone or your vector store
        index_name = "insight-bot"
        namespace = "media-data"
        vectorstore_from_documents = rag_client.upsert_vectorstore_to_pinecone(documents_chunks, index_name, namespace)
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
    answer=rag_client.perform_rag(index_name, namespace, question)
    html_output = markdown.markdown(answer)
    return jsonify({"question": question, "answer": html_output})

if __name__ == "__main__":
    app.run(debug=True)