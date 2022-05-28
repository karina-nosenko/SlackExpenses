const parser = require('./Parser');

const buildResponse = (statusCode, body) => {
  return {
    statusCode: statusCode,
    body: body
  }
}

const printInstructions = () => {
    const instructions = `
    Please provide one of the next commands:

    /rentbal owe @danny 50 ILS [for shopping]
    /rentbal received 30 ILS from @danny [for shopping]
    /rentbal list owe me
    /rentbal list i owe`;

    return buildResponse(200, instructions);
};

exports.handler = async (event) => {

    const urlParams = new URLSearchParams(event.body);
    var reqText = urlParams.get('text');
    var reqUser = urlParams.get('user_name');

    if(!reqText) {
        console.info('Printed instructions after receiving command /rentbal')
        return printInstructions();     
    }
    
    const parsedObject = parser.parseText(reqText)
    console.info('Parameters: ', parsedObject.params);

    if (parsedObject.serviceFunction) {
        return parsedObject.serviceFunction(reqUser, parsedObject.params);
    } else {
        console.info('Invalid syntax.')
        return buildResponse(200, 'Invalid request.');
    }
};