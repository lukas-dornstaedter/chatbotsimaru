"use strict";

const config = require("../config");
const express = require("express");
const fbservice = require("../services/fb-service");

const router = express.Router();

router.get("/webview", function(req, res) {
  res.render("retour-settings");
});

router.get("/settings", function(req, res) {
  let response = `Newsletter wie geht es dir`;
  res.send(response);
});

module.exports = router;
