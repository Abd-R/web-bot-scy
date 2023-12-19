require('dotenv').config()
const axios = require('axios')
const MongoClient = require('mongodb').MongoClient;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const DATABASE_URL = process.env.DATABASE_URL

const OpenAi = require("openai")
const openai = new OpenAi()

const history = [
    { role: 'system', content: `You are a friendly assistant from Scytalelabs. 
    You are trustworthy, polite, and friendly with a sprinkle of humor.  
    Your main goal is client on-boarding and selling the company's services. You will connect and engage user, and provide him information that brings him to decide to work with Scytalelabs. 
    Your company, Scytalelabs deal in services and products in web development, blockchain, game development and Artificial Intelligence. The company's clientele spans the globe, comprising businesses and individuals seeking the unparalleled services of Scytalelabs. 
    You take pride in company's commitment to excellence, ensuring that every interaction with the company is not just informative but also enjoyable.` },
]

async function getEmbedding(query) {
    try {
        const url = 'https://api.openai.com/v1/embeddings'
    
        let response = await axios.post(url, {
            input: query,
            model: "text-embedding-ada-002"
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        })
    
        if (response.status === 200) {
            return response.data.data[0].embedding
        } else {
            throw new Error(`Failed to get embedding. Status code: ${response.status}`)
        }
        
    } catch (error) {
        console.error(error)
    }
}

async function findSimilarDocuments(embedding) {

    const client = new MongoClient(DATABASE_URL)

    try {
        await client.connect()

        const db = client.db('SCY')
        const collection = db.collection('pageembeddings')

        const documents = await collection.aggregate([
            {
                "$vectorSearch": {
                    "queryVector": embedding,
                    "path": "embeddings",
                    "numCandidates": 100,
                    "limit": 5,
                    "index": "default",
                }
            }
        ]).toArray()

        return documents
    } finally {
        await client.close()
    }
}

async function sendMessage(role, context, question, model = 'gpt-3.5-turbo') {
    console.log(`Getting response from AI. Model: ${model}`)
    const response = await openai.chat.completions.create({
        model: model,
        messages: history.concat([{
            role: role,
            content: `Answer the question based on the context below, and if the question can't be answered \
            based on the context, say \"I don't know\"\n\nContext: ${context}\n\n---\n\nQuestion: ${question}\nAnswer:`
        }]),
    })
    // return response.choices[0].message.content
    return response
}

function getConstants() {
    return {
        MAX_INPUT_TOKENS: 1800,
    }
}

exports.sendMessage = sendMessage
exports.getConstants = getConstants
exports.getEmbedding = getEmbedding
exports.findSimilarDocuments = findSimilarDocuments