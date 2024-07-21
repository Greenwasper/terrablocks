const express = require('express');
const {db, query} = require('../db');
const blockchain = require('../blockchain');
const customFunctions = require('../customFunctions');
const router = express.Router();

router.get('/:landId', async (req, res) => {
    if(req.session.user){

        const landHistory = await blockchain.getPastEvents("LandTransferred", {landId: req.params.landId});
        let transfers = [];

        landHistory.forEach(transfer => {
            transfers.push({
                type: transfer.returnValues.from == blockchain.address0 ? 'Claim' : 'Transfer',
                transactionHash: transfer.transactionHash,
                timeAcknowledged: transfer.returnValues.timestamp,
                landName: customFunctions.ucwords(transfer.returnValues.land.name),
                from: transfer.returnValues.from,
                to: transfer.returnValues.to,
                coordinates: customFunctions.getCoordinates(JSON.parse(transfer.returnValues.land.feature))
            });
        });

        // Sort transfers by timestamp

        transfers.sort(customFunctions.dynamicSortDesc('timeAcknowledged'));

        return res.render('transfers', {title: 'Land History', user: req.session.user, transfers});
    }

    res.redirect('/login');
});

module.exports = router;