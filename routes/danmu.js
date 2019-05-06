const {getDanmu, saveDanmu} = require('../modules/danmu');

module.exports = async (fastify, options, next) => {
    let funPromise = time => {
        return new Promise((resolve, reject) => {
            //Pending 进行中
            setTimeout(() => {
                resolve() //从 pending 变为 resolved
            }, time)
        })
    };

    fastify
        .get('/danmu/v3', async (req, reply) => {
            getDanmu(req, reply);
            await funPromise(500);
        })
        .post('/danmu/v3', async (req, reply) => {
            saveDanmu(req, reply);
            await funPromise(500);
        });

    next()
};