const express = require('express');
const bcrypt = require('bcrypt');
const {db, query} = require('../db');
const customFunctions = require('../customFunctions');
const router = express.Router();

router.get('/', async (req, res) => {
    if(!req.session.user){
        return res.render('forgot-password', {});
    }

    return res.redirect('/login');
});

router.get('/:code', async (req, res) => {

    const forgotPasswordKey = req.params.code;

    if(forgotPasswordKey == ''){
        return res.redirect('/login');
    }

    const user0 = await query(`SELECT * FROM users WHERE forgot_password_key=${db.escape(forgotPasswordKey)}`);

    if(user0.length != 1){
        return res.redirect('/login');
    }

    const user = user0[0];

    return res.render('reset-password', {forgotPasswordKey, name: customFunctions.getName(user), resetFinished: false});
});

router.post('/:code', async (req, res) => {
    const forgotPasswordKey = req.params.code;

    if(forgotPasswordKey == ''){
        return res.redirect('/login');
    }

    const user0 = await query(`SELECT * FROM users WHERE forgot_password_key=${db.escape(forgotPasswordKey)}`);

    if(user0.length != 1){
        return res.redirect('/login');
    }

    const user = user0[0];

    const newPassword = await bcrypt.hash(req.body.newPassword, 10);

    await query(`UPDATE users SET password=${db.escape(newPassword)}, forgot_password_key='' WHERE forgot_password_key=${db.escape(forgotPasswordKey)}`);

    return res.render('reset-password', {forgotPasswordKey: '', name: customFunctions.getName(user), resetFinished: true});
});

module.exports = router;