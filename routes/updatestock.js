"use strict";

const config = require("../config");
const express = require("express");
var WooCommerceAPI = require("woocommerce-api");
var request = require("request");
var rp = require("request-promise");

const router = express.Router();

router.get("/updatestock", function(req, res) {
  res.render("retour-settings");
});

router.get("/update", function(req, res) {
  var WooCommerce = new WooCommerceAPI({
    url: "https://simaru.de",
    consumerKey: config.CONSUMER_KEY,
    consumerSecret: config.CONSUMER_SECRET,
    wpAPI: true,
    version: "wc/v3"
  });

  let dataelias = null;

  request(
    "http://simaru-app.pw:8001/products/katalog/Alle%20Produkte",
    function(error, response, body) {
      console.log("error:", error); // Print the error if one occurred
      //console.log("statusCode:", response && response.statusCode); // Print the response status code if a response was received
      //console.log("body:", body); // Print the HTML for the Google homepage.
      dataelias = JSON.parse(body);
      //console.log(dataelias);
    }
  );

  for (let i = 1; i < 2; i++) {
    WooCommerce.getAsync(`products?per_page=15&page=${i}`).then(function(
      /*
      err,
      data,
      res
      */
      res
    ) {
      let products = JSON.parse(res.toJSON().body);
      //console.log(products);

      products.forEach(function(item) {
        dataelias.forEach(function(stockitem) {
          //console.log(item.sku);
          //console.log(stockitem.sku);
          let childItems = item.variations;
          if (
            stockitem.sku == item.sku &&
            stockitem.sku != "S-PV-04" &&
            childItems.length == 0
          ) {
            console.log(`Update Stock: ${item.sku}`);
            if (stockitem.amazon > 1) {
              var data = {
                stock_quantity: Number(stockitem.amazon)
              };
            } else {
              var data = {
                stock_quantity: 0
              };
            }

            WooCommerce.putAsync("products/" + item.id, data).then(function(
              err,
              data,
              res
            ) {
              //console.log(res);
            });
          } else {
            //console.log(`${item.sku} hat child Elemente`);
          }
          /*
          else if (item.variations.length > 0) {
            let itemID = item.id;
            let childItems = null;
            childItems = item.variations;
            console.log(childItems);
            childItems.forEach(function(childItem) {
              WooCommerce.get(`products/${childItem}`, function(
                err,
                data,
                res
              ) {
                let childItemData = JSON.parse(res);
                let childItemSKU = childItemData.sku;
                dataelias.forEach(function(itemE) {
                  if (childItemSKU == itemE.sku) {
                    if (itemE.amazon > 1) {
                      let newData = {
                        stock_quantity: Number(itemE.amazon)
                      };
                    } else {
                      let newData = {
                        stock_quantity: 0
                      };
                    }
                    WooCommerce.put(`products/${childItem}`, newData, function(
                      err,
                      data,
                      res
                    ) {
                      //console.log(res);
                    });
                  }
                });
              });
            });
          }
          */
        });
      });
    });
  }
  res.json([]);
});

router.get("/neworder", function(req, res) {
  let orderID = req.query.orderid;

  let billbeeStocks = [];
  var username = config.BILLBEE_USERNAME,
    password = config.BILLBEE_PASS,
    url = `https://app.billbee.io/api/v1/products?pageSize=200&page=1`,
    auth = "Basic " + new Buffer(username + ":" + password).toString("base64");
  var options = {
    uri: url,
    headers: {
      Authorization: auth,
      "X-Billbee-Api-Key": config.BILLBEE_API_KEY,
      Accept: "application/json"
    },
    json: false // Automatically parses the JSON string in the response
  };

  rp(options)
    .then(function(response) {
      //console.log('User has %d repos', repos.length);
      //console.log(response);
      let data = JSON.parse(response);
      //console.log(repos.Data[0].Id);
      //console.log(data);
      //console.log("---");
      //console.log(data);
      let items = data.Data;
      //console.log(items);
      items.forEach(function(product) {
        billbeeStocks.push({
          sku: product.SKU,
          stock: product.StockCurrent
        });
      });
    })
    .catch(function(err) {
      // API call failed...
    })
    .finally(function() {
      console.log(billbeeStocks);
      console.log("ready...");
    });
  res.json([]);

  /*
  var request = require("request"),
    username = config.BILLBEE_USERNAME,
    password = config.BILLBEE_PASS,
    url = `https://app.billbee.io/api/v1/products?pageSize=10&page=1`,
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
      let data = JSON.parse(body);
      let items = data.Data;
      items.forEach(function(product) {
        billbeeStocks.push({
          sku: product.SKU,
          stock: product.StockCurrent
        });
      });
      console.log(billbeeStocks);
      res.json([]);
    }
  );
  console.log("ready...");

*/
});

module.exports = router;
