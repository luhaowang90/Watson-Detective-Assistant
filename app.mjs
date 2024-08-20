import OpenAI, { toFile } from "openai";
import dotenv from 'dotenv'
import express from 'express'
import multer from 'multer';
import bodyParser from 'body-parser';
import fs from 'fs'
import path from 'path'
import showdown from "showdown";
import { fileURLToPath } from 'url';

dotenv.config()

const app = express();
const port = 3000;

const converter = new showdown.Converter();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext);
        cb(null, `${baseName}-${Date.now()}${ext}`);
    }
});

const upload = multer({ storage: storage });

//Connect to API
const openai = new OpenAI({
    apiKey: process.env.API_KEY
});

//Serve static files from public directory
app.use(bodyParser.json());
app.use(express.static('public'))

let assistant, vectorStore, thread
let file_array =[];

//Endpoint to start chat sesion
app.post('/start-chat', async(req, res) => {
    try {
        //Create vector store
        vectorStore = await openai.beta.vectorStores.create({
            name: 'Testing',
           expires_after: { anchor: 'last_active_at', days: 1 }
        });

        //Search for existing assistant. Create a new assistant if not found.
        const assistant_name = 'Mystery Assistant'

        const assistant_list = await openai.beta.assistants.list();
        const assistant_names = assistant_list.data.map(x => x.name);

        if (!assistant_names.includes(assistant_name)) {
            assistant = await openai.beta.assistants.create({
                name: 'Mystery Assistant',
                instructions: 'You are a murder mystery assistant, helping to solve murder mysteries.',
                model: 'gpt-4o',
            });

            console.log('Assistant created as assistant does not exist.');
        } else {
            for (const a of assistant_list.data) {
                if (a.name === assistant_name) {
                    assistant = await openai.beta.assistants.retrieve(a.id);
                    break;
                }
            }

            console.log('Assistant found. Loading pre-existing assistant.');
        }

        //Create message thread
        thread = await openai.beta.threads.create();

        res.json( {message: 'Chat session started successfully.' });

    } catch (error) {
        console.error('Error starting chat sesion', error);
        res.status(500).json({ message: 'Failed to start chat session.' });
    }
})

//Endpoint to send a message to the assistant
app.post('/send-message', async (req, res) => {
    const userInput = req.body.message

    try {
        //Load user input into thread
        await openai.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: userInput
        });
        console.log(`User: ${userInput}`);

        //Call assistant to execute and poll thread
        await openai.beta.threads.runs.createAndPoll(thread.id, {
            assistant_id: assistant.id
        });

        //Output results
        const messages = await openai.beta.threads.messages.list(thread.id);

        const reply = messages.data[0]?.content[0];
        if (reply.type === 'text') {
            const response = converter.makeHtml(reply.text.value);
            console.log('Assistant: ', response)
            res.json( {response });

        } else {
            res.json( {response: 'No text response from assistant. '});
        }

    } catch (error) {
        console.error('Error sending message: ', error);
        res.status(500).json( {message: 'Failed to send message.' });
    }
});

//Endpoint to take in user upload .single for single files, .array for multiple file
app.post('/upload-files', upload.array('files', 5), async (req, res) => {
    try {
        //Method to try, get file names when uploading through multer and push the file into Assistant through the upload folder
        
        //Create File Stream
        //const file = await openai.files.create({
        //    file: fs.createReadStream(req.file.path),
        //    purpose: 'assistants'
        //});

        //file_array.push(file.id) 

        //Loop through upload array, upload files to openai, save file id into array
        console.log(req.files)
        
        for (const file of req.files) {
            console.log(file.path)
            const uploadedFile = await openai.files.create({
                file: fs.createReadStream(file.path),
                purpose: 'assistants'
            })

            file_array.push(uploadedFile.id);
        }
        
        console.log(file_array);

        //Upload files into created vector store
        //await openai.beta.vectorStores.files.create(vectorStore.id, { 
        //    file_id: file.id
        //});

        //Update assistant to use uploaded file
        await openai.beta.assistants.update(assistant.id, {
            //tools: [{ type: 'file_search'}],
            tools: [{type: 'code_interpreter'}],
            tool_resources: {
                code_interpreter: { file_ids: file_array}
            }
        });

        res.json({message: `Files uploaded successfully.`})
        //res.json({ message: `${req.file.originalname} uploaded successfully.`});

    } catch (error) {
        console.error('Error uploading files: ', error);
        res.status(500).json({ message: 'Failed to upload files.' })
    }
})

//Endpoint to end session
app.post('/end-session', async (req, res) => {
    try {
        //Loop through file_array for file id to delete files.
        for (const file of file_array) {
            const fileDel = await openai.files.del(file);
            console.log(fileDel);
        }
        //Empty file_array
        file_array=[]


        //const fileDel = await openai.files.del(fileid)
        //console.log(fileDel)
        
        //Loop through files within vector store and delete them after completion
        const vectorStoreFiles = await openai.beta.vectorStores.files.list(vectorStore.id);
        const delFiles = vectorStoreFiles.data;

        for (const file of delFiles) {
            const delFilRes = await openai.files.del(file.id);
            console.log(delFilRes)
        }

        //Delete vector store after session
        const deletedVectorStore = await openai.beta.vectorStores.del(vectorStore.id)
        console.log(deletedVectorStore);
        
        res.json({ message: 'Session ended and cleaned up successfully'});

    } catch (error) {
        console.error('Error ending session: ', error);
        res.status(500).json({ message: 'Failed to end session.' })
    }
})

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});