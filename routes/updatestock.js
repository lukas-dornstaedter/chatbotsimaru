"use strict";

const config = require("../config");
const express = require("express");
var WooCommerceAPI = require("woocommerce-api");
var request = require("request");

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
    WooCommerce.getAsync(`products?per_page=40&page=${i}`, function(
      err,
      data,
      res
    ) {
      let products = JSON.parse(res);
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

            WooCommerce.putAsync("products/" + item.id, data, function(
              err,
              data,
              res
            ) {
              //console.log(res);
            });
          } else {
            console.log(`${item.sku} hat child Elemente`);
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

module.exports = router;
