/**
 * 电脑网站支付 --- 根据sdk改写
 * */
const is = require('is');
const crypto = require('crypto');
const urllib = require('urllib');
const camelCaseKeys = require('camelcase-keys'); // foo-bar转换成fooBar
const snakeCaseKeys = require('snakecase-keys');
const util_1 = require('./util');
const pkg = require('./package.json');

class AlipaySdk {
    /**
     * 1.appId: 应用id
     * 2.privateKey: 私钥 (签名)
     * 3.keyType
     * 4.alipayPublicKey: 公钥 (验签)
     * 5.gateway: 网关
     * 6.timeout: ???
     * 7.camelcase: ???
     * 8.signType: 签名算法RSA2
     * 9.charset: 请求编码格式utf-8
     * 10.urllib: ???
     * */

    /**
     * 构造方法
     * @param config
     *        appId 应用id
     *        privateKey 私钥
     *        alipayPublicKey 公钥
     */
    constructor(config) {
        /** 应用id **/
        if (!config.appId) {
            throw new Error('config.appId is required')
        }
        /**
         * 应用私钥字符串
         * RSA签名验签工具：https://docs.open.alipay.com/291/106097）
         * 密钥格式一栏请  选择 “PKCS1(非JAVA适用)”
         */
        if (!config.privateKey) {
            throw new Error('config.privateKey is required')
        }

        /**
         * 应用公钥字符串
         * */
        if (!config.alipayPublicKey) {
            throw new Error('config.alipayPublicKey is required')
        }

        /**
         * keyType: 密钥格式
         * 1.PKCS8: Java适用 --- PRIVATE KEY --- privateKeyType --- keyType
         * 2.PKCS1: 非Java适用 --- RSA PRIVATE KEY --- privateKeyType --- keyType
         * */
        const privateKeyType = config.keyType === 'PSCK8' ? 'PRIVATE KEY' : 'RSA PRIVATE KEY';
        config.privateKey = AlipaySdk.formatKey(config.privateKey, privateKeyType);
        if (config.alipayPublicKey) {
            config.alipayPublicKey = AlipaySdk.formatKey(config.alipayPublicKey, 'PUBLIC KEY')
        }
        this.config = Object.assign({
            urllib,
            gateway: 'https://openapi.alipay.com/gateway.do',
            timeout: 5000,
            camelcase: true,
            signType: 'RSA2',
            charset: 'utf-8',
            version: '1.0',
        }, camelCaseKeys(config, {deep: true})); // 下划线转成驼峰 & 合并
        this.sdkVersion = `alipay-sdk-nodejs-${pkg.version}`
    }

    /**
     * 功能: 格式化key
     * @param key 支付宝私钥
     * @param type 密钥内容开头
     *             私钥: (BEGIN/END)RSA PRIVATE KEY
     *             公钥: (BEGIN/END)PUBLIC KEY
     * @returns {string}
     */
    static formatKey(key, type) {
        const item = key.split('\n').map(val => val.trim());
        // 删除包含 `RSA PRIVATE KEY / PUBLIC KEY` 等字样的第一行
        if (item[0].includes(type)) {
            item.shift()
        }
        // 删除包含 `RSA PRIVATE KEY / PUBLIC KEY` 等字样的最后一行
        if (item[item.length - 1].includes(type)) {
            item.pop()
        }

        return `-----BEGIN ${type}-----\n${item.join('')}\n-----END ${type}-----`
    }

    /**
     * page 类接口
     * @param method 接口名称/方法名称
     * @param option
     * @param formData 数组[{name:'...', value:'...'}]
     * @param field {name:'...', value:'...'}
     * @param signParams {alipaySdk: '1.0', 'notifyUrl', 'http://www.com/notify',}
     * @param 默认返回的数据为html代码片段, 比如PC支付接口: alipay.trade.page.pay, 返回的内容为Form表单.
     * @param setMethod(method): 'post'|'get' 默认为post
     *        post: 返回html代码片段, 内容为Form表单. & 将form代码执行, 会向url(支付宝网关发起请求, url附带请求参数)
     *        get:  返回可以跳转到支付页面的url.
     * @param 在签名之前的键, 统一转成驼峰(bizContent, 传参时, 尽量使用驼峰);
     *        在签名时, 统一转成下划线(biz_content)
     */
    pageExec(method, option = {}) {
        let signParams = {alipaySdk: this.sdkVersion};
        // let signParams = {}
        const config = this.config;
        const infoLog = (option.log && is.fn(option.log.info)) ? option.log.info : null;
        option.formData.getFields().forEach((field) => {
            signParams[field.name] = field.value
        });
        // 签名方法中使用的key是驼峰
        signParams = camelCaseKeys(signParams, {deep: true});
        // 计算签名
        const signData = util_1.sign(method, signParams, config);
        // 格式化url
        const {execParams, url} = AlipaySdk.formatUrl(config.gateway, signData);
        /*
        * 1.部分结果timestamp=2018-08-07%2016%3A00%3A28
        * 2.经过格式化请求的url, 已经由encodeURIComponent进行转码
        * 3.剩下的参数execParams, 手动转码, 将字符串中的"都替换为&quot;
        * */
        infoLog && infoLog('[AlipaySdk]start exec url: %s, method: %s, params: %s', url, method, execParams);
        if (option.formData.getMethod() === 'get') {
            return new Promise((resolve) => {
                const query = Object.keys(execParams).map((key) => { // 对execParams(Object类型)
                    return `${key}=${encodeURIComponent(execParams[key])}`  // 把字符串当作UI组件进行转码
                });
                resolve(`${url}&${query.join('&')}`)
            })
        }

        // post
        return new Promise((resolve) => {
            // 生成表单
            const formName = `alipaySDKSubmit${Date.now()}`;
            resolve(`
        <form action="${url}" method="post" name="${formName}" id="${formName}">
            ${Object.keys(execParams).map((key) => {
                const value = String(execParams[key]).replace(/\"/g, '&quot;');// 将字符串中的"都替换为&quot;, 例如: "hello">>>&quto;hello&quto;
                return `<input type="hidden" name="${key}" value="${value}"/>`
            }).join('')}
        </form>
        <script>document.forms["${formName}"].submit()</script>
      `)
        })
    }

    signExec(method, option = {}) {
        // let signParams = {alipaySdk: this.sdkVersion};
        let signParams = {};
        const config = this.config;
        const infoLog = (option.log && is.fn(option.log.info)) ? option.log.info : null;
        option.formData.getFields().forEach((field) => {
            signParams[field.name] = field.value
        });
        // 签名方法中使用的key是驼峰
        signParams = camelCaseKeys(signParams, {deep: true});
        // 计算签名
        const signData = util_1.sign(method, signParams, config);
        // 格式化url
        const {execParams, url} = AlipaySdk.formatUrl(config.gateway, signData);
        /*
        * 1.部分结果timestamp=2018-08-07%2016%3A00%3A28
        * 2.经过格式化请求的url, 已经由encodeURIComponent进行转码
        * 3.剩下的参数execParams, 手动转码, 将字符串中的"都替换为&quot;
        * */
        infoLog && infoLog('[AlipaySdk]start exec url: %s, method: %s, params: %s', url, method, execParams);
        if (option.formData.getMethod() === 'get') {
            return new Promise((resolve) => {
                const query = Object.keys(execParams).map((key) => { // 对execParams(Object类型)
                    return `${key}=${encodeURIComponent(execParams[key])}`  // 把字符串当作UI组件进行转码
                });
                resolve(`${url}&${query.join('&')}`)
            })
        }

        // post
        return new Promise((resolve) => {
            // 生成表单
            const formName = `alipaySDKSubmit${Date.now()}`;
            resolve(`
        <form action="${url}" method="post" name="${formName}" id="${formName}">
            ${Object.keys(execParams).map((key) => {
                const value = String(execParams[key]).replace(/\"/g, '&quot;');// 将字符串中的"都替换为&quot;, 例如: "hello">>>&quto;hello&quto;
                return `<input type="hidden" name="${key}" value="${value}"/>`
            }).join('')}
        </form>
        <script>document.forms["${formName}"].submit()</script>
      `)
        })
    }

    /**
     * 执行请求
     * @param method 调用接口方法名, 比如: alipay.trade.page.pay
     * @param params 公共请求参数和请求参数
     * @param params.bizContent 业务请求参数(请求参数)
     * @param option 选项
     * @param option.validateSign 是否验签
     * @param args.log 可选日志记录对象
     * @param execParams 剩下的参数
     * @param url 把某些固定参数放入 url
     * @formData form.js的AlipayForm类(page类使用)
     * @param signData 表示签名后的数据
     *        1.属性名以下划线隔开
     *        2.配置信息(appId/公钥/私钥)+传入参数(return_url/notify_url/biz_content)+签名sign
     * @function formatUrl 将必要的参数拼接在url中, 并进行encodeUIComponent()转码
     * @return {Promise<any>} 请求执行结果
     */
    exec(method, params = {}, option = {}) {
        if (option.formData) {
            if (option.formData.getFiles().length > 0) {
                // ... formData包含文件
            }
            /**
             * formData不包含文件时, 认为是page 类接口(返回form表单)
             * 比如 PC 端支付接口 alipay.trade.page.pay
             */
            return this.pageExec(method, option)
        }
        const config = this.config;
        // 计算签名
        const signData = util_1.sign(method, params, config);
        const {execParams, url} = AlipaySdk.formatUrl(config.gateway, signData);
        const infoLog = (option.log && is.fn(option.log.info) ? option.log.info : null);
        const errorLog = (option.log && is.fn(option.log.error) ? option.log.error : null);
        infoLog && infoLog('[AlipaySdk]start exec, url: %s, method: %s, params: %s', url, method, JSON.stringify(execParams));
        return new Promise((resolve, reject) => {
            config.urllib.request(url, {
                method: 'POST',
                data: execParams,
                dataType: 'text', // text/json, text返回string, json返回JSON对象并set Accept: application/json header, 默认返回buffer
                timeout: config.timeout, // 连接超时+响应超时， timeout(5s默认): 表示连接超时+响应超时都为5s;timeout:[3000,5000], 表示连接超时3s， 响应超时5s
                headers: {'user-agent': this.sdkVersion}
            })
                .then((ret) => { // ret>>>result
                    infoLog && infoLog('[AlipaySdk]exec response: %s', ret);
                    if (ret.status === 200) {
                        /**
                         * 示例响应格式
                         * {"alipay_trade_precreate_response":
                         *  {"code": "10000","msg": "Success","out_trade_no": "111111","qr_code": "https:\/\/"},
                         *  "sign": "abcde="
                         * }
                         * 1.返回的ret.data类型: string
                         * 2.result: Object类型的ret.data
                         * 3.result[responseKey]: Object类型的data
                         */
                        const result = JSON.parse(ret.data);
                        const responseKey = `${method.replace(/\./g, '_')}_response`; // .替换为_(alipay.trade.precreate>>>alipay_trade_precreate)
                        const data = result[responseKey];
                        // console.log('[exec data]', data);
                        // 按字符串验签
                        const validateSuccess = option.validateSign ? this.checkResponseSign(ret.data, responseKey) : true;
                        if (validateSuccess) {
                            resolve(config.camelcase ? camelCaseKeys(data, {deep: true}) : data)
                        } else {
                            reject({serverResult: ret, errorMessage: '[AlipaySdk]验签失败'})
                        }
                    }
                    reject({serverResult: ret, errorMessage: '[AlipaySdk]HTTP 请求错误'})
                })
                .catch((err) => {
                    err.message = '[AlipaySdk]exec error';
                    errorLog && errorLog(err);
                    reject(err)
                })
        })
    }

    appExec(method, params = {}, option = {}) {
        method = 'alipay.trade.app.pay';
        if (option.formData) {
            if (option.formData.getFiles().length > 0) {
            }
            return this.signExec(method, option)
        }
        const config = this.config;
        // 计算签名
        const signData = util_1.sign(method, params, config);

        let requestUrl = url;

        const urlArgs = [
            'app_id', 'method', 'format', 'charset',
            'sign', 'sign_type', 'timestamp', 'version',
            'notify_url', 'auth_token', 'app_auth_token' // 除auth_token, 其他都在公共请求参数中
        ];

        for (let key in signData) {
            if (urlArgs.indexOf(key) > -1) {
                const val = encodeURIComponent(signData[key]); // 把字符串当作URI组件进行转码
                requestUrl = `${requestUrl}${requestUrl.includes('?') ? '&' : '?'}${key}=${val}`;
                delete params[key]
            }
        }

        return {execParams: params, url: requestUrl}
    }

    /**
     * 格式化请求url (按把某些固定的参数放入 url)
     * @param url 支付宝网关
     * @param params 请求参数对象, 含sign(val为buffer)
     *               inUrl 需要放在url中的参数
     *               inBody 剩下放在body体中的参数
     * @returns {{execParams: *, url: *}}
     */
    static formatUrl(url, params) {
        let requestUrl = url;

        // 需要放在url中的参数列表(公共请求参数???)
        const urlArgs = [
            'app_id', 'method', 'format', 'charset',
            'sign', 'sign_type', 'timestamp', 'version',
            'return_url', 'notify_url', 'auth_token', 'app_auth_token' // 除auth_token, 其他都在公共请求参数中
        ];

        for (let key in params) {
            if (urlArgs.indexOf(key) > -1) {
                const val = encodeURIComponent(params[key]); // 把字符串当作URI组件进行转码
                requestUrl = `${requestUrl}${requestUrl.includes('?') ? '&' : '?'}${key}=${val}`;
                delete params[key]
            }
        }

        return {execParams: params, url: requestUrl}
    }

    /**
     * 根据服务器返回的结果截取需要验签的目标字符串
     * @param originStr
     * @param responseKey xx_response 接口名称/方法名称
     */
    static getSignStr(originStr, responseKey) {
        /**
         * {
         *   "alipay_trade_precreate_response": {
         *      "code": "10000",
         *      "msg": "Success",
         *      "out_trade_no": "6823789339978248",
         *            "qr_code": "https://qr.alipay.com/bavh4wjlxf12tper3a"
         *     },
         *   "sign": "ERITJKEIJKJHKKKKKKKHJEREEEEEEEEEEE"
         * }
         */
        let validateStr = originStr.trim();
        // 找到 xxx_response 开始的位置
        const startIndex = originStr.indexOf(`${responseKey}"`); // 2
        /**
         * 1.找到最后一个 "sign" 字符串的位置(原始字符串是"sign"， 如写成'sign'， 会出现偏差("号))
         * 2.lastIndexOf(参数)的3种情况:
         *  (1) lastIndexOf('sign'): 检索sign字符串
         *  (2) lastIndexOf("sign"): 检索sign字符串
         *  (3) lastIndexOf('"sign"'): 检索"sign"字符串
         */
        const lastIndex = originStr.lastIndexOf('"sign"');
        /**
         * 删除 xxx_response 及之前的字符串
         * 假设原始字符串为
         *  {"xxx_response":{"code":"10000"},"sign":"jumSvxTKwn24G5sAIN"}
         * 删除后变为
         *  :{"code":"10000"},"sign":"jumSvxTKwn24G5sAIN"}
         *
         * 1.确定起始位置，截取到最后
         * 2.startIndex + responseKey.length + 1(最后的")
         */
        validateStr = validateStr.substr(startIndex + responseKey.length + 1);
        /**
         * 删除最后一个 "sign" 及之后的字符串
         * 删除后变为
         *  :{"code":"10000"},
         * {} 之间就是待验签的字符串
         */
        validateStr = validateStr.substr(0, lastIndex);
        /**
         * 删除第一个 { 之前的任何字符
         * 正则分析
         * /^[^{]*{/g
         * 1./^.../g: 有^, 表示开头严格匹配
         * 2.[^{]*{:
         *   (1)[^{]: 表示除了 { 之外的字符集合
         *   (2)[^{]*: 表示除了 { 之外的字符集合, 匹配{0,} 0次或多次
         *   (3){: 表示普通的字符{
         * 3.匹配后{"code":"10000"},
         */
        validateStr = validateStr.replace(/^[^{]*{/g, '{'); // $1替换成$2
        /**
         * 删除最后一个 { 之后的任何字符
         * 正则分析
         * /\}([^}]*)$/g
         * 1./...$/g: 有$, 表示结尾严格匹配
         * 2.\}([^}]*)
         *  (1)\}: 转义}, 表示普通字符{, ({2,3}在正则中表示匹配次数)
         *  (2)([^}]): 表示除了 } 之外的任何字符
         *  (3)([^}]*): 表示除了 } 之外的任何字符， 匹配{0,} 0次或多次
         * 3.匹配后{"code":"10000"}
         */
        validateStr = validateStr.replace(/\}([^}]*)$/g, '}');
        return validateStr
    }

    /**
     *结果验签
     * @param signStr 待验证的签名字符串
     * @param responseKey 接口名称/方法名称
     */
    checkResponseSign(signStr, responseKey) {
        if (this.config.alipayPublicKey || this.config.alipayPublicKey === '') {
            // 支付宝公钥不存在时不做验签
            return true
        }

        // 待验签的字符串不存在时返回失败
        if (!signStr) {
            return false
        }
        // 根据服务器返回的结果截取需要验签的目标字符串
        const validateStr = AlipaySdk.getSignStr(signStr, responseKey);
        // 服务端返回的签名
        const serverSign = JSON.parse(signStr)['sign'];
        // 参数存在, 并且是正常结果时(不包含 sub_code ) 时才验签
        const verifier = crypto.createVerify(util_1.ALIPAY_ALGORITHM_MAPPING[this.config.signType]);
        verifier.update(validateStr, 'utf-8');
        return verifier.verify(this.config.alipayPublicKey, serverSign, 'base64')
    }

    /**
     * 通知验签 (异步通知) --- 对象: 键/值
     * @param postData {JSON} 服务端的消息内容
     * @param 关键参数校验 app_id、out_trade_no、total_amount
     *
     * @returns {boolean} true: 验签成功; false: 验签失败
     */
    checkNotifySign(postData) {
        const signStr = postData.sign;
        const signType = postData.sign_type || 'RSA2';
        if (!this.config.alipayPublicKey || !signStr) {
            return false
        }
        const signArgs = Object.assign({}, postData);
        // 删除sign和sign_type
        delete signArgs.sign;
        delete signArgs.sign_type;
        // 签名字符串处理
        const decodeSign = Object.keys(signArgs).sort().filter(val => val).map((key) => {
            let value = signArgs[key];
            if (Object.prototype.toString.call(value) !== '[object String]') {
                value = JSON.stringify(value)
            }
            return `${key}=${decodeURIComponent(value)}` // 异步返回结果的验签的步骤(第二步)
        }).join('&');

        const verifier = require('crypto').createVerify(util_1.ALIPAY_ALGORITHM_MAPPING[signType]);
        verifier.update(decodeSign, 'utf8');
        return verifier.verify(this.config.alipayPublicKey, signStr, 'base64')
    }
}

module.exports = AlipaySdk;