const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const session = require('express-session');
const Sequelize = require("sequelize");
const {db, query} = require('./db');
const customFunctions = require('./customFunctions');
const registerRoute = require('./routes/registerRoute');
const verificationRoute = require('./routes/verificationRoute');
const forgotPasswordRoute = require('./routes/forgotPasswordRoute');
const initRoute = require('./routes/initRoute');
const loginRoute = require('./routes/loginRoute');
const profileRoute = require('./routes/profileRoute');
const indexRoute = require('./routes/indexRoute');
const landMapRoute = require('./routes/landMapRoute');
const plotRoute = require('./routes/plotRoute');
const transactionsRoute = require('./routes/transactionsRoute');
const ackHistoryRoute = require('./routes/ackHistoryRoute');
const transfersRoute = require('./routes/transfersRoute');
const registerLandRoute = require('./routes/registerLandRoute');
const landHistoryRoute = require('./routes/landHistoryRoute');
const queueRoute = require('./routes/queueRoute');
const superusersRoute = require('./routes/superusersRoute');
const apisRoute = require('./routes/apis');

const SequelizeStore = require("connect-session-sequelize")(session.Store);
const sequelize = new Sequelize("database", "username", "password", {
    dialect: "sqlite",
    storage: "./session.sqlite",
});

var myStore = new SequelizeStore({
    db: sequelize,
});

const app = express();
const server = http.createServer(app);

// const wss = new WebSocket.Server({ server });

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
    store: myStore
}));
myStore.sync();

server.listen(3000, () => {
    console.log('Server running at port 3000');
});

app.use(async (req, res, next) => {
    if(req.session.user){
        const queue = await query(`SELECT * FROM queue WHERE eth_address=${db.escape(req.session.user.eth_address)}`);
        req.session.user.queueLength = queue.length;
    }
    next();
});

app.use('/register', registerRoute);
app.use('/verification', verificationRoute);
app.use('/forgot-password', forgotPasswordRoute);
app.use('/init', initRoute);
app.use('/login', loginRoute);
app.use('/profile', profileRoute);
app.use(indexRoute);
app.use('/land-map', landMapRoute);
app.use('/transactions', transactionsRoute);
app.use('/ack-history', ackHistoryRoute);
app.use('/transfers', transfersRoute);
app.use('/register-land', registerLandRoute);
app.use('/land-history', landHistoryRoute);
app.use('/plot', plotRoute);
app.use('/queue', queueRoute);
app.use('/superusers', superusersRoute);
app.use('/apis', apisRoute);

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

function dummy () {
}

dummy();

