const serverless = require('serverless-http');

let app;

exports.handler = async (event, context) => {
  if (!app) {
    // Import your Express app
    const { default: expressApp } = await import('../../dist/index.js');
    app = serverless(expressApp);
  }
  
  return await app(event, context);
};