const data = require('./DataHandler');

const buildResponse = (statusCode, body) => {
    return {
      statusCode: statusCode,
      body: body
    }
};

const formatDebtsList = (debtsList) => {
    let result = '';
    
    for(let i = 0; i < debtsList.length; i++) {
        result += `${ debtsList[i].debtor } owe ${ debtsList[i].owner } ${ debtsList[i].sum } ILS ${ debtsList[i].description }\n`;
    }
    
    return result;
}

module.exports = {
    /**
     * @debtor : /rentbal owe @owner @sum ILS [@description]
     */
    async owe (debtor, [owner, sum, description = '']) { 
        console.info(`${debtor}: owe ${owner} ${sum} ILS ${description}`)

        if (sum < 0) {
            return buildResponse(200, 'Invalid request.');
        }
        
        const newSum = await data.tryAddSumIfRecordExists(debtor, owner, sum, description);
        if(newSum) {
            console.info('Added sum to an existing record.')
            const body = `Success! ${debtor}: owe ${owner} ${newSum} ILS ${description}`;
            return buildResponse(200, body);
        } else {
            console.info('Adding new debt row to the table.')
            return data.addNewRow(debtor, owner, sum, description);
        };
    },

    /**
     * @owner : /rentbal received @sum ILS from @owner [@description]
     * @returns : sum that remained after returning the debt. Can be >= 0
     */
    async received(owner, [debtor, sum, description = '']) {
        console.info(`${owner}: received ${sum} ILS from ${debtor} ${description}`);
        
        let newSum = sum;
        
        if (newSum < 0) {
            return buildResponse(200, 'Invalid request.');
        }
        if (description.length > 0) {   // Find exact description and reduce the sum
            newSum = await data.reduceSumByDescription(debtor, owner, newSum, description);
        }
        if (newSum > 0) { // Find empty description and reduce the sum
            newSum = await data.reduceSumByDescription(debtor, owner, newSum, '');
        }
        if (newSum > 0) { // Reduce the sum from every debt (ignore the description)
            newSum = await data.reduceSum(debtor, owner, newSum);
        }

        return  buildResponse(200, `Success! ${owner}: received ${ sum - newSum } ILS from ${debtor} ${description}`);
    },

    /**
     * @owner : /rentbal list owe me
     */
    async listOweMe(owner) {
        console.info(`${owner}: list owe me`);
        const debtors = await data.getDebtorsOf(owner);
        const formattedDebtors = debtors.length ? formatDebtsList(debtors) : 'Nobody owes you.';
        return buildResponse(200, formattedDebtors);
    },

    /**
     * @debtor : /rentbal list i owe
     */
    async listIOwe(debtor) {
        console.info(`${debtor}: list i owe`);
        const owners = await data.getOwnersOf(debtor);
        const formattedOwners = owners.length ? formatDebtsList(owners) : 'You own to nobody.';
        return buildResponse(200, formattedOwners);
    }
};