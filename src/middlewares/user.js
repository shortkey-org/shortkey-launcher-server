const authenticateUser = async (req, res, next) => {
    try {
        const user = await prisma.user.findFirst();
        req.locals.user = user;
        next();
    } catch (err) {
        console.log(err);
        res.status(401).json({ message: 'Unauthorized' });
    }
};

module.exports = {
    authenticateUser
}