"use strict";

const config = require("../config");
const express = require("express");
const sgMail = require("@sendgrid/mail");
const fbservice = require("../services/fb-service");

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
      let returninfo = {
        items: data.Data.OrderItems,
        bOrderID: data.Data.BillBeeOrderId
      };
      res.json(returninfo);
    }
  );
  //let response = `Newsletter wie geht es dir`;
  //res.json([]);
});

router.get("/announce-return", function(req, res) {
  //let body = req.query;

  let bOrderID = req.query.borderid;
  let retourReason = req.query.retourreason;
  let psid = req.query.psid;
  let retourSKUS = decodeURIComponent(JSON.parse(req.query.retourskus));

  console.log(`UID: ${psid}`);
  console.log(`orderID: ${bOrderID}`);
  console.log(`retourReason: ${retourReason}`);
  console.log(`retourSKUS: ${retourSKUS}`);

  var request = require("request"),
    username = config.BILLBEE_USERNAME,
    password = config.BILLBEE_PASS,
    url = `https://app.billbee.io/api/v1/orders/${bOrderID}/tags`,
    auth = "Basic " + new Buffer(username + ":" + password).toString("base64");

  request.post(
    {
      url: url,
      headers: {
        Authorization: auth,
        "X-Billbee-Api-Key": config.BILLBEE_API_KEY,
        Accept: "application/json"
      },
      body: {
        Tags: ["return-announced"]
      },
      json: true
    },
    function(error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(body);
      }
    }
  );

  let customerMessage = `Retour Artikel: ${retourSKUS}, Retour Grund: ${retourReason}`;
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = {
    to: "support@simaru.zohodesk.eu",
    from: `info@simaru.de`,
    subject: `Retour Ankündigung: ${bOrderID}`,
    templateId: "d-01e73572b69f4c2fb7222c392b931661",
    substitutionWrappers: ["{{", "}}"],
    dynamic_template_data: {
      bOrderID: bOrderID,
      retourSKUS: retourSKUS,
      retourReason: retourReason,
      subject: `Retour Ankündigung: ${bOrderID}`
    }
    /*
    text: customerMessage,
    html: `<strong>${customerMessage}</strong>`
    */
  };

  sgMail.send(msg);

  console.log("Nachricht gesendet...");
  fbservice.sendTextMessage(
    psid,
    `Vielen Dank für die Ankündigung der Retour folgender Artikel: ${retourSKUS}`
  );
  res.json([]);
});

module.exports = router;
