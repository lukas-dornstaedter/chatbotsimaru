"use strict";

const config = require("../config");
const express = require("express");

const router = express.Router();

router.get("/webview", function(req, res) {
  res.render("retour-settings");
});

router.get("/settings", function(req, res) {
  var orderID = req.query.orderid;
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

router.get("/announce-return", function(req, res) {
  console.log("announced-return");
  var request = require("request"),
    username = config.BILLBEE_USERNAME,
    password = config.BILLBEE_PASS,
    url = "https://app.billbee.io/api/v1/orders/54765571/tags",
    auth = "Basic " + new Buffer(username + ":" + password).toString("base64");

  request({
    url: url,
    methode: "POST",
    headers: {
      Authorization: auth,
      "X-Billbee-Api-Key": config.BILLBEE_API_KEY,
      Accept: "application/json"
    },
    multipart: [
      {
        "content-type": "application/json",
        body: JSON.stringify({
          Tags: ["return-announced"]
        })
      }
    ],

    function(error, response, body) {
      // Do more stuff with 'body' here
      //console.log(body.Data);
      if (response.statusCode == 201) {
        console.log("ok");
      } else {
        console.log("error: " + response.statusCode);
        console.log(body);
      }
    }
  });
});

module.exports = router;
