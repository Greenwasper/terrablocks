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
                registeredLandHistory = await blockchain.getPastEvents("LandRegistered");
                claimedLandHistory = await blockchain.getPastEvents("LandClaimed");
                sellerAckHistory = await blockchain.getPastEvents("SellerAcknowledged");
                buyerAckHistory = await blockchain.getPastEvents("BuyerAcknowledged");
                layerAckHistory = await blockchain.getPastEvents("LayerAcknowledged");
                break;
            case 'superuser':
                registeredLandHistory = await blockchain.getPastEvents("LandRegistered", {registerer: req.session.user.eth_address});
                layerAckHistory = await blockchain.getPastEvents("LayerAcknowledged", {layerAddress: req.session.user.superuser_affiliation});
                break;
        }

        const allAckHistory = [...registeredLandHistory, ...claimedLandHistory,  ...sellerAckHistory, ...buyerAckHistory, ...layerAckHistory];

        let ackHistory = [];

        allAckHistory.forEach(ack => {

            let type = '';
            let executedBy = '';

            switch(ack.event){
                case 'LandClaimed':
                    type = 'Land Claimed';
                    executedBy = ack.returnValues.claimerAddress;
                    break;
                case 'SellerAcknowledged':
                    type = "Transfer Begun";
                    executedBy = ack.returnValues.ownerAddress;
                    break;
                case 'BuyerAcknowledged':
                    type = "Transfer Acknowledged";
                    executedBy = ack.returnValues.buyerAddress;
                    break;
                case 'LandRegistered':
                    type = "Register of Land";
                    executedBy = ack.returnValues.registerer;
                    break;
                case 'LayerAcknowledged':
                type = "Validation";
                executedBy = ack.returnValues.acknowledgerAddress;
                break;
            }

            ackHistory.push({
                type,
                executedBy,
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

        return res.render('ack-history', {title: 'All Actions', user: req.session.user, ackHistory});
    }

    res.redirect('/login');
});

module.exports = router;