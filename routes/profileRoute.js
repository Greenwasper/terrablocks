const express = require('express');
const bcrypt = require('bcrypt');
const {db, query} = require('../db');
const customFunctions = require('../customFunctions');
const multer  = require('multer');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, './public/assets/profile-img');
    },
    filename: (req, file, cb) => {
      cb(null, `${req.session.user.eth_address}.jpg`);
    }
});
const upload = multer({ storage });
const router = express.Router();

router.get('/', (req, res) => {
    if(req.session.user){
        return res.render('profile', {title: 'Profile', user: req.session.user});
    }

    return res.redirect('/login');
});

router.post('/upload', upload.single('profile-img'), (req, res) => {
    if(req.session.user){
        

        return res.redirect('/profile');
    }

    return res.redirect('/login');
});

module.exports = router;