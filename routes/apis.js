const express = require('express');
const blockchain = require('../blockchain');
const axios = require('axios');
const customFunctions = require('../customFunctions');
const {db, query} = require('../db');

const router = express.Router();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get('/getLands', async (req, res) => {

    if(req.session.user){

        const rawLands = await blockchain.getAllLands();

        const lands = [];

        for(let i=0;i<rawLands.length;i++){
            let land = rawLands[i];

            let feature = JSON.parse(land.feature);

            const centerCoords = customFunctions.getCoordinates(feature);
            const {plotColor, strokeColor} = await customFunctions.getLandColors(req.session.user, land);

            feature.properties.id = land.id;
            feature.properties.name = land.name;
            feature.properties.lat = centerCoords.lat;
            feature.properties.lng = centerCoords.lng;
            feature.properties.plotColor = plotColor;
            feature.properties.strokeColor = strokeColor;

            lands.push(feature);
        }

        const featureCollection = {
            type: 'FeatureCollection',
            features: lands
        };

        return res.json(featureCollection);
    }

    res.json('Unauthorized request');
});

router.get('/get-land-stats', async (req, res) => {

    if(req.session.user){
        const lands = await blockchain.getAllLands();


        if(req.session.user.role == 'user'){
            let transactionsCount = 0;

            const landClaimHistory = await blockchain.getPastEvents("LandClaimed", {claimerAddress: req.session.user.eth_address});
            const buyerAckHistory = await blockchain.getPastEvents("BuyerAcknowledged", {buyerAddress: req.session.user.eth_address});
            const sellerAckHistory = await blockchain.getPastEvents("SellerAcknowledged", {ownerAddress: req.session.user.eth_address});

            lands.forEach(land => {
                if(req.session.user.eth_address == land.owner || req.session.user.eth_address == land.currentBuyer){
                    transactionsCount++;
                }
            });

            return res.json({
                landsCount: lands.length,
                pendingTransactionsCount: transactionsCount,
                totalLandClaims: landClaimHistory.length,
                totalBuyerAcks: buyerAckHistory.length,
                totalSellerAcks: sellerAckHistory.length
            });
        }

        else if(req.session.user.role == 'admin' || req.session.user.role == 'superuser'){
            let transactionsCount = 0;

            const layerAckHistory = await blockchain.getPastEvents("LayerAcknowledged", {acknowledgerAddress: req.session.user.eth_address});
            const registeredLandHistory = await blockchain.getPastEvents("LandRegistered", {registerer: req.session.user.eth_address});

            const layerAddresses = await blockchain.getLayerAddresses();
            let address = req.session.user.role == 'admin' ? req.session.user.eth_address : req.session.user.superuser_affiliation;
            let layer = layerAddresses.indexOf(address);

            lands.forEach(land => {
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
                        transactionsCount++;
                    }
                }
            });

            return res.json({
                landsCount: lands.length,
                pendingVerificationsCount: transactionsCount,
                totalVerifications: layerAckHistory.length,
                landsRegistered: registeredLandHistory.length
            });
        }
    }

    res.json('Unauthorized request');
});

router.get('/getBlockchainLands', async (req, res) => {
    const rawLands = await blockchain.getAllLands();

    res.json(rawLands);
});

router.get('/getLand/:id', async (req, res) => {
    if(req.session.user){
        // const userAddress = req.session.user.eth_address;

        const rawLands = await blockchain.getAllLands();

        let feature;

        for(let i=0;i<rawLands.length;i++){
            if(rawLands[i].id == req.params.id){
                feature = JSON.parse(rawLands[i].feature);

                const centerCoords = customFunctions.getCoordinates(feature);
                const {plotColor, strokeColor} = await customFunctions.getLandColors(req.session.user, rawLands[i]);

                feature.properties.id = rawLands[i].id;
                feature.properties.name = rawLands[i].name;
                feature.properties.lat = centerCoords.lat;
                feature.properties.lng = centerCoords.lng;
                feature.properties.plotColor = plotColor;
                feature.properties.strokeColor = strokeColor;

                break;
            }
        }

        if(feature){
            return res.json(feature);
        }

        else{
            return res.json("Land not found");
        }
    }

    res.json('Unauthorized request');
});

router.post('/get-land-details', async (req, res) => {

    if(req.session.user){
        const landDetails = await axios({
            method: 'post',
            url: 'https://ghanapostgps.sperixlabs.org/get-address',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data:{
                'lat': req.body.lat,
                'long': req.body.lng
            }
        });

        return res.json(landDetails.data);
    }

    res.json('Unauthorized request');
    
});

router.post('/get-owner-details', async (req, res) => {

    if(req.session.user){

        const sql = `SELECT phone, role, party, first_name, last_name, other_names, email, ghana_card, superuser_affiliation, time_created, enabled FROM users WHERE eth_address=${db.escape(req.body.eth_address)}`;

        try{
            const landOwner = await query(sql);

            if(landOwner.length == 0){
                return res.json({name: "User not found"});
            }

            let owner = landOwner[0];

            if(owner.role == 'admin'){
                owner.name = owner.party.toUpperCase();
            } else {
                owner.name = customFunctions.getName(owner);
            }

            if(req.body.obscure){
                owner = customFunctions.mask(owner);
            }

            // console.log("______________________________________________________");
            // console.log(owner);

            return res.json(owner);
        } catch (e) {
            console.log(e);
            return res.status(500).json(e);
        }
    }

    res.json('Unauthorized request');
    
});

router.post('/superuser-control', async (req, res) => {
    if(req.session.user && req.session.user.role == 'admin'){
        try{
            const Superuser = await query(`SELECT code, enabled FROM users WHERE code=${db.escape(req.body.code)}`);

            const superuser = Superuser[0];

            if(superuser.enabled == "enabled"){
                await query(`UPDATE users SET enabled='disabled' WHERE code=${db.escape(req.body.code)}`);
                return res.json(`Disabled ${req.body.code}`);
            } else {
                await query(`UPDATE users SET enabled='enabled' WHERE code=${db.escape(req.body.code)}`);
                return res.json(`Enabled ${req.body.code}`);
            }
        } catch(e){
            console.log(e);
            return res.status(500).json(e);
        }
    }

    res.json('Unauthorized request');
});

router.post('/send-code', async (req, res) => {

    const eth_address = req.body.eth_address;

    if(eth_address == ''){
        return res.status(400).json('Invalid eth address');
    }

    const user0 = await query(`SELECT * FROM users WHERE eth_address=${db.escape(eth_address)}`);

    if(user0.length != 1){
        return res.status(400).json('No user found');
    }
    const user = user0[0];

    if(req.body.for == 'phone'){

        const phone = user.phone;

        console.log(phone);

        if(user.phone_verified == 'true'){
            return res.status(400).json("Phone Number already verified")
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const ttd = Math.floor(Date.now() / 1000) + 3000;

        try{
            const response = await axios({
                method: 'post',
                url: 'https://sms.arkesel.com/api/v2/sms/send',     
                headers: {
                    'api-key': 'OjVaRldWbWlIa3dWMzEwVjY='
                },
                data:{
                    "sender": "CSCDC",
                    "message": `Your otp is ${otp}`,
                    "recipients": [phone]
                }
            });

            console.log(response.data);

            await query(`UPDATE users SET otp=${db.escape(otp)}, otp_ttd=${db.escape(ttd)} WHERE eth_address=${db.escape(eth_address)}`);
            return res.json("Phone OTP sent");
        } catch(e){
            console.log(e);
            return res.status(500).json(`Database error: ${e}`);
        }
    }

    else if(req.body.for == 'email'){
        const email = user.email;

        console.log(email);

        if(user.email_verified == 'true'){
            return res.status(400).json("Email address already verified")
        }

        const email_otp = Math.floor(100000 + Math.random() * 900000).toString();
        const email_ttd = Math.floor(Date.now() / 1000) + 3000;

        try{
            const response = await axios({
                method: 'post',
                url: 'https://cscdc.online/apis/send-verification-email.php',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data:{
                    email,
                    "name": customFunctions.getName(user),
                    "code": email_otp
                }
            });
    
            console.log(response.data);
    
            await query(`UPDATE users SET email_otp=${db.escape(email_otp)}, email_otp_ttd=${db.escape(email_ttd)} WHERE eth_address=${db.escape(eth_address)}`);
            return res.json("Email code sent");
        } catch(e){
            return res.status(500).json(`Database error: ${e}`);
        }
    }


    return res.json("Invalid request");
});

router.post('/forgot-password', async (req, res) => {
    const email = req.body.email;

    if(email == ''){
        return res.status(400).json('Invalid email');
    }

    const user0 = await query(`SELECT * FROM users WHERE email=${db.escape(email)}`);

    if(user0.length != 1){
        return res.status(400).json('No user found');
    }
    const user = user0[0];

    let forgotPasswordKey = `${crypto.randomUUID()}${crypto.randomUUID()}${crypto.randomUUID()}`;
    forgotPasswordKey = forgotPasswordKey.replaceAll('-', '');

    try{
        const response = await axios({
            method: 'post',
            url: 'https://cscdc.online/apis/send-forgot-password-email.php',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data:{
                email,
                "name": customFunctions.getName(user),
                "forgotPasswordKey": forgotPasswordKey
            }
        });

        console.log(response.data);

        await query(`UPDATE users SET forgot_password_key=${db.escape(forgotPasswordKey)} WHERE email=${db.escape(email)}`);
        return res.json("Reset email sent");
    } catch(e){
        console.log(e);
        return res.status(500).json(`An error has occurred`);
    }
});

router.post('/check-queue-status', async (req, res) => {
    let queue = await query(`SELECT * FROM queue WHERE eth_address=${db.escape(req.body.eth_address)}`);
    return res.json(queue);
});

module.exports = router;