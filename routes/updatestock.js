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

router.get("/neworder", function(req, res) {
  let orderID = req.query.orderid;

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
      let billbeeIDs = [];
      let bOrderID = data.Data.BillBeeOrderId;
      items.forEach(function(position) {
        billbeeIDs.push({
          id: position.Product.BillbeeId,
          quantity: position.Quantity
        });
      });
      let test = getShippingPrev(billbeeIDs);
      var request = require("request"),
        username = config.BILLBEE_USERNAME,
        password = config.BILLBEE_PASS,
        url = `https://app.billbee.io/api/v1/orders/${bOrderID}/tags`,
        auth =
          "Basic " + new Buffer(username + ":" + password).toString("base64");

      request.post(
        {
          url: url,
          headers: {
            Authorization: auth,
            "X-Billbee-Api-Key": config.BILLBEE_API_KEY,
            Accept: "application/json"
          },
          body: {
            Tags: [res]
          },
          json: true
        },
        function(error, response, body) {
          if (!error && response.statusCode == 200) {
            console.log(body);
          }
        }
      );

      res.json([]);
    }
  );
});

function getShippingPrev(positions) {
  let shippingType = null;
  positions.forEach(function(position) {
    console.log(position.id);
    var request = require("request"),
      username = config.BILLBEE_USERNAME,
      password = config.BILLBEE_PASS,
      url = "https://app.billbee.io/api/v1/products" + position.id,
      auth =
        "Basic " + new Buffer(username + ":" + password).toString("base64");

    request(
      {
        url: url,
        headers: {
          Authorization: auth,
          "X-Billbee-Api-Key": config.BILLBEE_API_KEY,
          Accept: "application/json"
        }
      },
      async function(error, response, body) {
        // Do more stuff with 'body' here
        console.log(body.Data);
        let data = JSON.parse(body);
        if (data.Data.StockCurrent > position.quantity) {
          if (shippingType == "servant") {
            shippingType = "servant";
          } else if (shippingType == "amz") {
            shippingType = "mixed";
          }
        }

        const d = await response.json([]);
        return shippingType;
      }
    );
  });
}

module.exports = router;
