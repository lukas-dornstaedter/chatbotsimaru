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
  getShippingTag(orderID, tag => {
    setShippingTag(orderID, tag);
    res.json([
      {
        tag: tag
      }
    ]);
  });
});

function getServantfulStock(page, pageSize, callback) {
  let billbeeStocks = [];
  var username = config.BILLBEE_USERNAME,
    password = config.BILLBEE_PASS,
    url = `https://app.billbee.io/api/v1/products?pageSize=${pageSize}&page=${page}`,
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
      let data = JSON.parse(response);
      let items = data.Data;
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
      //console.log(billbeeStocks);
      console.log("ready...");
      callback(billbeeStocks);
    });
  //return billbeeStocks;
}

function getAmzStock(callback) {
  output = null;
  var options = {
    uri: `http://simaru-app.pw:8001/products/katalog/Alle%20Produkte`
  };
  rp(options)
    .then(function(response) {
      let data = JSON.parse(response);
      output = data;
    })
    .catch(function(err) {
      // API call failed...
    })
    .finally(function() {
      //console.log(billbeeStocks);
      console.log("ready...");
      callback(output);
    });
}

function getOrder(orderID, callback) {
  let postions = [];
  var username = config.BILLBEE_USERNAME,
    password = config.BILLBEE_PASS,
    url = `https://app.billbee.io/api/v1/orders/${orderID}`,
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
      let data = JSON.parse(response);
      let items = data.Data.OrderItems;
      items.forEach(function(postion) {
        postions.push({
          sku: postion.Product.SKU,
          count: postion.Quantity
        });
      });
    })
    .catch(function(err) {
      // API call failed...
    })
    .finally(function() {
      //console.log(billbeeStocks);
      console.log("ready...");
      callback(postions);
    });
}

function defineShippingType(postions, stockServant, stockAmz) {
  let shippingTypes = []; // Verfügbarkeit der jeweiligen Postion mit Servantful als Prio d.h. wenn Servantful in Stock dann wird hier servant angezeigt
  let shippingAmz = []; // Verfügbarkeit auf Amazon: Array wird nur mit amz gepusht wenn der Artikel auf Amazon verfügbar ist wenn da Array gleicher Länge dem shippingTypes Array ist, sind alle Postionen auf Amazon verfügbar
  let shippingType = null;

  postions.forEach(function(postion) {
    let sku = postion.sku,
      count = postion.count,
      amzCount = 0,
      servantCount = 0;

    stockServant.forEach(function(item) {
      if (item.sku == sku) {
        servantCount += item.stock;
      }
    });

    stockAmz.forEach(function(item) {
      if (item.sku == sku) {
        amzCount += item.amazon;
      }
    });

    if (count < servantCount) {
      shippingTypes.push(`servant`);
      // Check If Amz is also possible
      if (count < amzCount) {
        shippingAmz.push(`amz`);
      }
    } else if (count > servantCount && count < amzCount) {
      shippingTypes.push(`amz`);
      shippingAmz.push(`amz`);
    } else {
      shippingTypes.push(`outOfStock`);
    }
  });
  console.log(shippingTypes);
  console.log(shippingAmz);

  shippingTypes.forEach(function(type) {
    if (shippingType == null && shippingType != `outOfStock`) {
      shippingType = type;
    } else if (shippingType != null && shippingType == type) {
    } else if (type == `outOfStock`) {
      shippingType = `outOfStock`;
      return shippingType;
    } else if (
      shippingType != null &&
      shippingType != type &&
      type != `outOfStock`
    ) {
      if (shippingTypes.length == shippingAmz.length) {
        // Prüfen ob alle Postionen auf Amazon verfübar sind
        shippingType = `amz`;
      } else {
        //Falls nicht tag auf mixed setzten = manueller Handlungsbedarf
        shippingType = `mixed`;
      }
    }
  });
  return shippingType;
}

function getShippingTag(orderID, callback) {
  let stockServant = [];
  let stockAmz = [];
  getServantfulStock(1, 200, data => {
    stockServant = data;
    console.log(stockServant.length);
    getServantfulStock(2, 200, data => {
      stockServant = stockServant.concat(data);
      console.log(stockServant.length);

      // Billbee Stock Daten geladen

      getAmzStock(data => {
        stockAmz = data;
        console.log(stockAmz.length);

        getOrder(orderID, data => {
          let postions = data;
          console.log(
            `ShippingType:` +
              defineShippingType(postions, stockServant, stockAmz)
          );
          callback(defineShippingType(postions, stockServant, stockAmz));
        });
      });
    });
  });
}

function setShippingTag(orderID, shippingTag) {
  var request = require("request"),
    username = config.BILLBEE_USERNAME,
    password = config.BILLBEE_PASS,
    url = `https://app.billbee.io/api/v1/orders/${orderID}/tags`,
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
        Tags: [`shippingRec:${shippingTag}`]
      },
      json: true
    },
    function(error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(body);
      }
    }
  );
}

module.exports = router;
