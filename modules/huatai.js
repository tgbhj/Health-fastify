const {number} = require('../modules/random');
const {departmentCode, insuranceCode, uuid, bizCode1, departmentName, insuranceName} = require('../config/config');
const moment = require('moment');
const crypto = require('crypto');
const policies = require('../dbs/policies');
const insurance = require('../dbs/insurance');
const axios = require('axios');
const qs = require('querystring');
const fs = require('fs');

//订单号生成
function createChannelOrderNo() {
    let channelOrderNo;
    let date = new Date();
    let fullYear = date.getFullYear();
    let nowMonth = date.getMonth() + 1;
    let strDate = date.getDate();

    // 月份处理
    if (nowMonth >= 1 && nowMonth <= 9) {
        nowMonth = '0' + nowMonth
    }

    // 日期处理
    if (strDate >= 1 && strDate <= 9) {
        strDate = '0' + strDate
    }

    let today = fullYear + nowMonth + strDate;
    channelOrderNo = today + number(true, 6, 6); // 6位随机数

    return channelOrderNo
}

//投保序列号生成
function createOrderId() {
    let orderId;
    let date = new Date();
    let fullYear = date.getFullYear();
    let nowMonth = date.getMonth() + 1;
    let strDate = date.getDate();

    // 月份处理
    if (nowMonth >= 1 && nowMonth <= 9) {
        nowMonth = '0' + nowMonth
    }

    // 日期处理
    if (strDate >= 1 && strDate <= 9) {
        strDate = '0' + strDate
    }

    let today = fullYear + nowMonth + strDate;
    orderId = today + number(true, 9, 9); // 9位随机数

    return orderId
}

let premium = '0.01';
let plan;
let effectivTime;
let terminalTime;
let birthday;

async function inquire(req, reply) {
    let data = {
        departmentID: departmentCode,
        proCode: insuranceCode,
        plan: req.body.plan,
        quantity: "1",
        effectivTime: moment().add(1, 'days').format('YYYY-MM-DD') + ' 00:00:00',
        terminalTime: moment().add(1, 'days').add(1, 'years').format('YYYY-MM-DD') + ' 23:59:59',
        shopArea: "0",
        insuredObject: [{
            recognizeeBirthday: req.body.birthday
        }]
    };
    plan = data.plan;
    effectivTime = data.effectivTime;
    terminalTime = data.terminalTime;
    birthday = data.insuredObject[0].recognizeeBirthday;
    let params = JSON.stringify(data);
    let key = departmentCode + uuid;
    let sign = crypto.createHash('md5').update(params + key, 'utf8').digest('hex');
    let url = 'http://shop.ehuatai.com:7006/eservice/ebiz/client/insure.action?action=inquire&channelID=' + departmentCode + '&sign=' + sign;

    async function reqInqure() {
        try {
            return await axios({method: 'post', url: url, data: data})
        } catch (error) {
            reply.send({
                code: 50000,
                msg: error,
                cb: {}
            })
        }
    }

    await reqInqure().then(res => {
        if (res.data.success === 'false') {
            reply.send({
                code: 50010,
                msg: res.data.errMsg,
                cb: {}
            })
        } else {
            // premium = res.data.content.totalPremium;
            reply.send({
                code: 20000,
                msg: 'Success',
                cb: {premium: premium}
            })
        }
    }).catch(error => {
        reply.send({
            code: 50000,
            msg: error,
            cb: {}
        })
    });
}

async function insure(req, reply) {
    let data = {
        bizCode: bizCode1,
        departmentCode: departmentCode,
        departmentName: departmentName,
        orderId: createOrderId(),
        channelOrderNo: createChannelOrderNo(),
        isDefinedSafe: "0",
        isHolder: "1",
        isSingleInsured: "1",
        insuranceObject: {
            insuranceCode: insuranceCode,
            insuranceName: insuranceName,
            premium: premium,
            currency: "CNY",
            effectivTime: effectivTime,
            terminalTime: terminalTime,
            copy: "1",
            plan: plan
        },
        appntObject: {
            appliacntName: req.body.name,
            appliacntBirthday: birthday,
            appliacntGender: req.body.sex,
            appliacntIDType: "01",
            appliacntNumber: req.body.IdCard,
            appliacntTelNumber: req.body.phone
        },
        insuredObject: [],
        productDisffObject: null
    };
    let params = JSON.stringify(data);
    let key = departmentCode + uuid;
    let sign = crypto.createHash('md5').update(params + key, 'utf8').digest('hex');
    let url = 'http://shop.ehuatai.com:7006/eservice/ebiz/client/insure.action?action=insure&channelID=' + departmentCode + '&sign=' + sign;

    async function reqInsure() {
        try {
            return await axios({method: 'post', url: url, data: data})
        } catch (error) {
            reply.send({
                code: 50000,
                msg: error,
                cb: {}
            })
        }
    }

    await reqInsure().then(res => {
        if (res.data.responseCode === '0') {
            reply.send({
                code: 50011,
                msg: res.data.responseInfo,
                cb: {}
            })
        } else {
            reply.send({
                code: 20000,
                msg: 'Success',
                cb: {}
            });
            new policies({
                user: req.body.userId,
                orderId: res.data.orderId,
                channelOrderNo: data.channelOrderNo,
                premium: premium,
                plan: plan,
                amount: res.data.policyList[0].amount,
                effectivTime: data.insuranceObject.effectivTime,
                terminalTime: data.insuranceObject.terminalTime,
                policyNO: res.data.policyList[0].policyNO,
                policyAddress: res.data.policyList[0].policyAddress,
                recognize: res.data.policyList[0].recognize,
                recognizeeTelNumber: res.data.policyList[0].recognizeeTelNumber
            }).save();
        }
    }).catch(error => {
        reply.send({
            code: 50000,
            msg: error,
            cb: {}
        })
    });
}

async function payment(req, reply) {
    let paymentType = '01';
    let userAgent = req.headers['user-agent'];
    let type1 = /Windows/;
    let type2 = /Macintosh/;
    let type3 = /Android/;
    let type4 = /iPhone/;
    if (type1.test(userAgent) === true) {
        paymentType = '01'
    } else if (type2.test(userAgent) === true) {
        paymentType = '01'
    } else if (type3.test(userAgent) === true) {
        paymentType = '08'
    } else if (type4.test(userAgent) === true) {
        paymentType = '08'
    }

    let insur = await policies.findOne({user: req.query.userId}).sort({_id: -1}).exec();

    let title = '';
    if (plan === 'A') {
        title = '华泰保险百万医疗(有社保款)'
    } else {
        title = '华泰保险百万医疗(无社保款)'
    }

    let data = {
        orderId: insur.orderId,
        channelID: departmentCode,
        tradeName: title,
        tradeType: '01',
        currencyType: '01',
        customerMobile: insur.recognizeeTelNumber,
        money: insur.premium,
        businessSystem: '01',
        businessDocumentCode: insur.orderId,
        callbackType: '01',
        callbackAddress: 'https://seeihealth.com/api/paymentCallBack',
        pageCallbackAddress: 'https://seeihealth.com/pay',
        remark: title,
        tradeTime: moment().format('YYYY-MM-DD HH:mm:ss'),
        paymentType: paymentType
    };

    let str = data.businessSystem + data.businessDocumentCode + data.money + data.tradeTime + data.tradeType + data.customerMobile;

    let publicKey = fs.readFileSync(process.cwd() + '/server/cert/huatai/publicKey.pem');
    data.digitalSignature = crypto.publicEncrypt({
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
    }, Buffer.from(str)).toString('base64');

    let url = 'http://shop.ehuatai.com:7006/eservice/ebiz/client/htpay.action?action=requestPayment';

    async function reqPayment() {
        try {
            return await axios({
                method: 'post',
                url: url,
                data: qs.stringify(data),
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            })
        } catch (error) {
            reply.send({
                code: 50000,
                msg: error,
                cb: {}
            })
        }
    }

    await reqPayment().then(res => {
        if (res.data.success === 'false') {
            reply.send({
                code: 50012,
                msg: res.data.errMsg,
                cb: {}
            });
        } else {
            reply.send(res.data);
        }
    }).catch(error => {
        reply.send({
            code: 50000,
            msg: error,
            cb: {}
        })
    })
}

function payInfo(req, reply) {
    let info = JSON.parse(req.body.data);
    if (info.responseDTO.responseCode === '1') {
        reply.send({
            code: 20000,
            msg: info.responseDTO.responseInfo,
            cb: {}
        });
        policies.findOneAndUpdate({orderId: info.orderNo}, {$set: {state: 1}}).exec()
    } else {
        reply.send({
            code: 50013,
            msg: info.responseDTO.responseInfo,
            cb: {}
        });
    }
}

async function getInsure(req, reply) {
    await insurance
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

module.exports = {inquire, insure, payment, payInfo, getInsure};