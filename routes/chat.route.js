const express = require('express');
const { getEmbedding, findSimilarDocuments, sendMessage, getConstants } = require('../utils/utils');
const router = express.Router()

router.post('/', async (req, res, next) => {
  try {
    
    const query = req.body.query

    console.log('Question:', query);
    console.log('Getting query embeddings...');

    const embedding = await getEmbedding(query);
    console.log('Finding similar vectors...');
    const documents = await findSimilarDocuments(embedding);
    const constants = getConstants()

    const maxLen = constants.MAX_INPUT_TOKENS
    let curLen = 0
    const context = []
    console.log('Formulating Context...');

    for (const row of documents) {
      curLen += row.nTokens + 4;

      if (curLen > maxLen) {
        break;
      }

      context.push(row.page);
    }

    const response = await sendMessage('user', context, query)
    console.log(response);
    console.log(response.choices[0].message.content);

    return res.status(200).json({
      success: true,
      response: response.choices[0].message.content
    })

  } catch (error) {
    console.log('Internal server error:', error);
    return res.status(500).json({
      success: false,
      error: error
    }) 
  }
})

module.exports = router
