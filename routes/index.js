var express = require('express');
var router = express.Router();

var pizzapi = require('dominos');

var pizzabot = require('../pizzabot');

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});


router.get('/api/track/phone/:phone', function (req, res, next) {
    console.log('api route', req.params.phone);
    pizzapi.Track.byPhone(req.params.phone, function (pizzaData) {
        res.json(pizzaData);
    });
});

router.get('/api/track/id/:id/store/:store', function (req, res, next) {
    console.log('api route', req.params.id, req.params.store);
    pizzapi.Track.byId(req.params.store, req.params.id, function (pizzaData) {
        res.json(pizzaData);
    });
});

router.post('/api/slack', function (req, res, next) {
    console.log('api slack route', req.body);

    pizzabot.route(req.body)
        .then(function (result) {
            res.json(result);
        })
        .fail(function (result) {
            res.json(result);
        });

});

module.exports = router;
