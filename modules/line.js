const lines = require('../dbs/lines');

async function getLines(req, reply) {
    await lines
        .findOne({name: 'health'})
        .then(cb => {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'Null',
                cb: cb
            })
        }, err => {
            reply.send({
                code: 50000,
                msg: 'UnKnow-Error',
                err: err,
                cb: {}
            })
        })
}

module.exports = {getLines};