const express = require('express');
const customFunctions = require('../customFunctions');
const {db, query} = require('../db');
const blockchain = require('../blockchain');
const router = express.Router();

router.get('/', async (req, res) => {

    if(req.session.user){
        const user = req.session.user;

        const result = await query(`SELECT * FROM users WHERE eth_address=${db.escape(user.eth_address)}`);
        let refreshedUser = result[0];

        const queue = await query(`SELECT * FROM queue WHERE eth_address=${db.escape(user.eth_address)}`);
        refreshedUser.queueLength = queue.length;

        if(refreshedUser.role == 'admin'){
            refreshedUser.name = refreshedUser.party.toUpperCase();
        }

        else {
            refreshedUser.first_name = customFunctions.ucwords(refreshedUser.first_name);
            refreshedUser.last_name = customFunctions.ucwords(refreshedUser.last_name);
            refreshedUser.other_names = customFunctions.ucwords(refreshedUser.other_names);
            refreshedUser.name = customFunctions.getName(user);
        }

        req.session.user = refreshedUser;

        switch(req.session.user.role){
            case 'admin':
                return res.render('admin', {user: refreshedUser, title: 'Dashboard'});
            
            case 'superuser':
                return res.render('admin', {user: refreshedUser, title: 'Dashboard'});

            default:
                return res.render('dashboard', {
                    title: 'Dashboard',
                    user: refreshedUser,
                    verification: {
                        Phone: refreshedUser.phone_verified == 'true',
                        Email: refreshedUser.email_verified == 'true',
                        ID: false
                    }
                });
        }
    }

    return res.redirect('/login');
});

module.exports = router;
