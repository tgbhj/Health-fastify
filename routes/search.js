const hhlusers = require('../dbs/hhlusers');
const hhlvideos = require('../dbs/hhlvideos');
const hhlchannels = require('../dbs/hhlchannels');
const doctors = require('../dbs/doctors');
const info = require('../dbs/hhlInfo');
const lines = require('../dbs/lines');
const questions = require('../dbs/questions');
const medicine = require('../dbs/medicine');
const insurance = require('../dbs/insurance');

module.exports = async (fastify, options, next) => {
    function opt(opt) {
        const object = {};
        for (let type in opt) {
            if (type === "find") {

            } else {
                switch (type) {
                    case "limit":
                        object[type] = parseInt(opt[type]);
                        break;
                    case "skip":
                        object[type] = parseInt(opt[type]);
                        break;
                    case "sort":
                        object[type] = opt[type];
                        break;
                }
            }
        }
        return object
    }

    fastify.get('/search', async (req, reply) => {
        let v = opt(req.query);
        let find = new RegExp(req.query.find, "i");
        let id = req.query.id;
        let collection = req.query.collection;
        let state = req.query.state;
        let token = req.query.token;
        if (collection === 'users') {
            if (id !== undefined) {
                await hhlusers
                    .findById({_id: id}, {regTime: 0, password: 0})
                    .then(cb => {
                        reply.send({
                            code: 20000,
                            msg: 'Success',
                            err: 'null',
                            collection: collection,
                            cb: cb
                        })
                    }, err => {
                        reply.send({
                            code: 50013,
                            msg: '用户不存在',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            } else if (state !== undefined) {
                await hhlusers
                    .find({state: state}, {regTime: 0, password: 0}, v)
                    .then(cb => {
                        reply.send({
                            code: 20000,
                            msg: 'Success',
                            err: 'null',
                            collection: collection,
                            cb: cb
                        })
                    }, err => {
                        reply.send({
                            code: 50000,
                            msg: 'UnKnow-Error',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            } else if (token !== undefined) {
                await hhlusers
                    .findOne({'token.content': token}, {regTime: 0, password: 0}, v)
                    .where({'token.endTime': {$gt: new Date()}})
                    .then(cb => {
                        if (cb !== null) {
                            reply.send({
                                code: 20000,
                                msg: 'Success',
                                err: 'null',
                                collection: collection,
                                cb: cb
                            })
                        } else {
                            reply.send({
                                code: 50006,
                                msg: 'Token过期',
                                err: 'null',
                                collection: collection,
                                cb: {}
                            })
                        }
                    }, err => {
                        reply.send({
                            code: 50000,
                            msg: 'UnKnow-Error',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            } else {
                await hhlusers
                    .find({}, {regTime: 0, password: 0}, v)
                    .or([{username: {$regex: find}}, {phone: find}])
                    .then(cb => {
                        if (cb.length === 0) {
                            reply.send({
                                code: 50014,
                                msg: '没有用户',
                                err: 'null',
                                collection: collection,
                                cb: {}
                            })
                        } else {
                            reply.send({
                                code: 20000,
                                msg: 'Success',
                                err: 'null',
                                collection: collection,
                                cb: cb
                            })
                        }
                    }, err => {
                        reply.send({
                            code: 50000,
                            msg: 'UnKnow-Error',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            }
        } else if (collection === 'videos') {
            if (id !== undefined) {
                await hhlvideos
                    .findById({_id: id})
                    .then(cb => {
                        reply.send({
                            code: 20000,
                            msg: 'Success',
                            err: 'null',
                            collection: collection,
                            cb: cb
                        })
                    }, err => {
                        reply.send({
                            code: 50015,
                            msg: '视频不存在',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            } else {
                await hhlvideos
                    .find({}, null, v)
                    .or([{name: {$regex: find}}, {title: {$regex: find}}])
                    .sort({createTime: -1})
                    .then(cb => {
                        if (cb.length === 0) {
                            reply.send({
                                code: 50016,
                                msg: '没有视频',
                                err: 'null',
                                collection: collection,
                                cb: {}
                            })
                        } else {
                            reply.send({
                                code: 20000,
                                msg: 'Success',
                                err: 'null',
                                collection: collection,
                                cb: cb
                            })
                        }
                    }, err => {
                        reply.send({
                            code: 50000,
                            msg: 'UnKnow-Error',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            }
        } else if (collection === 'channels') {
            if (id !== undefined) {
                await hhlchannels
                    .findById({_id: id})
                    .then(cb => {
                        reply.send({
                            code: 20000,
                            msg: 'Success',
                            err: 'null',
                            collection: collection,
                            cb: cb
                        })
                    }, err => {
                        reply.send({
                            code: 50017,
                            msg: '频道不存在',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            } else if (state !== undefined) {
                await hhlchannels
                    .find({state: state}, null, v)
                    .then(cb => {
                        if (cb.length === 0) {
                            reply.send({
                                code: 50018,
                                msg: '没有频道',
                                err: 'null',
                                collection: collection,
                                cb: {}
                            })
                        } else {
                            reply.send({
                                code: 20000,
                                msg: 'Success',
                                err: 'null',
                                collection: collection,
                                cb: cb
                            })
                        }
                    }, err => {
                        reply.send({
                            code: 50000,
                            msg: 'UnKnow-Error',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            } else {
                await hhlchannels
                    .find({title: {$regex: find}}, null, v)
                    .sort({createTime: -1})
                    .then(cb => {
                        if (cb.length === 0) {
                            reply.send({
                                code: 50018,
                                msg: '没有频道',
                                err: 'null',
                                collection: collection,
                                cb: {}
                            })
                        } else {
                            reply.send({
                                code: 20000,
                                msg: 'Success',
                                err: 'null',
                                collection: collection,
                                cb: cb
                            })
                        }
                    }, err => {
                        reply.send({
                            code: 50000,
                            msg: 'UnKnow-Error',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            }
        } else if (collection === 'doctors') {
            if (id !== undefined) {
                await doctors
                    .findById({_id: id})
                    .then(cb => {
                        reply.send({
                            code: 20000,
                            msg: 'Success',
                            err: 'null',
                            collection: collection,
                            cb: cb
                        })
                    }, err => {
                        reply.send({
                            code: 50019,
                            msg: '医生不存在',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            } else if (state !== undefined) {
                await doctors
                    .find({state: state}, null, v)
                    .then(cb => {
                        if (cb.length === 0) {
                            reply.send({
                                code: 50020,
                                msg: '没有医生',
                                err: 'null',
                                collection: collection,
                                cb: {}
                            })
                        } else {
                            reply.send({
                                code: 20000,
                                msg: 'Success',
                                err: 'null',
                                collection: collection,
                                cb: cb
                            })
                        }
                    }, err => {
                        reply.send({
                            code: 50000,
                            msg: 'UnKnow-Error',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            } else {
                await doctors
                    .find({name: {$regex: find}}, null, v)
                    .then(cb => {
                        if (cb.length === 0) {
                            reply.send({
                                code: 50020,
                                msg: '没有医生',
                                err: 'null',
                                collection: collection,
                                cb: {}
                            })
                        } else {
                            reply.send({
                                code: 20000,
                                msg: 'Success',
                                err: 'null',
                                collection: collection,
                                cb: cb
                            })
                        }
                    }, err => {
                        reply.send({
                            code: 50000,
                            msg: 'UnKnow-Error',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            }
        } else if (collection === 'lines') {
            if (id !== undefined) {
                await lines
                    .findById({_id: id})
                    .then(cb => {
                        reply.send({
                            code: 20000,
                            msg: 'Success',
                            err: 'null',
                            collection: collection,
                            cb: cb
                        })
                    }, err => {
                        reply.send({
                            code: 50021,
                            msg: '线路不存在',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            } else {
                await lines
                    .find({}, null, v)
                    .or([{name: {$regex: find}}, {status: {$regex: find}}])
                    .then(cb => {
                        if (cb.length === 0) {
                            reply.send({
                                code: 50022,
                                msg: '没有线路',
                                err: 'null',
                                collection: collection,
                                cb: {}
                            })
                        } else {
                            reply.send({
                                code: 20000,
                                msg: 'Success',
                                err: 'null',
                                collection: collection,
                                cb: cb
                            })
                        }
                    }, err => {
                        reply.send({
                            code: 50000,
                            msg: 'UnKnow-Error',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            }
        } else if (collection === 'info') {
            if (id !== undefined) {
                await info
                    .findById({_id: id})
                    .then(cb => {
                        reply.send({
                            code: 20000,
                            msg: 'Success',
                            err: 'null',
                            collection: collection,
                            cb: cb
                        })
                    }, err => {
                        reply.send({
                            code: 50023,
                            msg: '信息不存在',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            } else {
                await info
                    .find({title: {$regex: find}}, null, v)
                    .sort({createTime: -1})
                    .then(cb => {
                        if (cb.length === 0) {
                            reply.send({
                                code: 50024,
                                msg: '没有信息',
                                err: 'null',
                                collection: collection,
                                cb: {}
                            })
                        } else {
                            reply.send({
                                code: 20000,
                                msg: 'Success',
                                err: 'null',
                                collection: collection,
                                cb: cb
                            })
                        }
                    }, err => {
                        reply.send({
                            code: 50000,
                            msg: 'UnKnow-Error',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            }
        } else if (collection === 'questions') {
            if (id !== undefined) {
                await questions
                    .findById({_id: id})
                    .then(cb => {
                        reply.send({
                            code: 20000,
                            msg: 'Success',
                            err: 'null',
                            collection: collection,
                            cb: cb
                        })
                    }, err => {
                        reply.send({
                            code: 50025,
                            msg: '问题不存在',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            } else if (state !== undefined) {
                await questions
                    .find({state: state}, null, v)
                    .then(cb => {
                        if (cb.length === 0) {
                            reply.send({
                                code: 50026,
                                msg: '没有用户提问',
                                err: 'null',
                                collection: collection,
                                cb: {}
                            })
                        } else {
                            reply.send({
                                code: 20000,
                                msg: 'Success',
                                err: 'null',
                                collection: collection,
                                cb: cb
                            })
                        }
                    }, err => {
                        reply.send({
                            code: 50000,
                            msg: 'UnKnow-Error',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            } else {
                await questions
                    .find({title: {$regex: find}}, null, v)
                    .then(cb => {
                        if (cb.length === 0) {
                            reply.send({
                                code: 50026,
                                msg: '没有用户提问',
                                err: 'null',
                                collection: collection,
                                cb: {}
                            })
                        } else {
                            reply.send({
                                code: 20000,
                                msg: 'Success',
                                err: 'null',
                                collection: collection,
                                cb: cb
                            })
                        }
                    }, err => {
                        reply.send({
                            code: 50000,
                            msg: 'UnKnow-Error',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            }
        } else if (collection === 'medicine') {
            if (id !== undefined) {
                await medicine
                    .findById({_id: id})
                    .then(cb => {
                        reply.send({
                            code: 20000,
                            msg: 'Success',
                            err: 'null',
                            collection: collection,
                            cb: cb
                        })
                    }, err => {
                        reply.send({
                            code: 50027,
                            msg: '处方药不存在',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            } else {
                await medicine
                    .find({}, null, v)
                    .sort({approval: -1})
                    .then(cb => {
                        if (cb.length === 0) {
                            reply.send({
                                code: 50028,
                                msg: '没有处方药',
                                err: 'null',
                                collection: collection,
                                cb: {}
                            })
                        } else {
                            reply.send({
                                code: 20000,
                                msg: 'Success',
                                err: 'null',
                                collection: collection,
                                cb: cb
                            })
                        }
                    }, err => {
                        reply.send({
                            code: 50000,
                            msg: 'UnKnow-Error',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            }
        } else if (collection === 'insurance') {
            if (id !== undefined) {
                await insurance
                    .findById({_id: id}, null, v)
                    .then(cb => {
                        reply.send({
                            code: 20000,
                            msg: 'Success',
                            err: 'null',
                            collection: collection,
                            cb: cb
                        })
                    }, err => {
                        reply.send({
                            code: 50029,
                            msg: '保险产品不存在',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            } else {
                await insurance
                    .find({}, null, v)
                    .or([{company: {$regex: find}}])
                    .then(cb => {
                        if (cb.length === 0) {
                            reply.send({
                                code: 50030,
                                msg: '没有保险产品',
                                err: 'null',
                                collection: collection,
                                cb: cb
                            })
                        } else {
                            reply.send({
                                code: 20000,
                                msg: 'Success',
                                err: 'null',
                                collection: collection,
                                cb: cb
                            })
                        }
                    }, err => {
                        reply.send({
                            code: 50000,
                            msg: 'UnKnow-Error',
                            err: err,
                            collection: collection,
                            cb: {}
                        })
                    })
            }
        }
    });

    next()
};

// module.exports = routes;