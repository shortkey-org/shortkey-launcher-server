require('dotenv').config() // add this line
const express = require('express')
const session = require('express-session');
const debug = require('debug')('app:server')
const path = require('path');
const pug = require('pug');
const {initPrisma} = require('./providers/prisma');
const bodyParser = require('body-parser');
const ShortkeyRouter = require('./routes/shortkey');
const UserRouter = require('./routes/user');

const app = express()

// Parse JSON bodies
app.use(bodyParser.json());

// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: process.env['SESS_SECRET'] || "",
    resave: false,
    saveUninitialized: false
}))


app.set('views', 'src/views')
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/sk', ShortkeyRouter);
app.use('/user', UserRouter);

app.listen(process.env.PORT || 5000, () => { // update this line
    debug(`Server listening on port ${process.env.PORT || 5000} in ${process.env.NODE_ENV} mode`)
    initPrisma();
})
