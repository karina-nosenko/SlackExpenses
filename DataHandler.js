const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
AWS.config.update( {
  region: 'eu-west-1'
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = 'rentbal-db';

const buildResponse = (statusCode, body) => {
    return {
      statusCode: statusCode,
      body: body
    } 
};

const retrieveUsernameFromId = (id) => {
    const regex = /<@.*\|(.*)>/;
    const result = regex.exec(id);
    return result ? result[1] : id;
}

const scanDynamoRecords = async (scanParams, itemArray) => {
  try {
    const dynamoData = await dynamodb.scan(scanParams).promise();
    itemArray = itemArray.concat(dynamoData.Items);
    if (dynamoData.LastEvaluatedKey) {
      scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
      return await scanDynamoRecords(scanParams, itemArray);
    }
    return itemArray;
  } catch(error) {
    console.error('Error while getting the data: ', error);
  }
}

async function modifyDebt(debtId, updateKey, updateValue) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      'debtId': debtId
    },
    UpdateExpression: `set #attr = :value`,
    ExpressionAttributeValues: {
      ':value': updateValue
    },
    ExpressionAttributeNames: {
        '#attr': updateKey
    },
    ReturnValues: 'UPDATED_NEW'
  }
  return await dynamodb.update(params).promise().then((response) => {
    const body = {
      Operation: 'UPDATE',
      Message: 'SUCCESS',
      UpdatedAttributes: response
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error('Error while updating the debt: ', error);
  })
}

async function deleteDebt(debtId) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      'debtId': debtId
    },
    ReturnValues: 'ALL_OLD'
  }
  return await dynamodb.delete(params).promise().then((response) => {
    const body = {
      Operation: 'DELETE',
      Message: 'SUCCESS',
      Item: response
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error('Error while deleting the debt: ', error);
  })
}

module.exports = {
    async tryAddSumIfRecordExists(debtor, owner, sum, description) {
        // Get all the records
        const params = {
            TableName: dynamodbTableName
        }
        const allDebts = await scanDynamoRecords(params, []);
        
        // Find debt id of row that matches all the parameters
        const matchingDebts = allDebts.filter(debt => (debt.debtor == debtor)&&(debt.owner == owner)&&(debt.description == description))
        
        // Update the new sum of the debt if found
        if (matchingDebts.length > 0) {
            const debtId = matchingDebts[0].debtId;
            const newSum = parseInt(matchingDebts[0].sum) + parseInt(sum);
            await modifyDebt(debtId, 'sum', newSum);
            return newSum;
        } else {
            return false;
        }
    },
    async addNewRow (debtor, owner, sum, description) {
        const requestBody = {
            debtId: uuidv4(),
            owner: owner,
            debtor: debtor,
            sum: sum,
            description: description
        };
        const params = {
            TableName: dynamodbTableName,
            Item: requestBody
        };
        
        return await dynamodb.put(params).promise().then(() => {
            const body = `Success! ${debtor}: owe ${owner} ${sum} ILS ${description}`;
            return buildResponse(200, body);
         }, (error) => {
            console.error('Error while saving  data: ', error);
         })
    },
    async reduceSumByDescription(debtor, owner, sum, description) {
        // Get all the records
        const params = {
            TableName: dynamodbTableName
        }
        const allDebts = await scanDynamoRecords(params, []);
        
        // Find debt that matches all the parameters
        const matchingDebts = allDebts.filter(debt => (debt.debtor == retrieveUsernameFromId(debtor))&&(retrieveUsernameFromId(debt.owner) == owner)&&(debt.description == description))
        
        // If the debt found - update the new debt and the new sum
        if (matchingDebts.length <= 0) {
          console.info('Not found debt that matches the given description.');
          return sum;
        };
        
        const debtId = matchingDebts[0].debtId;
        sum = parseInt(sum);
        const debt = parseInt(matchingDebts[0].sum);
        let newDebt, newSum;
        
        if(sum - debt < 0) {
          console.info('Given sum is less that the debt. Modifying debt.')
          newDebt = debt - sum;
          await modifyDebt(debtId, 'sum', newDebt);
          newSum = 0;
        } else {
          console.info('Given sum is >= that the debt. Deleting the debt.')
          await deleteDebt(debtId);
          newSum = sum - debt;
        }
        
        return newSum;
    },
    async reduceSum(debtor, owner, sum) {
        // Get all the records
        const params = {
            TableName: dynamodbTableName
        }
        const allDebts = await scanDynamoRecords(params, []);
        
        // Find debt that matches all the parameters
        const matchingDebts = allDebts.filter(debt => (debt.debtor == retrieveUsernameFromId(debtor))&&(retrieveUsernameFromId(debt.owner) == owner))
        
        // If the debt found - update the new debt and the new sum
        if (matchingDebts.length <= 0) {
          console.info('Not found debt that matches the given debtor and owner.');
          return sum;
        };
        
        const debtId = matchingDebts[0].debtId;
        sum = parseInt(sum);
        const debt = parseInt(matchingDebts[0].sum);
        let newDebt, newSum;
        
        if(sum - debt < 0) {
          console.info('Given sum is less that the debt. Modifying debt.')
          newDebt = debt - sum;
          await modifyDebt(debtId, 'sum', newDebt);
          newSum = 0;
        } else {
          console.info('Given sum is >= that the debt. Deleting the debt.')
          await deleteDebt(debtId);
          newSum = sum - debt;
        }
        
        return newSum;
    },
    async getDebtorsOf(owner) {
        // Get all the records
        const params = {
            TableName: dynamodbTableName
        }
        const allDebts = await scanDynamoRecords(params, []);
        
        // Find all debts of the given owner
        const matchingDebts = allDebts.filter(debt => retrieveUsernameFromId(debt.owner) == owner);
        console.info('Got the list of all debtors of the caller: ', matchingDebts);
        
        return matchingDebts;
    },
    async getOwnersOf(debtor) {
        // Get all the records
        const params = {
            TableName: dynamodbTableName
        }
        const allDebts = await scanDynamoRecords(params, []);
        
        // Find all debts of the given owner
        const matchingDebts = allDebts.filter(debt => debt.debtor == debtor);
        console.info('Got the list of all owners of the caller: ', matchingDebts);
        
        return matchingDebts;
    }
}