const turf = require('@turf/turf');
var request = require('request');
const blockchain = require('./blockchain');

const green = '#1fd655';
const red = '#e51c23';
const yellow = '#ca8a04';
const blue = 'blue';

function ucwords(input) {
    const words = input.split(' ');

    const capitalizedWords = words.map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    });

    return capitalizedWords.join(' ');
}

function formatNumber(number) {

    let formattedNumber = parseFloat(number).toFixed(0);

    formattedNumber = parseFloat(formattedNumber).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0});


    return formattedNumber;
}

function post(options) {
    return new Promise(function (resolve, reject) {
        request(options, function (error, res, body) {
            if (!error && res.statusCode === 200) {
                resolve(body);
            } else {
                console.log(error);
                reject(error);
            }
        });
    });
}

function getName(user) {
    return `${user.last_name.toUpperCase()} ${ucwords(user.first_name)} ${ucwords(user.other_names)}`.trim();
}

function mask(user) {

    let phone = user.phone;
    let email = user.email;

    // Extract the first 4 characters and the last 2 characters
    const firstPart = phone.slice(0, 4);
    const lastPart = phone.slice(-2);

    // Create the masked middle part
    const middlePart = '*'.repeat(phone.length - 6);

    // Combine the parts
    user.phone = `${firstPart}${middlePart}${lastPart}`;

    // Split the email into username and domain parts
    const [username, domain] = email.split('@');

    // Validate the email structure
    if (!username || !domain) {
        return user;
    }

    // Create the masked username
    const maskedUsername = username[0] + '*'.repeat(username.length - 1);

    // Combine the masked username with the domain
    user.email = `${maskedUsername}@${domain}`;

    return user;
}

function dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        /* next line works with strings and numbers, 
         * and you may want to customize it to your needs
         */
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}

function dynamicSortDesc(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        /* next line works with strings and numbers, 
         * and you may want to customize it to your needs
         */
        var result = (a[property] < b[property]) ? 1 : (a[property] > b[property]) ? -1 : 0;
        return result * sortOrder;
    }
}

function getCoordinates (feature) {

    // Get the coordinates of the polygon
    const coordinates = feature.geometry.coordinates;

    // Calculate the bounding box of the polygon
    const bbox = turf.bbox(turf.polygon(coordinates));

    // Calculate the center of the bounding box
    const center = turf.center(turf.bboxPolygon(bbox));

    const lat = center.geometry.coordinates[1];
    const lng = center.geometry.coordinates[0];

    return { lat, lng };
}

async function getLandColors (user, land) {

    let plotColor = "black";
    let strokeColor = "black";
    let statusText = "";
    let statusColor = "black";
    let buttonEnablers = {
        isClaim: false,
        claimLand: false,
        beginTransfer: false,
        acknowledgeTransfer: false,
        showOwnerDetails: false,
        verifyTransfer: false,
        showValidationStatus: false,
        ackComplete: false,
        notes: ''
    };

    if(user.role == 'user'){
        if(land.currentOwner == blockchain.address0){
            // Unclaimed land
    
            plotColor = red;
            strokeColor = red;
            statusColor = red;
            statusText = "Unclaimed land";

            buttonEnablers.claimLand = true;

            if(land.currentBuyer == user.eth_address){
                // If land has been claimed by you 

                plotColor = yellow;
                strokeColor = blue;
                statusColor = yellow;
                statusText = "Awaiting verification";

                buttonEnablers.showOwnerDetails = true;
                buttonEnablers.isClaim = true;
                buttonEnablers.claimLand = false;
                buttonEnablers.showValidationStatus = true;
                buttonEnablers.ackComplete = true;
            }

            else if(land.currentBuyer != blockchain.address0){
                // If land has been claimed by someone and is awaiting verification

                statusText = "Land in the process of being claimed";

                buttonEnablers.claimLand = false;
            }
        }
    
        else if(land.currentOwner == user.eth_address && land.currentBuyer == blockchain.address0){
            // If you own a land and is not awaiting verification
    
            plotColor = blue;
            strokeColor = blue;
            statusColor = blue;
            statusText = "Owned By You";
    
            buttonEnablers.beginTransfer = true;
            buttonEnablers.showOwnerDetails = true;
        }
    
        else if(land.currentOwner == user.eth_address && land.currentBuyer != blockchain.address0){
            // If you own a land and is awaiting verification, i.e about to be sold to someone
    
            plotColor = yellow;
            strokeColor = red;
            statusColor = yellow;
            statusText = "Land almost sold, Awaiting Verification";

            buttonEnablers.showOwnerDetails = true;
            buttonEnablers.showValidationStatus = true;
            buttonEnablers.ackComplete = true;
    
            // if(land.buyer != ""){
                // What seller will see if Acknowledged By Buyer
            // }
        }
    
        else if(land.currentOwner != user.eth_address && land.currentBuyer != blockchain.address0){
             // If you do not own a land but a buyer is present, i.e about to be bought by you
    
            plotColor = yellow;
            strokeColor = blue;
            statusColor = yellow;
            statusText = "Land almost bought, Awaiting Verification";
    
            buttonEnablers.acknowledgeTransfer = true;
            buttonEnablers.showOwnerDetails = true;
            buttonEnablers.showValidationStatus = true;
            buttonEnablers.ackComplete = true;
            buttonEnablers.notes = land.notes[4];
    
            if(land.buyer == user.eth_address){
                // What buyer will see if Acknowledged By Buyer
    
                buttonEnablers.acknowledgeTransfer = false;
                statusText = "Awaiting Government Verification";
            }
    
            if(land.currentBuyer != user.eth_address){
                // If you're not the buyer
    
                plotColor = red;
                strokeColor = red;
                statusColor = red;
                statusText = "No-go Area";
    
                buttonEnablers.acknowledgeTransfer = false;
                buttonEnablers.showOwnerDetails = false;
                buttonEnablers.showValidationStatus = false;
            }
        }
    
        else if(land.currentOwner != user.eth_address && land.currentBuyer == blockchain.address0){
            // If you do not own a land and a buyer is not present
    
            plotColor = green;
            strokeColor = green;
            statusColor = green;
            statusText = "Verified and Owned By Individual";
        }
    }

    else if(user.role == 'admin' || user.role == 'superuser'){

        let address = user.role == 'admin' ? user.eth_address : user.superuser_affiliation;

        const layerAddresses = await blockchain.getLayerAddresses();

        let layer = layerAddresses.indexOf(address);

        let enableLayerVerification = false;

        if(layer == 0){
            enableLayerVerification = true;
            buttonEnablers.notes = land.notes[3];
        }

        else if(land.acks[layer-1] != blockchain.address0){
            // checking if previous layer has acknowledged

            enableLayerVerification = true;
            buttonEnablers.notes = land.notes[layer-1];
        }

        buttonEnablers.showOwnerDetails = true;

        if(land.currentOwner == blockchain.address0){
            // Unclaimed Land
    
            plotColor = red;
            strokeColor = red;
            statusColor = red;
            statusText = "Unclaimed land";

            if(land.currentBuyer != blockchain.address0){
                // If land has been claimed 

                if(enableLayerVerification){
                    plotColor = yellow;
                    strokeColor = yellow;
                    statusColor = yellow;
                    statusText = "Awaiting verification";

                    buttonEnablers.showValidationStatus = true;
                    buttonEnablers.isClaim = true;

                    if(land.acks[layer] == layerAddresses[layer]){
                        // Already acknowledged
                        buttonEnablers.verifyTransfer = false;
                        buttonEnablers.ackComplete = true;
                    }

                    else{
                        buttonEnablers.verifyTransfer = true;
                    }
                }
            }
        }

        else if(land.buyer != blockchain.address0 && land.owner != blockchain.address0){
            // If land is awaiting verification

            plotColor = green;
            strokeColor = green;
            statusColor = green;
            statusText = "Owned And Verified";

            if(enableLayerVerification){
                plotColor = yellow;
                strokeColor = yellow;
                statusColor = yellow;
                statusText = "Awaiting Government Verification";

                buttonEnablers.showValidationStatus = true;

                if(land.acks[layer] == layerAddresses[layer]){
                    // Already acknowledged
                    buttonEnablers.verifyTransfer = false;
                    buttonEnablers.ackComplete = true;
                }

                else{
                    buttonEnablers.verifyTransfer = true;
                }
            }
        }

        else {
            // If land is owned and verified

            plotColor = green;
            strokeColor = green;
            statusColor = green;
            statusText = "Owned And Verified";
        }
    }

    return {plotColor, strokeColor, buttonEnablers, statusText, statusColor};
}

async function getLand (landId, user){

    const rawLands = await blockchain.getAllLands();

    let feature;
    let buttonEnablers;
    let ownerAddress;
    let buyerAddress;
    let validations;

    for(let i=0;i<rawLands.length;i++){
        if(rawLands[i].id == landId){
            feature = JSON.parse(rawLands[i].feature);

            ownerAddress = rawLands[i].currentOwner;
            buyerAddress = rawLands[i].currentBuyer;
            validations = rawLands[i].acks;

            const centerCoords = getCoordinates(feature);
            const {plotColor, strokeColor, buttonEnablers: tempButtonEnablers, statusColor, statusText} = await getLandColors(user, rawLands[i]);

            buttonEnablers = tempButtonEnablers;

            feature.properties.id = rawLands[i].id;
            feature.properties.name = ucwords(rawLands[i].name);
            feature.properties.lat = centerCoords.lat;
            feature.properties.lng = centerCoords.lng;
            feature.properties.plotColor = plotColor;
            feature.properties.strokeColor = strokeColor;
            feature.properties.statusColor = statusColor;
            feature.properties.statusText = statusText;
            feature.properties.area = formatNumber(turf.area(feature));

            break;
        }
    }

    if(feature){
        return {feature, buttonEnablers, ownerAddress, buyerAddress, validations};
    }

    else{
        return {feature: false, buttonEnablers: {}, ownerAddress: false, buyerAddress: false, validations: {}};
    }
}

module.exports = {
    ucwords,
    post,
    getName,
    mask,
    dynamicSort,
    dynamicSortDesc,
    formatNumber,
    getCoordinates,
    getLandColors,
    getLand
};