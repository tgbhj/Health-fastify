/*
* 测试在resolve()后执行，后续代码吗?
* 回答: 会执行，先执行同步任务，再执行异步任务
* */
const {clientTest} = require('/redis');

function t1() {
    function printName() {
        // ...
        console.log('[printName]')
    }

    function printAge() {
        // ...
        console.log('[printAge]')
    }

    return new Promise((resolve, reject) => {
        resolve(1);
        printName();
        printAge()
    })
}

t1().then(res => console.log(res));
// 会执行
// [printName]
// [printAge]
// 1

/*
* 测试mutli+hset+exec=返回的结果是什么
* */
clientTest
    .multi()
    .hset('q:job:1', 'name', 'dcj')
    .hset('q:job:1', 'age', '20')
    .hset('q:job:1', 'priority', 1)
    .hset('q:job:1', 'update_at', Date.now())
    .exec((err, effectNum) => {
        console.log('[effectNum]', effectNum) // [1,1,1] & 第一次插入成功
                                              // [0,0,0] & 第二次插入相同的值
    });

clientTest
    .multi()
    .hset('q:job:1', 'name', 'lbg')
    .exec((err, effectNum) => {
        console.log('[effectNum update_at]', effectNum)
    });