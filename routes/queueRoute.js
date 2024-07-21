const express = require('express');
const {db, query} = require('../db');
const customFunctions = require('../customFunctions');
// const blockchain = require('../blockchain');
const router = express.Router();


router.get('/', async (req, res) => {
    if(req.session.user){

        // const contract = await blockchain.getContract();

        console.log(req.session.user.eth_address)

        let queue = await query(`SELECT * FROM queue WHERE eth_address=${db.escape(req.session.user.eth_address)}`);
        let areFails = false;

        queue.sort(customFunctions.dynamicSortDesc('timestamp'));

        queue.forEach(q => {
            if(q.status == 'Failed'){
                areFails = true;
            }
            switch(q.type){
                case 'claimLand':
                    q.type = "Land Claim";
                    break;
                case 'sellerAck':
                    q.type = "Begin Transfer";
                    break;
                case 'buyerAck':
                    q.type = "Acknowledge Transfer";
                    break;
                case 'layerAck':
                    q.type = "Validation";
                    break;
                default:
                    q.type = "n/a";
            }
        });

        return res.render('queue', {title: 'Blockchain Queue', user: req.session.user, queue, areFails});
    }

    res.redirect('/login');
});

router.get('/clear', async (req, res) => {
    await query(`DELETE FROM queue WHERE eth_address=${db.escape(req.session.user.eth_address)} AND status='Failed'`);
    res.redirect('/queue');
});

module.exports = router;