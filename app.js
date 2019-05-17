const fastify = require('fastify')({
    logger: {level: 'info'}
});

// require('./socket');
const path = require('path');
require('./redis');
const serveStatic = require('serve-static');
const {mongoHost, mongoPort, mongoDataBase, httpPort} = require('./config/config');
// const {mongoHost, mongoPort, mongoDataBase, httpPort, mongoUser, mongoPass} = require('./config/config');
const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
const db = mongoose.connect(`mongodb://${mongoHost}:${mongoPort}/${mongoDataBase}`, {
    useNewUrlParser: true,
    useFindAndModify: false,
    poolSize: 1
});
db.then(() => {
    console.log('MongoDB Connect Success')
}, error => {
    console.log('MongoDB Connect Failed' + error)
});

// const db = mongoose.connect(`mongodb://${mongoUser}:${mongoPass}@${mongoHost}:${mongoPort}/${mongoDataBase}`, {
//     useNewUrlParser: true,
//     useFindAndModify: false,
//     poolSize: 1
// });
// db.then(() => {
//     console.log('MongoDB Connect Success')
// }, error => {
//     console.log('MongoDB Connect Failed' + error)
// });

fastify.use(serveStatic(path.resolve(__dirname, 'public')));
fastify.use(serveStatic(path.resolve(__dirname, 'build')));

const Router = {
    route: (fastify, routers, prefix = '') => {
        routers.forEach(router => {
            if (router.routes instanceof Array) {
                return Router.route(fastify, router.routes, router.prefix);
            }

            if (router.routes instanceof Function) {
                fastify.register(router.routes, {prefix: `${prefix || ''}${router.prefix || ''}`});
            }
        });
    }
};

const routes = require('./routes/routers');

Router.route(fastify, routes);

fastify
    .listen(httpPort)
    .then(() => console.log(`Server Start`))
    .catch(err => {
        fastify.log.error('Error starting server:', err);
        process.exit(1)
    });