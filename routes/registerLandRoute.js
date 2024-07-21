const express = require('express');
const bcrypt = require('bcrypt');
const {db, query} = require('../db');
const blockchain = require('../blockchain');
const router = express.Router();

router.get('/', (req, res) => {
    if(req.session.user && (req.session.user.role == "admin" || req.session.user.role == "superuser")){
        return res.render('register-land', {title: 'Register Land', registerError: false, errorMessage: "", user: req.session.user, previous: false});
    }

    return res.redirect('/login');
});

router.post('/register', async (req, res) => {
    if(req.session.user){
        if(req.session.user.role == "admin" || req.session.user.role == "superuser"){

            const previousCoords = JSON.parse(req.body.feature).geometry.coordinates[0];

            match = await bcrypt.compare(req.body.passwordConfirm, req.session.user.password);

            if(!match){
                return res.render('register-land', {title: 'Register Land', registerError: true, errorMessage: "Invalid Password", user: req.session.user, previous: {previousCoords, previousTitle: req.body.land_name, previousAddress: req.body.eth_address}});
            }

            const timestamp = Math.floor(Date.now() / 1000);
            const uid = crypto.randomUUID();

            // await query(`INSERT INTO queue (type, landId, eth_address, status, timestamp) VALUES ('insertLand', ${db.escape(uid)}, ${db.escape(req.session.user.eth_address)}, 'Pending', '${timestamp}')`);

            console.log("____________________________________________");
            console.log('Adding block...');

            // return res.json('Proceed');

            try{
                const result = await blockchain.registerLand({
                    ownerAddress: blockchain.address0,
                    landId: uid,
                    name: req.body.land_name,
                    feature: req.body.feature,
                    registerer: req.session.user.eth_address
                });
    
                console.log(result);

                return res.redirect('/');

                // await query(`DELETE FROM queue WHERE type='insertLand' AND landId=${db.escape(uid)} AND eth_address=${db.escape(req.session.user.eth_address)}`);

            } catch (e) {
                console.log(e);
                // await query(`UPDATE queue SET status='Failed' WHERE type='insertLand' AND landId=${db.escape(uid)} AND eth_address=${db.escape(req.session.user.eth_address)}`);

                return res.render('register-land', {title: 'Register Land', registerError: true, errorMessage: "Blockchain error", user: req.session.user, previous: {previousCoords, previousTitle: req.body.land_name}});
            }
        }

        return res.json("Unauthorized request");
    }

    return res.redirect('/login');
});

module.exports = router;