const express = require('express');
const router = express.Router();
const { prisma } = require('../providers/prisma');
const { authenticateUser } = require('../middlewares/user');

const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

/** @todo randomise filename */

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function (req, file, cb) {
        const extension = file.originalname.split('.').pop();
        cb(null, `${uuidv4()}.${extension}`);
    },
});

const fileFilter = function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
        const error = new Error('Unsupported file type');
        error.code = 'UNSUPPORTED_FILE_TYPE';
        return cb(error, false);
    }
    cb(null, true);
};

const upload = multer({ storage, fileFilter });

router.get('/', async (req, res) => {
    return res.render('auth', {
        clientAuthRedirectURL: process.env["CLIENT_AUTH_REDIRECT_URL"]
    });
});


// Create or Update account.
router.put('/', async (req, res) => {
    console.log(req.body)
    let assignAccountId = req.body['account_id'];
    let accessToken = req.body['access_token'];
    let user = await prisma.user.findFirst({
        where: {
            assignId: assignAccountId
        }
    });
    if(user) {
        await prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                accessToken: accessToken
            }
        });
    }
    else
    {
        /** FETCH ASSIGN USER AND GET PICTURE ETC ALSO VERIFY IT EXISTS */
        user = await prisma.user.create({
            data: {
                assignId: assignAccountId,
                accessToken: accessToken,
                picture: "https://f.start.me/us.gov"
            }
        });
    }

    return res.status(200).json({});
});

router.patch('/users/settings', authenticateUser, upload.single('backgroundPicture'), async (req, res) => {
    try {
        const user = req.locals.user;

        const {
            instantLauncherEnabled,
            collectShortkeyEnabled,
            minimalisticEnabled,
            whiteElementsEnabled,
        } = req.body;

        let backgroundPicture;
        if (req.file) {
            backgroundPicture = `${process.env.BASE_URL}/${req.file.path}`;
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                instantLauncherEnabled,
                collectShortkeyEnabled,
                minimalisticEnabled,
                whiteElementsEnabled,
                backgroundPicture,
            },
        });

        res.json(updatedUser);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;