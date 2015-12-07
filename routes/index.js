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
    console.log('api slack route', req.params.phone);

    var body = req.body;
    var command = req.body.text;

    pizzabot.route(req.body)
        .then(res.json({msg: 'OK'}))
        .fail(res.json({msg: 'FAIL'}));

});

module.exports = router;
