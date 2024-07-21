const express = require('express');
const bcrypt = require('bcrypt');
const blockchain = require('../blockchain');
var { db, query } = require('../db');
const customFunctions = require('../customFunctions');

const router = express.Router();

router.get('/:id', async (req, res) => {
    if(req.session.user){
        try {
            const land0 = await query(`SELECT * FROM queue WHERE landId=${db.escape(req.params.id)} && status='Pending'`);

            if(land0.length > 0){
                return res.json('Land information is being altered. Please try again later');
            }

            const { feature, buttonEnablers, ownerAddress, buyerAddress, validations } = await customFunctions.getLand(req.params.id, req.session.user);

            const landOwner = await query(`SELECT * FROM users WHERE eth_address=${db.escape(ownerAddress)}`);
            const landBuyer = await query(`SELECT * FROM users WHERE eth_address=${db.escape(buyerAddress)}`);
            var owner = {name: "No Verified Owner"};
            var buyer = {name: "No Buyer Present"};

            if(landOwner.length != 0){
                owner = landOwner[0];
                owner.name = customFunctions.getName(owner);
            }

            if(landBuyer.length != 0){
                buyer = landBuyer[0];
                buyer.name = customFunctions.getName(buyer);
            }

            let acks = {};

            acks[buttonEnablers.isClaim ? 'Claimer' : 'Buyer'] = buyer.name != "No Buyer Present";
            acks['Land Assembly'] = validations[0] != blockchain.address0;
            acks['Land Registry'] = validations[1] != blockchain.address0;
            acks['Land Commission'] = validations[2] != blockchain.address0;

            if(feature){
                return res.render('plot', {
                    title: 'Land Details',
                    user: req.session.user,
                    feature,
                    landDetails: {},
                    buttonEnablers,
                    owner,
                    buyer,
                    acks,
                    incorrectPassword: req.query.incorrectPassword ? true : false,
                    invalidAddress: req.query.invalidAddress ? true : false
                });
            }

            else{
                return res.json("Land not found");
            }

        } catch (e) {
            console.log(e);
            return res.json("An error occurred fetching land");
        }
    }

    res.redirect('/login');
});

router.post('/claimLand', async (req, res) => {
    if(req.session.user){
        const landId = req.body.landId

        match = await bcrypt.compare(req.body.passwordConfirm, req.session.user.password);

        if(!match){
            return res.redirect(`/plot/${landId}?incorrectPassword=true`);
        }

        // return res.json("Proceed");

        const timestamp = Math.floor(Date.now() / 1000);

        await query(`INSERT INTO queue (type, landId, eth_address, status, timestamp) VALUES ('claimLand', ${db.escape(landId)}, ${db.escape(req.session.user.eth_address)}, 'Pending', '${timestamp}')`);

        res.redirect('/queue');

        console.log("Adding block...");
        console.log("___________________________________________");

        try{
            const receipt = await blockchain.claimLand({
                claimerAddress: req.session.user.eth_address,
                landId,
                notes: req.body.notes
            });

            console.log(receipt);

            await query(`DELETE FROM queue WHERE type='claimLand' AND landId=${db.escape(landId)} AND eth_address=${db.escape(req.session.user.eth_address)}`);

        } catch(e){
            console.log(e);
            await query(`UPDATE queue SET status='Failed' WHERE type='claimLand' AND landId=${db.escape(landId)} AND eth_address=${db.escape(req.session.user.eth_address)}`);
        }

        return;
    }

    res.redirect("/login");
});

router.post('/beginTransfer', async (req, res) => {
    if(req.session.user){
        const landId = req.body.landId;

        const sql = `SELECT * FROM users WHERE eth_address=${db.escape(req.body.buyerAddress)}`;
        
        const result = await query(sql);

        if(result.length == 0 || req.body.buyerAddress == req.session.user.eth_address || req.body.buyerAddress == blockchain.walletAddress){
            return res.redirect(`/plot/${landId}?invalidAddress=true`);
        }

        match = await bcrypt.compare(req.body.passwordConfirm, req.session.user.password);

        if(!match){
            return res.redirect(`/plot/${landId}?incorrectPassword=true`);
        }

        const timestamp = Math.floor(Date.now() / 1000);

        await query(`INSERT INTO queue (type, landId, eth_address, status, timestamp) VALUES ('sellerAck', ${db.escape(landId)}, ${db.escape(req.session.user.eth_address)}, 'Pending', '${timestamp}')`);

        res.redirect('/queue');

        console.log("Adding block...");
        console.log("___________________________________________");
        
        try{
            const receipt = await blockchain.sellerAck({
                sellerAddress: req.session.user.eth_address,
                buyerAddress: req.body.buyerAddress,
                landId,
                notes: req.body.notes
            });

            console.log(receipt);

            await query(`DELETE FROM queue WHERE type='sellerAck' AND landId=${db.escape(landId)} AND eth_address=${db.escape(req.session.user.eth_address)}`);

        } catch(e){
            console.log(e);
            await query(`UPDATE queue SET status='Failed' WHERE type='sellerAck' AND landId=${db.escape(landId)} AND eth_address=${db.escape(req.session.user.eth_address)}`);
        }

        return;
    }

    res.redirect("/login");
});

router.post('/acknowledgeTransfer', async (req, res) => {
    if(req.session.user){
        const landId = req.body.landId

        match = await bcrypt.compare(req.body.passwordConfirm, req.session.user.password);

        if(!match){
            return res.redirect(`/plot/${landId}?incorrectPassword=true`);
        }

        // return res.json("Proceed");

        const timestamp = Math.floor(Date.now() / 1000);

        await query(`INSERT INTO queue (type, landId, eth_address, status, timestamp) VALUES ('buyerAck', ${db.escape(landId)}, ${db.escape(req.session.user.eth_address)}, 'Pending', '${timestamp}')`);

        res.redirect('/queue');

        console.log("Adding block...");
        console.log("___________________________________________");

        try{
            const receipt = await blockchain.buyerAck({
                buyerAddress: req.session.user.eth_address,
                landId,
                notes: req.body.notes
            });

            console.log(receipt);

            await query(`DELETE FROM queue WHERE type='buyerAck' AND landId=${db.escape(landId)} AND eth_address=${db.escape(req.session.user.eth_address)}`);

        } catch(e){
            console.log(e);
            await query(`UPDATE queue SET status='Failed' WHERE type='buyerAck' AND landId=${db.escape(landId)} AND eth_address=${db.escape(req.session.user.eth_address)}`);
        }

        return;
    }

    res.redirect("/login");
});

router.post('/verifyTransfer', async (req, res) => {
    if(req.session.user && (req.session.user.role == 'admin' || req.session.user.role == 'superuser')){
        const landId = req.body.landId;
        const layerAddress = req.session.user.role == 'admin' ? req.session.user.eth_address : req.session.user.superuser_affiliation;

        match = await bcrypt.compare(req.body.passwordConfirm, req.session.user.password);

        if(!match){
            return res.redirect(`/plot/${landId}?incorrectPassword=true`);
        }

        const timestamp = Math.floor(Date.now() / 1000);

        await query(`INSERT INTO queue (type, landId, eth_address, status, timestamp) VALUES ('layerAck', ${db.escape(landId)}, ${db.escape(req.session.user.eth_address)}, 'Pending', '${timestamp}')`);

        console.log("Adding block...");
        console.log("___________________________________________");

        res.redirect('/queue');

        try{
            const receipt = await blockchain.layerAck({
                layerAddress,
                acknowledgerAddress: req.session.user.eth_address,
                landId,
                notes: req.body.notes
            });

            console.log(receipt);
            await query(`DELETE FROM queue WHERE type='layerAck' AND landId=${db.escape(landId)} AND eth_address=${db.escape(req.session.user.eth_address)}`);

        } catch(e){
            console.log(e);
            await query(`UPDATE queue SET status='Failed' WHERE type='layerAck' AND landId=${db.escape(landId)} AND eth_address=${db.escape(req.session.user.eth_address)}`);
        }

        return;
    }

    res.redirect("/login");
});

module.exports = router;
