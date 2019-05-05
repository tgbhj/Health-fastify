const doctors = require('../dbs/doctors');

async function getDoctors(req, reply) {
    await doctors
        .find()
        .then(cb => {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'null',
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

async function getDoc(req, reply) {
    await doctors
        .findById({_id: req.headers.id})
        .then(cb => {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'null',
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

module.exports = {getDoctors, getDoc};