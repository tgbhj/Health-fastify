/**
 * 微信支付 --- 根据支付宝sdk改写
 * */
const urllib = require('urllib');
const pkg = require('./package');
const camelCaseKeys = require('camelcase-keys');
const snakeCaseKeys = require('snakecase-keys');
const wutil_1 = require('./wutil');
const is = require('is');
const xml2js = require('xml2js');
const MD5 = require('blueimp-md5');
const fs = require('fs');

class WxpaySdk {
    constructor(config) {
        if (!config.appId) {
            throw new Error('config.appId is required')
        }
        if (!config.mchId) {
            throw new Error('config.mchId is required')
        }
        if (!config.certPath) {
            throw new Error('config.certPath is required')
        }
        if (!config.key) {
            throw new Error('config.key is required')
        }
        this.config = Object.assign({
            urllib,
            // signType: 'MD5',
            // spBillCreateIp: '211.161.196.204',
            // tradeType: 'NATIVE',
            timeout: 5000,
            camelcase: true,
            charset: 'utf-8',

        }, camelCaseKeys(config, {deep: true}));
        this.sdkVersion = `wxpay-sdk-nodejs-${pkg.version}`;
        this.builder = new xml2js.Builder({rootName: 'xml'});
        this.parser = new xml2js.Parser({trim: true, explicitArray: false, explicitRoot: false})
    }

    /***
     * 需要证书的操作
     * @param method
     * @param option
     * @returns {Promise}
     */
    pemExec(method, option = {}) {
        // let signParams = {wxpaySdk: this.sdkVersion} // 是否需要???
        let signParams = {};
        const config = this.config;
        const infoLog = (option.log && is.fn(option.log.info)) ? option.log.info : null;
        const errorLog = (option.log && is.fn(option.log.error)) ? option.log.error : null;
        option.formData.getFields().forEach((field) => {
            signParams[field.name] = field.value
        });
        // 签名方法中，都使用驼峰
        signParams = camelCaseKeys(signParams, {deep: true});
        // 计算签名
        const signData = wutil_1.sign(signParams, config);
        const xmlSignData = this.builder.buildObject(signData);
        // 格式化url(微信支付不需要)
        console.log('[pemExec pfx]', typeof config.certPath);
        console.log('[pemExec passphrase]', config.key, typeof config.key);

        infoLog && infoLog('[WxpaySdk]start pemExec, xmlSignData: %s', xmlSignData);
        return new Promise((resolve, reject) => {
            config.urllib.request(method, {
                method: 'post',
                timeout: config.timeout,
                data: xmlSignData,
                dataType: 'text',
                headers: {'user-agent': this.sdkVersion},
                pfx: fs.readFileSync(config.certPath), // 证书
                passphrase: config.mchId // 密码
            })
                .then((ret) => {
                    infoLog && infoLog('[WxpaySdk]pemExec response: %s', typeof ret);
                    if (ret.status === 200) {
                        const result = ret.data;
                        const data = this.parseXML(result);
                        console.log('[pemExec data]', data);
                        const validateSuccess = config.validateSign ? this.checkResponseSign(data) : true;
                        console.log('[pemExec validateSuccess]', validateSuccess);
                        if (validateSuccess) {
                            resolve(config.camelcase ? camelCaseKeys(data, {deep: true}) : data)
                        } else {
                            reject({serverResult: ret, errorMessage: '[WxpaySdk]验签失败'})
                        }
                    }
                    reject({serverResult: ret, errorMessage: '[WxpaySdk]HTTP 请求错误'})
                })
                .catch((err) => {
                    err.message = '[Wxpay]pemExec error';
                    errorLog && errorLog(err);
                    reject(err)
                })
        })
    }

    exec(method, params = {}, option = {}) {
        if (option.formData) {
            if (option.formData.getFields().length > 0) {
                return this.pemExec(method, option)
            }
        }
        const config = this.config;
        // 计算签名
        const signData = wutil_1.sign(params, config);
        const xmlSignData = this.builder.buildObject(signData);
        const infoLog = (option.log && is.fn(option.log.info) ? option.log.info : null);
        const errorLog = (option.log && is.fn(option.log.error) ? option.log.error : null);
        infoLog && infoLog('[WxpaySdk]start exec, xmlSignData: %s', xmlSignData);
        return new Promise((resolve, reject) => {
            config.urllib.request(method, {
                method: 'post',
                timeout: config.timeout, // 连接超时+响应超时(默认都为5秒);timeout:[3000,5000]表示连接超时3秒, 响应超时5秒
                data: xmlSignData, // xml数据
                dataType: 'text', // text/json, text返回string, json返回JSON对象并set Accept: application/json header, 默认返回buffer
                headers: {'user-agent': this.sdkVersion}
            })
                .then((ret) => {
                    infoLog && infoLog('[WxpaySdk]exec response: %s', typeof ret); // object
                    if (ret.status === 200) {
                        // console.log(ret)
                        const result = ret.data; // string
                        // console.log('[result]', result)
                        const isParse = result.startsWith('<xml>'); // 是否需要xml解析
                        let data = null;
                        isParse ? data = this.parseXML(result) : data = {result};
                        console.log('[exec data]', data);
                        // 按字符串验签
                        const validateSuccess = option.validateSign ? this.checkResponseSign(data) : true;
                        // console.log('[validateSuccess]', validateSuccess)
                        if (validateSuccess) {
                            resolve(config.camelcase ? camelCaseKeys(data, {deep: true}) : data)
                        } else {
                            reject({serverResult: ret, errorMessage: '[WxpaySdk]验签失败'})
                        }
                    }
                    reject({serverResult: ret, errorMessage: '[WxpaySdk]HTTP 请求错误'})
                })
                .catch((err) => {
                    err.message = '[WxpaySdk]exec error';
                    errorLog && errorLog(err);
                    reject(err)
                })
        })
    }

    /***
     * 生成xml
     */
    createXML(method, params = {}, option = {}) {
        if (option.formData) {
            if (option.formData.getFields().length > 0) {
                return this.pemExec(method, option)
            }
        }
        const config = this.config;
        // 计算签名
        const signData = wutil_1.sign(params, config);
        return this.builder.buildObject(signData)
    }

    secondXML(method, params = {}, option = {}) {
        if (option.formData) {
            if (option.formData.getFields().length > 0) {
                return this.pemExec(method, option)
            }
        }
        const secondSign = wutil_1.appSign(params);
        return this.builder.buildObject(secondSign)
    }

    /***
     * 结果验签
     * @param signObj
     * @returns {boolean}
     */
    checkResponseSign(signObj) {
        // 待验签字符串不存在时返回失败
        if (!signObj) {
            return false
        }
        // 去除'sign'参数, md5签名并和serverSign做比对
        const serverSign = signObj['sign'];
        const md5Sign = wutil_1.checkSign(signObj, this.config);
        return serverSign === md5Sign;
    }

    /***
     * 将xml解析成object
     * @param signStr
     * @returns {*}
     */
    parseXML(signStr) {
        let xml = null;
        this.parser.parseString(signStr, function (err, result) {
            xml = result
        });
        return xml
    }

    /**
     * 通知验签(异步通知)
     * @param postData {Object}
     */
    async checkNotifySign(postData) {
        if (!postData) {
            return false
        }
        const serverSign = postData['sign'];
        const md5Sign = await wutil_1.checkSign(postData, this.config);
        return serverSign === md5Sign;
    }
}

module.exports = WxpaySdk;