const express = require('express');
const bcrypt = require('bcrypt');
const {db, query} = require('../db');
const customFunctions = require('../customFunctions');
const router = express.Router();

router.get('/', (req, res) => {
    if(req.session.user){
        return res.redirect('/');
    }

    return res.render('login', {error: false, data: {phone: "+233"}});
});

router.post('/', async (req, res) => {
    console.log(req.body);

    let result;

    if(req.body.adminName){
        const sql = `SELECT * FROM users WHERE party=${db.escape(req.body.adminName)} AND role='admin'`;
        result = await query(sql);
    }

    else{
        req.body.phone = req.body.phone.replaceAll(' ', '');
        const sql = `SELECT * FROM users WHERE phone=${db.escape(req.body.phone)}`;
        result = await query(sql);
    }

    console.log(result);

    let match = false;

    if(result.length == 1){

        match = await bcrypt.compare(req.body.password, result[0].password);

        if(match){
            const user = result[0];

            if(user.enabled != 'enabled'){
                return res.render('login', {error: "Your account has been disabled", data: req.body});
            }

            if(user.role == 'admin'){
                user.name = user.party.toUpperCase();
            }

            else {
                user.first_name = customFunctions.ucwords(user.first_name);
                user.last_name = customFunctions.ucwords(user.last_name);
                user.other_names = customFunctions.ucwords(user.other_names);
                user.name = customFunctions.getName(user);
            }

            req.session.user = user;
            return res.redirect('/');
        }
    }

    res.render('login', {error: "Invalid login credentials", data: req.body});
    
});

module.exports = router;