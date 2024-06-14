window.addEventListener('load', function() {
    startChatSession();
});

window.addEventListener('beforeunload', function() {
    const confirmationMessage = 'Are you sure you want to leave this page? Your changes may not be saved.';
    event.returnValue = confirmationMessage; // Standard way to set the confirmation message
    return confirmationMessage; // Some browsers also require this return statement
});

window.addEventListener('unload', function() {
    endSession()
});

const sendChat = document.getElementById('sendMessageBtn');
const uploadBtn = document.getElementById('uploadFilesBtn');
const textArea = document.getElementById('userInput');

const chatResponse = document.getElementById('responseContainer')

let fileInput

//Listen for start chart button click
async function startChatSession () {
    try {
        const response = await fetch ('/start-chat', { method: 'POST'});
        const result = await response.json();
        chatResponse.innerHTML = result.message;
    } catch (error) {
        console.error('Error starting chat session', error)
    }
}

//Execute sendMessage function on button click or enter key press
sendChat.addEventListener('click', sendMessage);

textArea.addEventListener("keydown", (e) => {
    //If Enter key is pressed without Shift key, handle the chat
    if(e.key === "Enter" && !e.shiftKey) {
        console.log(textArea.value)
        e.preventDefault();
        sendMessage();
    } 
});

async function sendMessage () {
    const userInput = document.getElementById('userInput').value;
    document.getElementById('userInput').value = ""

    if (!userInput) {
        return;
    }

    try {
        if (fileInput) {
            await uploadFiles();
        }

        if (userInput) {
            console.log(userInput)

            const response = await fetch('/send-message', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: userInput }),
            })
            
            const result = await response.json();
            chatResponse.innerHTML = result.response;
        }
        
    } catch (error) {
        console.error('Error sending message: ', error);
    }
}

function displayMessage(htmlContent) {
    const messageElement = document.createElement('div');
    messageElement.className = 'response';
    messageElement.innerHTML = htmlContent;
    responseContainer.appendChild(messageElement);
}

//Listen to upload button
uploadBtn.addEventListener('click', function() {
    document.getElementById('uploadFilesInput').click(); // Trigger file input click
});

document.getElementById('uploadFilesInput').addEventListener('change', function(event) {
    fileInput = event.target;
    const fileName = fileInput.files.length ? fileInput.files[0].name : 'No file chosen';
    document.getElementById('fileName').textContent = fileName;

    document.getElementById('removeFileBtn').style.display = fileInput.files.length ? 'inline-block' : 'none';
    document.getElementById('uploadSection').style.display = fileInput.files.length ? 'flex' : 'none';
});

document.getElementById('removeFileBtn').addEventListener('click', function() {
    //const fileInput = document.getElementById('uploadFilesInput');
    fileInput.value = ''; // Clear the file input
    document.getElementById('fileName').textContent = 'No file chosen'; // Reset file name display
    document.getElementById('removeFileBtn').style.display = 'none'; // Hide the remove button
    document.getElementById('uploadSection').style.display = 'none'; // Hide the uploadSection
});

async function uploadFiles() {
    const input = document.getElementById('uploadFilesInput');
    const file = input.files[0];
    
    const formData = new FormData();
    formData.append('file', file)

    try {
        const response = await fetch('/upload-files', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        chatResponse.innerHTML = result.message;

    } catch(error) {
        console.error('Error upload files: ', error);
    }

    fileInput.value = ''; // Clear the file input
    document.getElementById('fileName').textContent = 'No file chosen'; // Reset file name display
    document.getElementById('removeFileBtn').style.display = 'none'; // Hide the remove button
    document.getElementById('uploadSection').style.display = 'none'; // Hide the uploadSection
}

//Delete created vector and related files upon closing the window.
async function endSession() {
    try {
        const response = await fetch('/end-session', { method: 'POST' });
        const result = await response.json();
        chatResponse.innerHTML = result.message;

    } catch (error) {
        console.error('Error ending sesion: ', error);
    }
}

