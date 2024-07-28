const express = require('express');
const {db, query} = require('../db');
const blockchain = require('../blockchain');
const customFunctions = require('../customFunctions');
const router = express.Router();

router.get('/', async (req, res) => {
    if(req.session.user){

        let fromTransfers = [];
        let toTransfers = [];

        if(req.session.user.role == 'user'){
            fromTransfers = await blockchain.getPastEvents("LandTransferred", {from: req.session.user.eth_address});
            toTransfers = await blockchain.getPastEvents("LandTransferred", {to: req.session.user.eth_address});
        }

        else if(req.session.user.role == 'admin' || req.session.user.role == 'superuser'){
            fromTransfers = await blockchain.getPastEvents("LandTransferred");
        }

        const allTransfers = [...fromTransfers, ...toTransfers];

        let transfers = [];

        allTransfers.forEach(transfer => {

            let type = '';
            let typeColor = '';

            if(req.session.user.role == 'user'){
                type = req.session.user.eth_address == transfer.returnValues.from ? 'Outgoing' : 'Incoming';
                typeColor = req.session.user.eth_address == transfer.returnValues.from ? '#f87171' : '#4ade80';
            }

            else if(req.session.user.role == 'admin' || req.session.user.role == 'superuser'){
                type = "Transfer";
            }

            transfers.push({
                type,
                typeColor,
                transactionHash: transfer.transactionHash,
                timeAcknowledged: transfer.returnValues.timestamp,
                landName: customFunctions.ucwords(transfer.returnValues.land.name),
                landId: transfer.returnValues.land.id,
                from: transfer.returnValues.from,
                to: transfer.returnValues.to,
                coordinates: customFunctions.getCoordinates(JSON.parse(transfer.returnValues.land.feature))
            });
        });

        // Sort transfers by timestamp

        transfers.sort(customFunctions.dynamicSortDesc('timeAcknowledged'));

        return res.render('transfers', {title: 'Transfers', user: req.session.user, transfers});
    }

    res.redirect('/login');
});

module.exports = router;