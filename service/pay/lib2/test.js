/**
 * 运行alipay支付的sdk, 无法运行, 尝试改写
 * */
// import AlipaySdk from 'alipay-sdk';

// let AlipaySdk = require('alipay-sdk')
// let AlipaySdkConfig = {}
// const alipaySdk = new AlipaySdk(AlipaySdkConfig);

// import不可以直接使用, 需要配置
// https://blog.csdn.net/hsl0530hsl/article/details/78695922(可以参考)

let camelcaseKeys = require('camelcase-keys');
let config = {'app-id': '123456', 'private-key': '123456', 'alipay-public-key': '123456'};

config = camelcaseKeys(config, {deep: true});
// console.log('[camelcaseKeys config]', config)
// [camelcaseKeys config]
// { appId: '123456',
//   privateKey: '123456',
//   alipayPublicKey: '123456' }

/**
 * 判断对象类型
 * */
// let data = '123'
// console.log('[Object]', Object.prototype.toString.call(data)) // [object String]
// console.log('[Array]', Array.prototype.toString.call(data)) // [object String]

/**
 * string>>>buffer
 * buffer>>>string
 * */
let iconv = require('iconv-lite');
let str = '123';
let charset = 'utf-8';
// console.log('[iconv-lite]', iconv.encode(str, charset))

/**
 * '?' or '&'
 * 第一次拼接时, requestUrl没有?, 拼接?, http://seei.tv/index.html?name=dcj123
 * 第二次拼接时, requestUrl有?, 拼接&, http://seei.tv/index.html?name=dcj123&name=dcj123
 * */
let requestUrl1 = 'http://seei.tv/index.html';
let key = 'name';
let val = encodeURIComponent('dcj123'); // dcj123
// let val = encodeURIComponent('你好') // %E4%BD%A0%E5%A5%BD
// let val = encodeURIComponent('https://seei.tv/index.html') // https%3A%2F%2Fseei.tv%2Findex.html
// console.log('[encodeURIComponent val]', val)
let requestUrl2 = 'http://seei.tv/index.html?name=dcj123';
// console.log(`${requestUrl1}${requestUrl1.includes('?') ? '&' : '?'}${key}=${val}`)
// console.log(`${requestUrl2}${requestUrl2.includes('?') ? '&' : '?'}${key}=${val}`)

/**
 * require('is')插件测试
 * */
const is = require('is');
let noFn = '123';

function getName() {
    console.log('[require("is)]')
}

// console.log(is.fn(noFn)) // false
// console.log(is.fn(getName)) // true

/**
 * 测试%s
 * */
let url = 'https://seei.tv';
let method = 'alipay.trade.page.pay';
// console.log('[AlipaySdk]start exec, url: %s, method: %s, params: %s', url, method, JSON.stringify({name: 'dcj123'}))
// [AlipaySdk]start exec, url: https://seei.tv, method: alipay.trade.page.pay, params: {"name":"dcj123"}

// console.log('[AlipaySdk]start exec, url: %s, method: %s, params: %s', url, method, {name: 'dcj123'})
// [AlipaySdk]start exec, url: https://seei.tv, method: alipay.trade.page.pay, params: [object Object]

/**
 * 测试lastIndex
 * 1.js.trim(): 去除'开头前'和'结尾后'的空格
 * 2.
 * */
// let signStr = '{"app_id":"123456","method":"alipay.trade.page.pay","sign":"~!@#$%^&*()HFDGFDHGF","sign_type":"RSA2","timeStamp":"123123123123"}'
let signStr = JSON.stringify({
    "alipay_trade_precreate_response": {
        "code": "10000",
        "msg": "Success",
        "out_trade_no": "6823789339978248",
        "qr_code": "https://qr.alipay.com/bavh4wjlxf12tper3a"
    },
    "sign": "ERITJKEIJKJHKKKKKKKHJEREEEEEEEEEEE"
});
// let signStr = '{"sign":"ERITJKEIJKJHKKKKKKKHJEREEEEEEEEEEE"}'
// let resSort = Object.keys(JSON.parse(signStr)).sort()
// console.log(resSort) // [ 'app_id', 'method', 'sign', 'sign_type', 'timeStamp' ]

// let index1 = signStr.indexOf('sign')
// let index2 = signStr.lastIndexOf('sign')
// signStr中的是"sign"，而不是'sign', 关系算不算上引号
// let index3 = signStr.indexOf('"sign"')
// let index4 = signStr.lastIndexOf('"sign"')
// let index5 = signStr.indexOf("sign")
// let index6 = signStr.lastIndexOf("sign")
// console.log('[index1]', index1) // 2
// console.log('[index2]', index2) // 2
// console.log('[index1]', index3) // 1
// console.log('[index2]', index4) // 1
// console.log('[index1]', index5) // 2
// console.log('[index2]', index6) // 2

let responseKey = 'alipay_trade_precreate_response';
let startIndex = signStr.indexOf(`${responseKey}"`);
// console.log('[signStr]', signStr, responseKey.length) // 31
// console.log('[startIndex]', startIndex) // 2
let validateStr = signStr.substr(startIndex + responseKey.length + 1);
// console.log('[validateStr]', validateStr)
/**
 * 从{"alipay_trade_precreate_response": {
 * 0>>>{
 * 1>>>"
 * 2>>>alipay_trade_precreate_response
 */

/**
 * 正则表达式测试
 * /.../g: 只要有匹配， 就会替换
 * /^.../g: 必须是某个开头, 比如: 下面必须是hello， 才会匹配
 * 两者之间的区别
 * */
let regStr = 'abc hello world';
let regStr2 = 'hello world';
let re = /hel/g;
let re2 = /^hel/g;
// console.log(regStr.replace(re, '123')) // abc 123lo world
// console.log(regStr.replace(re2, '123')) // abc hello world
// console.log(regStr2.replace(re2, '123')) // 123lo world


let regStr3 = '{"code":"10000"},';
let re3 = /}/g;
let reg4 = /}/g;


// let regPay = ':{"code":"10000"},'
// let regP1 = /^[^{]*{/g
// let regP2 = /^[^{]*\{/g
// console.log(regPay.replace(regP1, '123'))
// console.log(regPay.replace(regP2, '123'))

// console.log('hello'.replace(/^he$/g, '#'))

/**
 * 测试is-json插件
 * isJSON(str*, [passObjects=bool])
 * *with passObjects = true can pass a JSON object in str, default to false
 * */
let isJSON = require('is-json');
// console.log(isJSON('http://www.com/notify')) // false
// console.log(isJSON({
//   outTradeNo: 'out_trade_no',
//   productCode: 'FAST_INSTANT_TRADE_PAY',
//   totalAmount: '0.01',
//   subject: '商品',
//   body: '商品详情',
// })) // false

// 判断是不是对象是不是JSON对象,
// console.log(isJSON({
//   outTradeNo: 'out_trade_no',
//   productCode: 'FAST_INSTANT_TRADE_PAY',
//   totalAmount: '0.01',
//   subject: '商品',
//   body: '商品详情',
// }, true)) // true

// console.log(isJSON('{"outTradeNo": "out_trade_no","productCode": "FAST_INSTANT_TRADE_PAY","totalAmount": "0.01","subject": "商品","body": "商品详情"}'))

/**
 * 测试form.js.addField()
 * 2和3的结果相同
 * */
const AliPayFormData = require('./form');
const formData = new AliPayFormData();
// 1.
formData.addField('notifyUrl', 'http://www.com/notify');

// 2.
formData.addField('bizContent', {
    outTradeNo: 'out_trade_no',
    productCode: 'FAST_INSTANT_TRADE_PAY',
    totalAmount: '0.01',
    subject: '商品',
    body: '商品详情',
});

// 3.
formData.addField('bizContent', '{"outTradeNo": "out_trade_no","productCode": "FAST_INSTANT_TRADE_PAY","totalAmount": "0.01","subject": "商品","body": "商品详情"}');
// console.log(formData.getFields())

// [ { name: 'notifyUrl', value: 'http://www.com/notify' },
// { name: 'bizContent',
//   value:
//     { outTradeNo: 'out_trade_no',
//       productCode: 'FAST_INSTANT_TRADE_PAY',
//       totalAmount: '0.01',
//       subject: '商品',
//       body: '商品详情' } },
// { name: 'bizContent',
//   value:
//     { outTradeNo: 'out_trade_no',
//       productCode: 'FAST_INSTANT_TRADE_PAY',
//       totalAmount: '0.01',
//       subject: '商品',
//       body: '商品详情' } } ]

/**
 * 测试form.js.addFile()
 * */
const path = require('path');
formData.addFile('imageContent', '图片.jpg', path.join(__dirname, './test.jpg'));
// console.log(formData.getFiles())
// [ { fieldName: 'imageContent',
// name: '图片.jpg',
// path: '/home/dcj/桌面/20180214备份/project/vue-webpack-config/server/service/pay/lib2/test.jpg' } ]

/**
 * 测试form表单的Object.keys().map()
 * */
let formArray = [
    '<input type="text" name="myName1" value="myValue1"/>',
    '<input type="text" name="myName2" value="myValue2"/>',
    '<input type ="text" name="myName3" value="myValue3"/>',
];

// console.log(formArray.join(''))

/**
 * 1.测试某个正则表达式
 * */
let regStr1_1 = '"value"';
let regStr1_2 = "value";
let regStr1_3 = 'value';
let re1 = /"/g;

// console.log('[测试某个正则表达式]', regStr1_1.replace(re1, '&quot;')) // &quot;value&quot;
// console.log('[测试某个正则表达式]', regStr1_2.replace(re1, '&quot;')) // value
// console.log('[测试某个正则表达式]', regStr1_3.replace(re1, '&quot;')) // value

/**
 * 测试: log4js 日志记录类
 * */
// let log4js = require('log4js')
// let logger = log4js.getLogger()
// logger.level = 'debug'
// logger.debug('Some debug messages')
// logger.info('Some debug messages')
// logger.error('Some debug messages')

/**
 * 测试异步返回数据
 * */
let fs = require('fs');
let alipayNotifyData = {
    gmt_create: '2018-08-08 10:33:41',
    charset: 'utf-8',
    gmt_payment: '2018-08-08 10:33:45',
    notify_time: '2018-08-08 10:33:46',
    subject: '商品',
    sign: 'Jl3lMMuECPEJlouYM1EMjNJkQL0Tt3APr7Wh4iYf+hUrwa7CQKzrNbeGxacXh/xwG/b1X1RTpQECOUvyUeHg+U70o1Cf9yuMN0jhkL2gF+L+GsAn7J2IwyERiPjvChOqDcmoLBbegPBGeSx0ln5UbSfyX3mDamI2C2pesH3Q7j6+pmWvKqkwLk/5TcG/NT8HxhdQZ4CBhBAVAtQJyzbMtSBBd1Nj9kfmi5yv+KDOL4t9Z+L/7T3TFE3PK+sayePoPwo7BMSrVQl/Cuv6ppKqNdKZQSaCahV/rpHNsR9eD5radeWWMAaxOq+Z/2VMLwvmAPMhAhyC4T1VoULsRCjRzA==',
    buyer_id: '2088502347015634',
    body: '商品详情',
    invoice_amount: '0.01',
    version: '1.0',
    notify_id: '860bc31c118a47ee862c0437821d34ckv5',
    fund_bill_list: '[{"amount":"0.01","fundChannel":"ALIPAYACCOUNT"}]',
    notify_type: 'trade_status_sync',
    out_trade_no: '20181533695615748',
    total_amount: '0.01',
    trade_status: 'TRADE_SUCCESS',
    trade_no: '2018080821001004630517787770',
    auth_app_id: '2018040902524266',
    receipt_amount: '0.01',
    point_amount: '0.00',
    app_id: '2018040902524266',
    buyer_pay_amount: '0.01',
    sign_type: 'RSA2',
    seller_id: '2088031697679176'
};
let AlipaySdk = require('./alipay');
let AlipaySdkConfig = {
    appId: '2018040902524266',
    // privateKey: fs.readFileSync(path.resolve(__dirname, '../../../', 'cert/alipay/app_private_key.pem')),
    // alipayPublicKey: fs.readFileSync(path.resolve(__dirname, '../../../', 'cert/alipay/ali_public_key.pem'))
};
// let alipaySdk = new AlipaySdk(AlipaySdkConfig)
// alipaySdk.checkNotifySign(alipayNotifyData)

/**
 * 测试encodeURIComponent()和decodeURIComponent()
 * */
let ec = encodeURIComponent('http://seei.tv/auth?name=dcj123&age=10');
let ec2 = encodeURIComponent('123456true~!@#$%$%^^&**(()_+');
// console.log('[encodeURIComponent]', ec)
// console.log('[encodeURIComponent]', ec2)

/**
 * 测试js.filter(...)
 * */
let signParams = {
    app_id: '12371983712983712',
    charset: 'utf-8',
    buyer_id: '2088502347015634',
    body: '商品详情',
    invoice_amount: '0.01',
    version: '1.0',
    notify_id: '860bc31c118a47ee862c0437821d34ckv5',
    fund_bill_list: '[{"amount":"0.01","fundChannel":"ALIPAYACCOUNT"}]',
    notify_type: 'trade_status_sync',
    out_trade_no: '20181533695615748',
    total_amount: '0.01',
    test1: '',
    test2: '',
    null: '123',
    undefined: '456',
};

// const sortArray = Object.keys(signParams).sort()
// console.log('[sortArray]', sortArray)
// const filterArray = sortArray.filter(function (val) { // val === 当前元素值(数组中元素值)
//   console.log('[filter方法]', val) // 此时key=下标, val=数组值
//   return val
// })
// console.log('[filterArray]', filterArray)

/**
 * 测试 module.exports和exports.方法名 能不能同时使用??
 * 不能
 *  */
// let alipayPackage = require('./package')
// console.log('[alipayPackage]', alipayPackage)

/**
 * 测试: form.js的两种写法
 * 1.let formData = new AlipayFormData()
 *   formData.addField(...)
 *   formData.addField(...)
 * 2.let formData = new AlipayFormData()
 *    .addField(...)
 *    .addField(...)
 * 两者结果是否相同 --- 测试结果, 两者得到的结果相同
 * */

// 1.
let formData2 = new AliPayFormData();
formData2.addField('name', 'dcj123');
formData2.addField('age', '12');

// console.log('[formData2]', formData2)

let formData3 = new AliPayFormData()
    .addField('name', 'dcj123')
    .addField('age', '12');

// console.log('[formData3]', formData3)

/**
 * 测试: util_1.isType()是否符合设计的功能要求
 * */
const util_1 = require('./util');

function testIsType(totalAmount, subject, body) {
    // ...
    let array = [];
    !util_1.isType(totalAmount) && array.push(1);
    !util_1.isType(subject) && array.push(2);
    !util_1.isType(body) && array.push(3);

    console.log('[array]', array)
}

// testIsType('', undefined, null)

/**
 * 测试Object.assign({name:'dcj123'},{name:'dcj456'}) 会不会覆盖
 * */
// console.log(Object.assign({name: 'dcj123'}, {name: 'dcj456'}))

// let errArray = ['totalAmount is required', 'subject is required', 'body is required']
//
// if (errArray.length !== 0) {
//   console.log(errArray.join('\n'))
// }

/**
 * 测试ecDo.isType(val, 'undefined/null/空字符串')
 * */
// const ecDo = require('../../ec-do/src/ec-do-2.0.0')
// console.log(ecDo.istype('undefined', 'undefined')) // false
// console.log(ecDo.istype(undefined, 'undefined')) // true
// console.log(ecDo.istype('null', 'null')) // false
// console.log(ecDo.istype(null, 'null')) // true
// console.log(''.length)

/**
 * 测试: mongoose.create(...)成功返回什么
 * */
// const AlipayDb = require('./db')
// const alipayDb = new AlipayDb()

// alipayDb.save(123)
//   .then(res => console.log(res))

/**
 * 测试传入参数: snakeCaseKeys
 * */
const snakeCaseKeys = require('snakecase-keys');
const outTradeNo = '123456778';
const ctxBody = {
    totalAmount: '0.01',
    subject: '商品名称',
    body: '商品描述'
};
// console.log(snakeCaseKeys({outTradeNo}))
// console.log(Object.assign(snakeCaseKeys({outTradeNo}), ctxBody))

/**
 * 测试: factory的get属性
 * */
const AlipayFactory = require('./factory');
const alipayFactory = new AlipayFactory();
// console.log(alipayFactory.ALIPAY_API_MAPPING)

/**
 * 测试: 验签方法
 * */
let postData = {
    gmt_create: '2018-08-08 10:33:41',
    charset: 'utf-8',
    gmt_payment: '2018-08-08 10:33:45',
    notify_time: '2018-08-08 10:33:46',
    subject: '商品',
    sign: 'Jl3lMMuECPEJlouYM1EMjNJkQL0Tt3APr7Wh4iYf+hUrwa7CQKzrNbeGxacXh/xwG/b1X1RTpQECOUvyUeHg+U70o1Cf9yuMN0jhkL2gF+L+GsAn7J2IwyERiPjvChOqDcmoLBbegPBGeSx0ln5UbSfyX3mDamI2C2pesH3Q7j6+pmWvKqkwLk/5TcG/NT8HxhdQZ4CBhBAVAtQJyzbMtSBBd1Nj9kfmi5yv+KDOL4t9Z+L/7T3TFE3PK+sayePoPwo7BMSrVQl/Cuv6ppKqNdKZQSaCahV/rpHNsR9eD5radeWWMAaxOq+Z/2VMLwvmAPMhAhyC4T1VoULsRCjRzA==',
    buyer_id: '2088502347015634',
    body: '商品详情',
    invoice_amount: '0.01',
    version: '1.0',
    notify_id: '860bc31c118a47ee862c0437821d34ckv5',
    fund_bill_list: '[{"amount":"0.01","fundChannel":"ALIPAYACCOUNT"}]',
    notify_type: 'trade_status_sync',
    out_trade_no: '20181533695615748',
    total_amount: '0.01',
    trade_status: 'TRADE_SUCCESS',
    trade_no: '2018080821001004630517787770',
    auth_app_id: '2018040902524266',
    receipt_amount: '0.01',
    point_amount: '0.00',
    app_id: '2018040902524266',
    buyer_pay_amount: '0.01',
    sign_type: 'RSA2',
    seller_id: '2088031697679176'
};

// console.log(alipayFactory.createAlipaySdk().checkNotifySign(postData))

/**
 * 测试: model.find()成功和失败时，　分别返回什么
 * 返回一个数组
 * 1.成功: [].length > 0
 * 2.失败: [].length === 0
 * */
const AlipayDb = require('./db');
const alipayDb = new AlipayDb({appId: 'test'});
// alipayDb.model.find({
//   "out_trade_no": "20180811273861",
//   "app_id": "2018040902524266",
//   "total_amount": "0.01"
// }).exec()
//   .then(res => console.log(res))

async function testFindRes() {
    try {
        let findRes = await alipayDb.model.find({
            "out_trade_no": "20180811273861",
            "app_id": "2018040902524266",
            "total_amount": "0.01"
        }).exec();
        console.log(findRes, findRes.length);
        let checkRes = false;
        findRes.length > 0 && (checkRes = true);
        return checkRes
    } catch (err) {
        console.log(err)
    }
}

// testFindRes()
//   .then(res => {
//     console.log('[testFindRes()]', res)
//   })
// alipayDb.checkNotifyData({
//   "out_trade_no": "20180811273861",
//   "app_id": "2018040902524266",
//   "total_amount": "0.01"
// })
//   .then(res => console.log('[alipayDb.checkNotifyData]', res))

async function testUpdateRes() {
    try {
        let updateRes = await alipayDb.model.findOneAndUpdate({
                "out_trade_no": "20180811273861",
                "app_id": "2018040902524266",
                "total_amount": "0.01"
            },
            {$set: {payStatus: '11'}},
            {new: true}
        ).exec();

        console.log(updateRes, typeof updateRes);
        // let checkRes = false
        // findRes.length > 0 && (checkRes = true)
        // return checkRes
        return true
    } catch (err) {
        console.log('[1234]', err);
        return false
    }
}

// testUpdateRes()
//   .then(res => {
//     console.log('[testUpdateRes()]', res)
//   })

/**
 * 测试: Promise嵌套
 * */

async function promiseNest() {
    return new Promise((resolve, reject) => {
        // let res = process()
        // console.log('[res]', res)
        // resolve(res)
        console.log('[process()]');
        resolve(process())
    })
}

// 嵌套的promise
async function process() {
    return new Promise((resolve, reject) => {
        setTimeout(function () {
            console.log('process().resolve(Hello)');
            resolve({out_trade_no: '201808141234567890'})
        }, 5000)
    })
}

// promiseNest()
//   .then(res => console.log('[promiseNest]', res))

/**
 * 测试: job.js.getJobProcess(id)
 * */
// let fxqueue = require('../../queue/v2/index')
// let Job = require('../../queue/v2/lib/job')
// let queue = fxqueue.createQueue({
//   options: {
//     prefix: 'q',
//     name: 'xqueue'
//   },
//   redisConfig: {
//     port: 6379,
//     host: '127.0.0.1',
//     auth: 'foobared',
//     db: '4',
//   }
// })
//
// Job.getJobProcess(1)
//   .then(job => { // job实例, 已经从inactive>>>active
//     console.log('[job]', job)
//     console.log('[job.data.out_trade_no]', job['data']['out_trade_no'])
//   })
//   .catch((err) => {
//     console.log('[err]', err)
//   })

/**
 * 测试: 驼峰转下划线
 * */
function testSnakeCaseKeys(outTradeNo) {
    const decamelizeParams = snakeCaseKeys(outTradeNo);
    console.log('[decamelizeParams]', decamelizeParams);
    testSnakeCaseKeysExec(decamelizeParams);
    return 1
}

function testSnakeCaseKeysExec(decamelizeParams) {
    console.log('[testSnakeCaseKeyExec]', decamelizeParams)
}

testSnakeCaseKeys({outTradeNo: '123123'});