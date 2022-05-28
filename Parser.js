const { owe, received, listOweMe, listIOwe } = require('./Service');

const getDescription = (tokensList, startIndex) => {
    let description = '';

    for(let i=startIndex; i<tokensList.length; i++) { 
        description += tokensList[i];
        description += ' ';
    }

    return description;
}

const parseOwe = (tokensList, symbols) => {
    if (tokensList.length < 4 || tokensList[3] !== 'ILS') {
        return symbols;
    }

    symbols.serviceFunction = owe;
    symbols.params.push(tokensList[1]);                    // owner
    symbols.params.push(tokensList[2]);                    // sum  
    symbols.params.push(getDescription(tokensList, 4));    // description

    return symbols;
};

const parseReceived = (tokensList, symbols) => {
    if (tokensList.length < 5 || tokensList[2] !== 'ILS' || tokensList[3] !== 'from') {
        return symbols;
    }

    symbols.serviceFunction = received;
    symbols.params.push(tokensList[4]);                    // debtor
    symbols.params.push(tokensList[1]);                    // sum
    symbols.params.push(getDescription(tokensList, 5));    // description

    return symbols;
};

const parseList = (tokensList, symbols) => {
    if (tokensList.length !== 3) {
        return symbols;
    }

    if (tokensList[1] === 'owe' && tokensList[2] === 'me') {
        symbols.serviceFunction = listOweMe;
    } else if (tokensList[1] === 'i' && tokensList[2] === 'owe') {
        symbols.serviceFunction = listIOwe;
    }

    return symbols;
};

module.exports = {
    parseText(text) {
        const tokensList = text.split(' ');
        let symbols = {
            serviceFunction: null,
            params: []
        };

        switch(tokensList[0]) {
            case 'owe':
                console.info('Command: owe');
                return parseOwe(tokensList, symbols);
            case 'received':
                console.info('Command: received');
                return parseReceived(tokensList, symbols);
            case 'list':
                console.info('Command: list');
                return parseList(tokensList, symbols);
            default:
                return symbols;
        }
    }
};