const express = require('express');
const {db, query} = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
    const eth_address = req.query.eth;

    if(eth_address == ''){
        return res.redirect('/login');
    }

    const user0 = await query(`SELECT * FROM users WHERE eth_address=${db.escape(eth_address)}`);

    if(user0.length != 1){
        return res.redirect('/login');
    }

    const user = user0[0];

    // if(user.phone_verified == 'true' && user.email_verified == 'true'){
    //     return res.redirect('/login');
    // }

    return res.render('verification', {
        user,
        incorrectPhoneOtp: req.query.incorrectPhoneOtp ? true : false,
        incorrectEmailOtp: req.query.incorrectEmailOtp ? true : false,
        verificationComplete: req.query.verificationComplete ? true : false
    });
});

router.post('/verify', async (req, res) => {

    const eth_address = req.query.eth;

    if(eth_address == ''){
        return res.redirect('/login');
    }

    const user0 = await query(`SELECT * FROM users WHERE eth_address=${db.escape(eth_address)}`);

    if(user0.length != 1){
        return res.redirect('/login');
    }

    const user = user0[0];

    const timestamp = Math.floor(Date.now() / 1000);

    let incorrectString = '';

    if(user.phone_verified == 'false'){
        if(user.otp == req.body.phoneOTP && timestamp < user.otp_ttd){
            await query(`UPDATE users SET phone_verified='true', otp='', otp_ttd='' WHERE eth_address=${db.escape(eth_address)}`);
        }
    
        else{
            incorrectString += "&incorrectPhoneOtp=true";
        }
    }

    if(user.email_verified == 'false'){
        if(user.email_otp == req.body.emailOTP && timestamp < user.email_otp_ttd){
            await query(`UPDATE users SET email_verified='true', email_otp='', email_otp_ttd='' WHERE eth_address=${db.escape(eth_address)}`);
        }
    
        else{
            incorrectString += "&incorrectEmailOtp=true";
        }
    }

    if(incorrectString == ''){
        incorrectString = '&verificationComplete=true';
    }

    return res.redirect(`/verification?eth=${eth_address}${incorrectString}`);
});

module.exports = router;