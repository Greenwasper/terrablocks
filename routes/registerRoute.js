const express = require('express');
const bcrypt = require('bcrypt');
const customFunctions = require('../customFunctions');
const { Web3 } = require('web3');
const web3 = new Web3();
const {db, query} = require('../db');

const router = express.Router();

router.get('/', (req, res) => {

    res.render('register', {data: {phone: '+233'}, error: false});
});

router.post('/', async (req, res) => {
    req.body.phone = req.body.phone.replaceAll(' ', '');

    // console.log(req.body);

    try{
        let captchaRes = await customFunctions.post({
            'method': 'POST',
            'url': `https://www.google.com/recaptcha/api/siteverify?secret=6LcIog4qAAAAAA_7B-6-fkheg0Ww6uda-ELnZNNN&response=${req.body['g-recaptcha-response']}`,
        });

        captchaRes = JSON.parse(captchaRes);

        // console.log(captchaRes.success);

        if(!captchaRes.success){
            return res.render('register', {data: req.body, error: "Could not validate captcha"});
        }
    } catch(e){
        console.log(e);
        return res.render('register', {data: req.body, error: "Could not validate captcha"});
    }

    delete req.body['g-recaptcha-response'];
    delete req.body['confirm-password'];

    // Additional server side validation

    try{
        const allPhones = await query(`SELECT phone FROM users WHERE phone=${db.escape(req.body.phone)}`);
        const allEmails = await query(`SELECT email FROM users WHERE email=${db.escape(req.body.email)}`);

        if(allPhones.length != 0 || allEmails.length != 0){
            return res.render('register', {data: req.body, error: "Phone or email already registered"});
        }
    } catch(e){
        console.log(e);
        return res.render('register', {data: req.body, error: "An error occurred"});
    }

    const newAccount = web3.eth.accounts.create();
    const timestamp = Math.floor(Date.now() / 1000);
    req.body.password = await bcrypt.hash(req.body.password, 10);

    if(req.body.superuser_code != ''){
        
        const code = req.body.superuser_code;
        const sU = await query(`SELECT * FROM users WHERE code=${db.escape(code)}`);

        if(sU.length == 1){
            if(sU[0].eth_address == ''){

                delete req.body.superuser_code;

                let sql = `UPDATE users SET eth_address='${newAccount.address}', time_created='${timestamp}',`;
        
                Object.entries(req.body).forEach(([key, value]) => {
                    if(key != 'password'){
                        sql += `${key}=${db.escape(value).toLowerCase().trim()},`;
                    } else {
                        sql += `${key}=${db.escape(value)},`;
                    }
                });
        
                sql = sql.slice(0, -1);
        
                sql += ` WHERE code=${db.escape(code)}`;

                // console.log(sql);

                await query(sql);

                return res.redirect(`/verification?eth=${newAccount.address}`);
            }
        }
    }

    delete req.body.superuser_code;

    let sql = "INSERT INTO users (eth_address,role,time_created,";

    Object.entries(req.body).forEach(([key, value]) => {
        sql += `${key},`;
    });

    sql = sql.slice(0, -1);

    sql += `) VALUES ('${newAccount.address}', 'user', '${timestamp}',`;

    Object.entries(req.body).forEach(([key, value]) => {
        if(key != 'password'){
            sql += `${db.escape(value).toLowerCase().trim()},`;

        } else {
            sql += `${db.escape(value)},`;
        }
    });

    sql = sql.slice(0, -1);

    sql += ")";

    // console.log(sql);

    try {
        await query(sql);
        return res.redirect(`/verification?eth=${newAccount.address}`);
    } catch (e){
        return res.render('register', {data: req.body, error: "A database error occurred"});
    }
});

module.exports = router;