const express = require('express');
const bcrypt = require('bcrypt');
const { Web3 } = require('web3');
const web3 = new Web3();
const blockchain = require('../blockchain');
const {db, query} = require('../db');
const customFunctions = require('../customFunctions');
const router = express.Router();

router.get('/', async (req, res) => {
    const layerAddresses = [];

    for(let i=0;i<=2;i++){
        let account = web3.eth.accounts.create();
        layerAddresses.push(account.address);
    }

    console.log(layerAddresses);

    try{
        const receipt = await blockchain.initLayers({
            layers: layerAddresses
        });

        console.log(receipt);
    } catch(e){
        console.log(e);
        // await query(`DELETE FROM users WHERE role='admin'`);
        return res.render('login', {error: "An error occurred initializing the system", data: req.body});
    }

    for(let i=0;i<layerAddresses.length;i++){
        let party = '';
        switch(i){
            case 0: party = 'assembly'; break;
            case 1: party = 'registry'; break;
            case 2: party = 'commission'; break;
        }

        let password = await bcrypt.hash(party, 10);

        await query(`INSERT INTO users (eth_address, password, role, party) VALUES (${db.escape(layerAddresses[i])}, ${db.escape(password)}, 'admin', ${db.escape(party)})`);
    }

    return res.redirect('/login');
});

module.exports = router;