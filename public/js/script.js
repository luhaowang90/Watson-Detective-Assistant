window.addEventListener('load', function() {
    startChatSession();
});

window.addEventListener('beforeunload', function() {
    const confirmationMessage = 'Are you sure you want to leave this page? Your changes may not be saved.';
    event.returnValue = confirmationMessage; // Standard way to set the confirmation message
    return confirmationMessage; // Some browsers also require this return statement
});

//Modify endSession call to first check if vectorstore.id exist before exceuting
window.addEventListener('unload', function() {
    endSession()
});

const sendChat = document.getElementById('sendMessageBtn');
const uploadBtn = document.getElementById('uploadFilesBtn');
const textArea = document.getElementById('userInput');
const startSessionBtn = document.getElementById('startSessionBtn');
const endSessionBtn = document.getElementById('endSessionBtn');

const chatResponse = document.getElementById('responseContainer');
const uploadStatus = document.getElementById('uploadStatus');

let fileInput
let userInput

//Listen for start chart button click
startSessionBtn.addEventListener('click', startChatSession);

async function startChatSession () {
    try {
        chatResponse.innerHTML = "";
        uploadStatus.innerHTML = "";
        
        const response = await fetch ('/start-chat', { method: 'POST'});
        const result = await response.json();
        chatResponse.appendChild(createChatLi(result.message, "incoming"));
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

function sendMessage() {
    userInput = document.getElementById('userInput').value;
    document.getElementById('userInput').value = ""

    if (!userInput) {
        return;
    }

    chatResponse.appendChild(createChatLi(userInput, "outgoing"))

    setTimeout(() => {
        const incomingChatli = createChatHTML("Thinking...", "incoming");
        chatResponse.appendChild(incomingChatli);
        generateResponse(incomingChatli);
    }, 600)
}

async function generateResponse(incomingChatli) {
    const messageElement = incomingChatli.querySelector('p').nextSibling;
    
    try {
        if (fileInput) {
            const result = await uploadFiles();
            uploadStatus.innerHTML = result.message;
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
            messageElement.innerHTML = result.response
        }
        
    } catch (error) {
        console.error('Error sending message: ', error);
    }
}

//Listen to upload button
uploadBtn.addEventListener('click', function() {
    uploadStatus.innerHTML = ''
    document.getElementById('uploadFilesInput').click(); // Trigger file input click
});

document.getElementById('uploadFilesInput').addEventListener('change', function(event) {
    fileInput = event.target;
    const fileName = fileInput.files.length ? fileInput.files[0].name : 'No file chosen';
    document.getElementById('fileName').textContent = fileName;
    document.getElementById('fileIcon').style.display = 'flex'; 
    document.getElementById('fileName').style.display = 'flex';

    document.getElementById('removeFileBtn').style.display = fileInput.files.length ? 'inline-block' : 'none';
    document.getElementById('uploadSection').style.display = fileInput.files.length ? 'flex' : 'none';
});

document.getElementById('removeFileBtn').addEventListener('click', function() {
    //const fileInput = document.getElementById('uploadFilesInput');
    fileInput.value = ''; // Clear the file input
    document.getElementById('fileName').textContent = 'No file chosen'; // Reset file name display
    document.getElementById('removeFileBtn').style.display = 'none'; // Hide the remove button
    document.getElementById('uploadSection').style.display = 'none'; // Hide the uploadSection
    document.getElementById('fileIcon').style.display = 'none'; //Hide the fileIcon
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

        fileInput.value = ''; // Clear the file input
        document.getElementById('fileName').textContent = 'No file chosen'; // Reset file name display
        document.getElementById('fileName').style.display = 'none'; //Hide file name
        document.getElementById('fileIcon').style.display = 'none'; 
    
        document.getElementById('removeFileBtn').style.display = 'none'; // Hide the remove button
        document.getElementById('uploadSection').style.display = 'flex'; // Hide the uploadSection
    
        return result;

    } catch(error) {
        console.error('Error upload files: ', error);
    }
}

//Listen to end session button
endSessionBtn.addEventListener('click', endSession);

//Delete created vector and related files upon closing the window.
async function endSession() {
    try {
        const response = await fetch('/end-session', { method: 'POST' });
        const result = await response.json();
        chatResponse.appendChild(createChatLi(result.message, "incoming"));

    } catch (error) {
        console.error('Error ending sesion: ', error);
    }
}

const createChatLi = (message, className) => {
    const chatLi = document.createElement("li");
    chatLi.classList.add("chat", className);

    let chatContent = className === "outgoing" ? '<p id="title">User</p><p></p>' : '<p id="title">Assistant</p><p class="assistant"></p>';

    chatLi.innerHTML = chatContent;
    chatLi.querySelector('p').nextSibling.textContent = message;

    return chatLi
}

const createChatHTML = (message, className) => {
    const chatLi = document.createElement("li");
    chatLi.classList.add("chat", className);

    let chatContent = className === "outgoing" ? '<p id="title">User</p><p></p>' : '<p id="title">Assistant</p><p class="assistant"></p>';

    chatLi.innerHTML = chatContent;
    chatLi.querySelector('p').nextSibling.innerHTML = message;

    return chatLi
}
