const express = require('express');

const router = express.Router();

router.get('/', async (req, res) => {

    if(req.session.user){
        return res.render('land-map', {
            title: 'Land Map',
            user: req.session.user
        });
    }
    
    res.redirect('/login');
});

module.exports = router;