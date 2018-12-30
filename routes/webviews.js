"use strict";

const config = require("../config");
const express = require("express");

const router = express.Router();

router.get("/webview", function(req, res) {
  res.render("retour-settings");
});

router.get("/settings", function(req, res) {
  var request = require("request"),
    username = config.BILLBEE_USERNAME,
    password = config.BILLBEE_PASS,
    url = "https://app.billbee.io/api/v1/orders/findbyextref/7191",
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
      console.log(data.Data.OrderItems);
      res.json(data.Data.OrderItems);
    }
  );
});

module.exports = router;
