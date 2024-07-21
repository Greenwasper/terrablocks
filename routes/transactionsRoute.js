const express = require('express');
const {db, query} = require('../db');
const blockchain = require('../blockchain');
const customFunctions = require('../customFunctions');
const router = express.Router();

router.get('/', async (req, res) => {
    if(req.session.user){
        try{
            const rawLands = await blockchain.getAllLands();
            var transactions = [];

            if(req.session.user.role == 'user'){
                rawLands.forEach(land => {

                    let type = '';
                    let typeColor = '';
                    let ownerAddress = '';

                    if(req.session.user.eth_address == land.owner || req.session.user.eth_address == land.currentBuyer){
                        const landCoordinates = customFunctions.getCoordinates(JSON.parse(land.feature));

                        if(land.owner == land.currentBuyer){
                            // This is a land claim

                            type = 'Claim';
                            ownerAddress = blockchain.address0;
                        }

                        else if(req.session.user.eth_address == land.owner){
                            type = 'Outgoing';
                            ownerAddress = land.owner;
                        }

                        else{
                            type = 'Incoming';
                            ownerAddress = land.owner;
                        }
    
                        transactions.push({
                            type,
                            landId: land.id,
                            landName: customFunctions.ucwords(land.name),
                            ownerAddress,
                            buyerAddress: land.buyer,
                            ownerAckTime: land.ownerAckTime,
                            buyerAckTime: land.buyerAckTime, // will work in next contract deployment
                            landCoordinates: `${landCoordinates.lat}, ${landCoordinates.lng}`,
                        });
                    }
                });
            }

            else if(req.session.user.role == 'admin' || req.session.user.role == 'superuser'){
                const layerAddresses = await blockchain.getLayerAddresses();
                let address = req.session.user.role == 'admin' ? req.session.user.eth_address : req.session.user.superuser_affiliation;
                let layer = layerAddresses.indexOf(address);

                rawLands.forEach(land => {
                    if(land.owner != blockchain.address0 && land.buyer != blockchain.address0){
                        let enableTransactionPush = false;

                        if(layer == 0){
                            enableTransactionPush = true;
                        }

                        else if(land.acks[layer-1] != blockchain.address0){
                            // checking if previous layer has acknowledged
                            enableTransactionPush = true;
                        }

                        if(land.acks[layer] == layerAddresses[layer]){
                            // Already acknowledged
                            enableTransactionPush = false;
                        }

                        if(enableTransactionPush){
                            const landCoordinates = customFunctions.getCoordinates(JSON.parse(land.feature));
                            transactions.push({
                                type: land.owner == land.currentBuyer ? "Claim" : "Transfer",
                                landId: land.id,
                                landName: customFunctions.ucwords(land.name),
                                ownerAddress: land.owner == land.currentBuyer ? blockchain.address0 : land.owner,
                                buyerAddress: land.buyer,
                                ownerAckTime: land.ownerAckTime,
                                buyerAckTime: land.buyerAckTime, // will work in next contract deployment
                                landCoordinates: `${landCoordinates.lat}, ${landCoordinates.lng}`,
                            });
                        }
                    }
                });
            }
            
            // Sort By Earliest Time

            return res.render('transactions', {title: 'Transactions', user: req.session.user, transactions});

        } catch (e) {
            return res.redirect('/');
        }
    }

    res.redirect('/login');
});

module.exports = router;