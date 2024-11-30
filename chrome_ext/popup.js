// Submit and process all media
async function submitMedia(mediaItems) {
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
    return fetch('http://127.0.0.1:5000/submit_media', {
        method: 'POST',
        body: formData,
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOMContentLoaded")
    // Query the active tab in the current window
    // chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    
    // Query the active tab in the current window
    const tabs = await new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(tabs);
            }
        });
    });

    if (tabs.length > 0) {
        // Get the URL of the current tab
        const currentTab = tabs[0];
        const url = currentTab.url;
        // Display the URL in the popup
        document.getElementById("currentUrl").innerText = `Current URL: ${url}`;

        // Submit the URL
        try {
            const response = await submitMedia([{ type: 'YouTube', value: url }]);
            console.log("Media submitted successfully:", response);

            // Optionally, handle the response if needed
            if (response.ok) {
                console.log("Server Response:", response.json());
            } else {
                console.error("Failed to submit media:", response.statusText);
            }
        } catch (error) {
            console.error("Error submitting media:", error);
        }

    } else {
        // Handle the case where no active tab is found
        document.getElementById("currentUrl").innerText = "No active tab found.";
    }
});

document.getElementById('send-button').addEventListener('click', askQuestion);

function askQuestion() {
    const question = document.getElementById('question-input').value;
    console.log("question", question)
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

    // Clear the input
    document.getElementById('question-input').value = '';

    // Get the model response
    fetch('http://127.0.0.1:5000/ask_question', {
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

document.getElementById('clear-chat').addEventListener('click', clearChat);
// Function to clear chat 
function clearChat() {
    // Clear chat messages
    document.getElementById('chat-box').innerHTML = '';
}



// document.getElementById("sendData").addEventListener("click", async () => {
//     const inputData = document.getElementById("inputData").value;

//     try {
//         const response = await fetch("http://localhost:5050/api/data", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({ data: inputData })
//         });

//         if (!response.ok) {
//             const errorText = await response.text();
//             throw new Error(`Server Error: ${response.status} - ${errorText}`);
//         }

//         const result = await response.json();
//         document.getElementById("response").innerText = JSON.stringify(result);
//     } catch (error) {
//         document.getElementById("response").innerText = "Error: " + error.message;
//     }
// });

// document.getElementById("fetchUrlButton").addEventListener("click", () => {
//     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//         if (tabs.length > 0) {
//             const currentTab = tabs[0];
//             const url = currentTab.url;
//             document.getElementById("currentUrl").innerText = `Current URL: ${url}`;
//         }
//     });
// });


// document.addEventListener('DOMContentLoaded', () => {
//     console.log("Popup DOM loaded and script executed.");
//     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//         console.log('tabs', tabs)
//         if (tabs.length > 0) {
//             const currentTab = tabs[0];
//             const url = currentTab.url;
//             document.getElementById("currentUrl").innerText = `Current URL: ${url}`;
//         } else {
//             document.getElementById("currentUrl").innerText = "No active tab found.";
//         }
//     });
// });

