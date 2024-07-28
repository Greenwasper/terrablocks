const { Web3 } = require('web3');
require('dotenv').config();
const validator = require('web3-validator');
const {db, query} = require('./db');
const fs = require('fs').promises;
const web3 = new Web3('https://sepolia.infura.io/v3/4c0766d141a74dba918fe2962abe5499');

const walletAddress = "0xa06d3284548892cE80C3046D09E5AF22985A5e61";
const contractAddress = '0x05b14241Ce91673fe7A995cE09A1b093236bD3BC';
// const privateKey = '0xe0d4468f2812c37b0d4ea384078e7384eb2f445ef0cae284bdf36314639a5c80';
const privateKey = process.env.PRIVATE_KEY;
const address0 = '0x0000000000000000000000000000000000000000';

function isAddress (address) {
    return validator.isAddress(address)
}

async function getContract (){
    const abi = await fs.readFile('abi.json', 'utf8');
    return new web3.eth.Contract(JSON.parse(abi), contractAddress);
}

async function initLayers (valuesObject){
    const contract = await getContract();

    const data = contract.methods.initLayers(valuesObject.layers).encodeABI();

    const gasEstimate = await contract.methods.initLayers(valuesObject.layers).estimateGas({ from: walletAddress });
    const gasPrice = await web3.eth.getGasPrice();

    const tx = {
        from: walletAddress,
        to: contractAddress,
        gasLimit: gasEstimate,
        gasPrice: gasPrice,
        data: data
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    return receipt;
}

async function getLayerAddresses () {
    const admins = await query(`SELECT * FROM users WHERE role='admin'`);

    let addressses = [];

    admins.forEach(admin => {
        addressses.push(admin.eth_address);
    });

    return addressses;
}

async function getAllLands () {
    const contract = await getContract();
    const value = await contract.methods.getAllLands().call();

    value.forEach(land => {
        for(let i=0;i<=12;i++){
            delete land[i.toString()];
        }

        land.timestamp = parseInt(land.timestamp);
        land.ownerAckTime = parseInt(land.ownerAckTime);
        land.buyerAckTime = parseInt(land.buyerAckTime);

        for(let i=0;i<land.ackTimes.length;i++){
            land.ackTimes[i] = parseInt(land.ackTimes[i]);
        }
    });

    return value;
}

async function claimLand (valuesObject){
    const contract = await getContract();

    const data = contract.methods.claimLand(valuesObject.claimerAddress, valuesObject.landId, valuesObject.notes).encodeABI();

    const gasEstimate = await contract.methods.claimLand(valuesObject.claimerAddress, valuesObject.landId, valuesObject.notes).estimateGas({ from: walletAddress });
    const gasPrice = await web3.eth.getGasPrice();

    const tx = {
        from: walletAddress,
        to: contractAddress,
        gasLimit: gasEstimate,
        gasPrice: gasPrice,
        data: data
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    return receipt;
}

async function registerLand (valuesObject){
    const contract = await getContract();

    // if(valuesObject.ownerAddress == ''){
    //     valuesObject.ownerAddress = address0;
    // }

    const data = contract.methods.registerLand(valuesObject.ownerAddress, valuesObject.landId, valuesObject.name, valuesObject.feature, valuesObject.layerAddress, valuesObject.registerer).encodeABI();

    const gasEstimate = await contract.methods.registerLand(valuesObject.ownerAddress, valuesObject.landId, valuesObject.name, valuesObject.feature, valuesObject.layerAddress, valuesObject.registerer).estimateGas({ from: walletAddress });
    const gasPrice = await web3.eth.getGasPrice();

    const tx = {
        from: walletAddress,
        to: contractAddress,
        gasLimit: gasEstimate,
        gasPrice: gasPrice,
        data: data
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    return receipt;
}

async function sellerAck (valuesObject){
    const contract = await getContract();

    const data = contract.methods.sellerAck(valuesObject.sellerAddress, valuesObject.buyerAddress, valuesObject.landId, valuesObject.notes).encodeABI();

    const gasEstimate = await contract.methods.sellerAck(valuesObject.sellerAddress, valuesObject.buyerAddress, valuesObject.landId, valuesObject.notes).estimateGas({ from: walletAddress });
    const gasPrice = await web3.eth.getGasPrice();

    const tx = {
        from: walletAddress,
        to: contractAddress,
        gasLimit: gasEstimate,
        gasPrice: gasPrice,
        data: data
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    return receipt;
}

async function buyerAck (valuesObject){
    const contract = await getContract();

    const data = contract.methods.buyerAck(valuesObject.buyerAddress, valuesObject.landId, valuesObject.notes).encodeABI();

    const gasEstimate = await contract.methods.buyerAck(valuesObject.buyerAddress, valuesObject.landId, valuesObject.notes).estimateGas({ from: walletAddress });
    const gasPrice = await web3.eth.getGasPrice();

    const tx = {
        from: walletAddress,
        to: contractAddress,
        gasLimit: gasEstimate,
        gasPrice: gasPrice,
        data: data
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    return receipt;
}

async function layerAck (valuesObject){
    const contract = await getContract();

    const data = contract.methods.layerAck(valuesObject.layerAddress, valuesObject.acknowledgerAddress, valuesObject.landId, valuesObject.notes).encodeABI();

    const gasEstimate = await contract.methods.layerAck(valuesObject.layerAddress, valuesObject.acknowledgerAddress, valuesObject.landId, valuesObject.notes).estimateGas({ from: walletAddress });
    const gasPrice = await web3.eth.getGasPrice();

    const tx = {
        from: walletAddress,
        to: contractAddress,
        gasLimit: gasEstimate,
        gasPrice: gasPrice,
        data: data
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    return receipt;
}

async function getPastEvents (eventName, filter = {}) {
    const contract = await getContract();

    const result = await contract.getPastEvents(
        eventName,
        {
            fromBlock: 0,
            toBlock: 'latest',
            filter
        }
    );

    return result;
}

// async function listenForEvent (eventName, filter = {}){
//     const contract = await getContract();
//     contract.events[eventName]
// }

module.exports = {
    address0,
    walletAddress,
    isAddress,
    getContract,
    getLayerAddresses,
    initLayers,
    getAllLands,
    claimLand,
    registerLand,
    sellerAck,
    buyerAck,
    layerAck,
    getPastEvents
};
