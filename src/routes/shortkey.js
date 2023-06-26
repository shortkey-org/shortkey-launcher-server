const express = require('express');
const router = express.Router();
const { prisma } = require('../providers/prisma');
const { authenticateUser } = require('../middlewares/user');


router.post('/', authenticateUser, async (req, res) => {
    try {
        const { shortkey, url, favicon, tags } = req.body;
        const user = req.locals.user;

        const defaultFaviconUrl = 'https://f.start.me/';
        const finalFaviconUrl = favicon || defaultFaviconUrl + encodeURIComponent(url);

        const newShortkey = await prisma.shortkey.create({
            data: {
                shortkey,
                favicon: finalFaviconUrl,
                url,
                user: { connect: { id: user.id } },
                shortkeyTag: {
                    create: tags.map((tag) => ({
                        tag: {
                            connectOrCreate: {
                                where: { name: tag },
                                create: { name: tag },
                            },
                        },
                    })),
                },
            },
            include: { shortkeyTag: { include: { tag: true } } },
        });

        res.status(201).json(newShortkey);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/', authenticateUser, async (req, res) => {
    try {
        const user = req.locals.user;
        const { offset = 0, limit = 10, shortkey, tagname } = req.query;

        const shortkeys = await prisma.shortkey.findMany({
            where: {
                user: { id: user.id },
                shortkey: { contains: shortkey || '' },
                shortkeyTag: {
                    tag: { name: { contains: tagname || '' } }
                }
            },
            include: { shortkeyTag: true },
            skip: +offset,
            take: +limit,
        });

        res.json(shortkeys);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.patch('/shortkeys/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { shortkey, url, favicon, tagNames } = req.body;
        const user = req.locals.user;

        const defaultFaviconUrl = 'https://f.start.me/';
        const finalFaviconUrl = favicon || defaultFaviconUrl + encodeURIComponent(url);

        const shortkeyExists = await prisma.shortkey.findFirst({
            where: { id, userId: user.id },
        });

        if (!shortkeyExists) {
            return res.status(404).json({ message: 'Shortkey not found' });
        }

        const updatedShortkey = await prisma.shortkey.update({
            where: { id },
            data: {
                shortkey,
                favicon: finalFaviconUrl,
                url,
            },
        });

        if (tagNames && Array.isArray(tagNames) && tagNames.length) {
            const tagNamesLower = tagNames.map((tagName) => tagName.toLowerCase());
            const tags = await prisma.tag.findMany({
                where: { name: { in: tagNamesLower } },
            });
            const existingTagNamesLower = tags.map((tag) => tag.name.toLowerCase());
            const newTagNames = tagNamesLower.filter(
                (tagName) => !existingTagNamesLower.includes(tagName)
            );

            const newTags = await Promise.all(
                newTagNames.map(async (tagName) => {
                    const newTag = await prisma.tag.create({
                        data: {
                            name: tagName,
                        },
                    });
                    return newTag;
                })
            );

            const tagIds = [...tags, ...newTags].map((tag) => tag.id);

            await prisma.shortkeyTag.deleteMany({
                where: { shortkeyId: id },
            });

            await prisma.shortkey.update({
                where: { id },
                data: {
                    shortkeyTag: {
                        connect: tagIds.map((tagId) => ({ id: tagId })),
                    },
                },
            });
        }

        res.json(updatedShortkey);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});


module.exports = router;