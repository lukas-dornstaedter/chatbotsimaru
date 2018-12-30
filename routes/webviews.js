"use strict";

const config = require("../config");
const express = require("express");

const router = express.Router();

router.get("/webview", function(req, res) {
  res.render("retour-settings");
});

router.get("/settings/:orderid", function(req, res) {
  var orderID = req.params.orderid;
  var request = require("request"),
    username = config.BILLBEE_USERNAME,
    password = config.BILLBEE_PASS,
    url = "https://app.billbee.io/api/v1/orders/findbyextref/" + orderID,
    auth = "Basic " + new Buffer(username + ":" + password).toString("base64");

  request(
    {
      url: url,
      headers: {
        Authorization: auth,
        "X-Billbee-Api-Key": config.BILLBEE_API_KEY,
        Accept: "application/json"
      }
    },
    function(error, response, body) {
      // Do more stuff with 'body' here
      //console.log(body.Data);
      let data = JSON.parse(body);
      let items = data.Data.OrderItems;
      res.json(items);
    }
  );
  //let response = `Newsletter wie geht es dir`;
  //res.json([]);
});

module.exports = router;
