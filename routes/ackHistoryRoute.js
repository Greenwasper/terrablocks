const express = require('express');
const {db, query} = require('../db');
const blockchain = require('../blockchain');
const customFunctions = require('../customFunctions');
const router = express.Router();

router.get('/', async (req, res) => {
    if(req.session.user){

        let registeredLandHistory = [];
        let claimedLandHistory = [];
        let sellerAckHistory = [];
        let buyerAckHistory = [];
        let layerAckHistory = [];

        switch(req.session.user.role){
            case 'user':
                claimedLandHistory = await blockchain.getPastEvents("LandClaimed", {claimerAddress: req.session.user.eth_address});
                sellerAckHistory = await blockchain.getPastEvents("SellerAcknowledged", {ownerAddress: req.session.user.eth_address});
                buyerAckHistory = await blockchain.getPastEvents("BuyerAcknowledged", {buyerAddress: req.session.user.eth_address});
                break;
            case 'admin':
                registeredLandHistory = await blockchain.getPastEvents("LandRegistered", {layerAddress: req.session.user.eth_address});
                layerAckHistory = await blockchain.getPastEvents("LayerAcknowledged", {layerAddress: req.session.user.eth_address});
                break;
            case 'superuser':
                registeredLandHistory = await blockchain.getPastEvents("LandRegistered", {registerer: req.session.user.eth_address});
                layerAckHistory = await blockchain.getPastEvents("LayerAcknowledged", {acknowledgerAddress: req.session.user.eth_address});
                break;
        }

        const allAckHistory = [...registeredLandHistory, ...claimedLandHistory,  ...sellerAckHistory, ...buyerAckHistory, ...layerAckHistory];

        let ackHistory = [];

        const ackColorObj = {
            'Land Claimed': '#60a5fa', // blue
            'Transfer Begun': '#ffcd56', // yellow
            'Transfer Acknowledged': '#4ade80', // green 
            'Register of Land': '#60a5fa', // blue
            'Validation': '#4ade80' // green
        };

        allAckHistory.forEach(ack => {

            let type = '';
            let executedBy = '';
            let ackColor = 'black';

            switch(ack.event){
                case 'LandClaimed':
                    type = 'Land Claimed';
                    executedBy = ack.returnValues.claimerAddress;
                    ackColor = ackColorObj[type];
                    break;
                case 'SellerAcknowledged':
                    type = "Transfer Begun";
                    executedBy = ack.returnValues.ownerAddress;
                    ackColor = ackColorObj[type];
                    break;
                case 'BuyerAcknowledged':
                    type = "Transfer Acknowledged";
                    executedBy = ack.returnValues.buyerAddress;
                    ackColor = ackColorObj[type];
                    break;
                case 'LandRegistered':
                    type = "Register of Land";
                    executedBy = ack.returnValues.registerer;
                    ackColor = ackColorObj[type];
                    break;
                case 'LayerAcknowledged':
                    type = "Validation";
                    executedBy = ack.returnValues.acknowledgerAddress;
                    ackColor = ackColorObj[type];
                    break;
            }

            if(req.session.user.role == 'user'){
                delete ackColorObj['Register of Land'];
                delete ackColorObj['Validation'];
            } else {
                delete ackColorObj['Land Claimed'];
                delete ackColorObj['Transfer Begun'];
                delete ackColorObj['Transfer Acknowledged'];
            }

            ackHistory.push({
                type,
                executedBy,
                ackColor,
                transactionHash: ack.transactionHash,
                timeAcknowledged: ack.returnValues.timestamp,
                landId: ack.returnValues.land.id,
                landName: customFunctions.ucwords(ack.returnValues.land.name),
                coordinates: customFunctions.getCoordinates(JSON.parse(ack.returnValues.land.feature))
            });
        });

        // Sort ackHistory by timestamp

        ackHistory.sort(customFunctions.dynamicSortDesc('timeAcknowledged'));

        // console.log(ackHistory);

        return res.render('ack-history', {title: 'Actions', user: req.session.user, ackHistory, ackColorObj});
    }

    res.redirect('/login');
});

module.exports = router;