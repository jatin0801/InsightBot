
// Function to handle question submission and display chat
function askQuestion() {
    const question = document.getElementById('question-input').value;

    if (!question) {
        alert('Please ask a question');
        return;
    }

    const chatBox = document.getElementById('chat-box');

    // Display the question in chat
    const questionElement = document.createElement('div');
    questionElement.className = 'chat-message question';
    questionElement.textContent = question;
    chatBox.appendChild(questionElement);
    chatBox.scrollTop = chatBox.scrollHeight;
    // Clear the input
    document.getElementById('question-input').value = '';

    // Get the model response
    fetch('/ask_question', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `question=${question}`
    })
    .then(response => response.json())
    .then(data => {
        // Display the model's answer in chat
        const answerElement = document.createElement('div');
        answerElement.className = 'chat-message answer';
        answerElement.textContent = data.answer;
        chatBox.appendChild(answerElement);

        // Scroll to the bottom of the chat
        chatBox.scrollTop = chatBox.scrollHeight;
    })
    .catch(error => console.error('Error:', error));
}

// Function to clear chat 
function clearChat() {
    // Clear chat messages
    document.getElementById('chat-box').innerHTML = '';
}

// Store selected media
const mediaItems = [];

// Add YouTube Link
function addYoutubeLink() {
    const link = document.getElementById('youtube-link').value;
    if (link) {
        mediaItems.push({ type: 'YouTube', value: link });
        updateMediaList();
        document.getElementById('youtube-link').value = '';
    } else {
        alert('Please enter a valid YouTube link.');
    }
}

// Add Uploaded Documents
function addDocuments() {
    const files = document.getElementById('upload-docs').files;
    for (let i = 0; i < files.length; i++) {
        // Push the entire file object, not just the name
        mediaItems.push({ type: 'Document', value: files[i] });
    }
    updateMediaList();
}

// Update the Media List Display
function updateMediaList() {
    const list = document.getElementById('media-items');
    list.innerHTML = '';
    mediaItems.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.type}: ${
            item.type === 'Document' ? item.value.name : item.value
        }`;
        list.appendChild(li);
    });
}

// Submit and process all media
function submitMedia() {
    const formData = new FormData();

    // Add YouTube Links and Documents to FormData
    mediaItems.forEach(item => {
        if (item.type === 'YouTube') {
            formData.append('youtube_links[]', item.value);
        } else if (item.type === 'Document') {
            // Use the actual file object
            formData.append('documents[]', item.value);
        }
    });

    // Debug: Log form data entries
    for (const [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
    }

    // Send FormData to the server
    return fetch('/submit_media', {
        method: 'POST',
        body: formData,
    });
}

// Navigate to Chatbot Page
async function goToChatbot() {
    if (mediaItems.length > 0) {
        try {

            // Create the loader overlay
            const loaderOverlay = document.createElement('div');
            loaderOverlay.className = 'loader-overlay';

            // Create the loader box
            const loaderBox = document.createElement('div');
            loaderBox.className = 'loader-box';

            // Add spinner and text to the loader box
            loaderBox.innerHTML = `
                <div class="loader-spinner"></div>
                <div class="loader-text">Analyzing media... Please wait</div>
            `;

            // Append the loader box to the overlay
            loaderOverlay.appendChild(loaderBox);

            // Append the overlay to the body
            document.body.appendChild(loaderOverlay);

            // Call submitMedia and wait for the server response
            const response = await submitMedia();

            // Remove the loader overlay once a response is received
            loaderOverlay.remove();
            
            if (response.ok) {
                // Redirect to the chatbot page if submission is successful
                window.location.href = '/chatbot';
            } else {
                // Handle errors from the server
                const errorData = await response.json();
                alert(`Error: ${errorData.error || 'Failed to submit media.'}`);
            }
        } catch (error) {
            console.error('Error submitting media:', error);
            alert('An error occurred while submitting media. Please try again.');
        }
    } else {
        alert('Please add at least one media item.');
    }
}

function goHome() {
    window.location.href = '/';
}

const inputBox = document.getElementById('question-input');
const sendButton = document.getElementById('send-button');

// Add keydown event listener to the input box
inputBox.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        // Trigger the send button click when Enter is pressed
        sendButton.click();
    }
});