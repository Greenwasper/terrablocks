const express = require('express');
const {db, query} = require('../db');
const customFunctions = require('../customFunctions');
const router = express.Router();

router.get('/', async (req, res) => {
    if(req.session.user && req.session.user.role == 'admin'){

        const sql = `SELECT * FROM users WHERE role='superuser' AND superuser_affiliation=${db.escape(req.session.user.eth_address)}`;
        let superusers = await query(sql);

        superusers.forEach(superuser => {
            superuser.enabled = superuser.enabled == 'enabled';

            if(superuser.eth_address != ''){
                superuser.name = customFunctions.getName(superuser);
                superuser.status = true;
            }

            else{
                superuser.name = '';
                superuser.status = false;
            }
        });

        return res.render('superusers', {title: 'Manage Superusers', user: req.session.user, superusers});
    }

    res.redirect('/login');
});

router.post('/create', async (req, res) => {
    if(req.session.user && req.session.user.role == 'admin'){
        const timestamp = Math.floor(Date.now() / 1000);
        const code = crypto.randomUUID().toUpperCase().replaceAll('-', '');

        const sql = `INSERT INTO users (role, code, superuser_created, superuser_affiliation, party) VALUES ('superuser', ${db.escape(code)}, ${db.escape(timestamp)}, ${db.escape(req.session.user.eth_address)}, ${db.escape(req.session.user.party)})`;
        await query(sql);
        
        return res.redirect('/superusers');
    }

    res.redirect('/login');
});

router.post('/delete', async (req, res) => {
    if(req.session.user && req.session.user.role == 'admin'){

        if(req.body.code != ''){
            const sql = `DELETE FROM users WHERE code=${db.escape(req.body.code)}`;
            await query(sql);
        }

        return res.redirect('/superusers');
    }

    res.redirect('/login');
});

module.exports = router;