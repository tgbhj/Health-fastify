const {number} = require('../modules/random');
const findPwd = require('../dbs/findPwd');
const {debug} = require('../config/config');
const axios = require('axios');
const qs = require('querystring');

async function getVCode(req, reply) {
    let vcode = number(true, 6, 6);
    if (debug === true) {
        await new findPwd({phone: req.body.phone, vcode: vcode})
            .save((err, cb) => {
                if (err == null) {
                    reply.send({
                        code: 20000,
                        msg: 'Success',
                        err: 'null',
                        vcode: cb.vcode
                    })
                } else {
                    reply.send({
                        code: 50000,
                        msg: 'UnKnow-Error',
                        err: err,
                        cb: {}
                    })
                }
            })
    } else {
        await stp(req, reply, vcode)
    }
}

async function stp(req, reply, vcode) {
    await new findPwd({phone: req.body.phone, vcode: vcode}).save();

    async function code() {
        try {
            return await axios({
                method: 'post',
                url: 'http://seei.tv/sendVCode',
                data: qs.stringify({phone: req.body.phone, vcode: vcode}),
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            })
        } catch (error) {
            reply.send({
                code: 50000,
                msg: 'UnKnow-Error',
                err: error,
                cb: {}
            })
        }
    }

    await code().then(res => {
        reply.send({
            code: 20000,
            msg: 'Success',
            err: 'null',
            cb: JSON.parse(res.data)
        })
    }).catch(error => {
        reply.send({
            code: 50000,
            msg: 'UnKnow-Error',
            err: error,
            cb: {}
        })
    })
}

module.exports = getVCode;