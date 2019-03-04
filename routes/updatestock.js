"use strict";

const config = require("../config");
const express = require("express");
var WooCommerceAPI = require("woocommerce-api");
var request = require("request");
var rp = require("request-promise");
const sgMail = require("@sendgrid/mail");
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
var csv = require('express-csv');

const router = express.Router();

router.get("/updatestock", function (req, res) {
  res.render("retour-settings");
});

router.get("/update", function (req, res) {
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
    function (error, response, body) {
      console.log("error:", error); // Print the error if one occurred
      //console.log("statusCode:", response && response.statusCode); // Print the response status code if a response was received
      //console.log("body:", body); // Print the HTML for the Google homepage.
      dataelias = JSON.parse(body);
      //console.log(dataelias);
    }
  );

  for (let i = 1; i < 2; i++) {
    WooCommerce.getAsync(`products?per_page=15&page=${i}`).then(function (
      /*
      err,
      data,
      res
      */
      res
    ) {
      let products = JSON.parse(res.toJSON().body);
      //console.log(products);

      products.forEach(function (item) {
        dataelias.forEach(function (stockitem) {
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

            WooCommerce.putAsync("products/" + item.id, data).then(function (
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

router.get("/neworder", function (req, res) {
  let orderID = req.query.orderid;
  getShippingTag(orderID, tag => {
    setShippingTag(orderID, tag);
    if (tag == `outOfStock`) {
      sendInfoMail(`pablo.pajares@simaru.de`, orderID);
    }
    res.json([
      {
        tag: tag
      }
    ]);
  });
});

router.get("/avocado.csv", function (req, res) {


  let startDate = new Date();
  let endDate = new Date();
  startDate = new Date(endDate.getTime() - 60 * 60 * 24 * 5 * 1000);

  startDate = `${startDate.getFullYear()}-${startDate.getMonth() + 1}-${startDate.getDate()}`;
  endDate = `${endDate.getFullYear()}-${endDate.getMonth() + 1}-${endDate.getDate()}`;




  getAvocadoOrderData(1, startDate, endDate, (output) => {
    res.csv(output, true);
  });
});

function getAvocadoOrderData(pageSize, startDate, endDate, callback) {
  let output = [];
  output.push(["order", "tracking_id", "package_company"]);
  let data = null;
  var username = config.BILLBEE_USERNAME,
    password = config.BILLBEE_PASS,
    url = `https://app.billbee.io/api/v1/orders?minOrderDate=${startDate}&maxOrderDate=${endDate}&page=1&pageSize=${pageSize}&shopId=36046&orderStateId=4`,
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
    .then(function (response) {

      data = JSON.parse(response);
      data = data.Data;
    })
    .catch(function (err) {

    })
    .finally(function () {
      data.forEach(function (order) {
        output.push([order.OrderNumber.slice(0, order.OrderNumber.indexOf("-")), order.ShippingIds[0].ShippingId, "DHL"]);
      });
      callback(output);
    });
}

function callBillbeeStockAPI(pageSize, startDate, endDate, callback) {
  let output = [];
  let data = null;
  var username = config.BILLBEE_USERNAME,
    password = config.BILLBEE_PASS,
    url = `https://app.billbee.io/api/v1/orders?minOrderDate=${startDate}&maxOrderDate=${endDate}&page=1&pageSize=${pageSize}&shopId=36046&orderStateId=4`,
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
    .then(function (response) {

      data = JSON.parse(response);
      data = data.Data;
    })
    .catch(function (err) {

    })
    .finally(function () {
      data.forEach(function (order) {
        output.push({
          order: order.OrderNumber.slice(0, order.OrderNumber.indexOf("-")),
          tracking: order.ShippingIds[0].ShippingId,
          company: `DHL`
        });
      });
      callback(output);
    });
}

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
    .then(function (response) {
      let data = JSON.parse(response);
      let items = data.Data;
      items.forEach(function (product) {
        billbeeStocks.push({
          sku: product.SKU,
          stock: product.StockCurrent
        });
      });
    })
    .catch(function (err) {
      // API call failed...
    })
    .finally(function () {
      //console.log(billbeeStocks);
      console.log("ready...");
      callback(billbeeStocks);
    });
  //return billbeeStocks;
}

function getAmzStock(callback) {
  let data = null;
  let output = [];
  var options = {
    uri: `http://simaru-app.pw:8001/products/katalog/Alle%20Produkte`
  };
  rp(options)
    .then(function (response) {
      data = JSON.parse(response);
    })
    .catch(function (err) {
      // API call failed...
    })
    .finally(function () {
      //console.log(billbeeStocks);
      console.log("ready...");
      data.forEach(function (item) {
        output.push({
          sku: checkAltSKU(item.sku),
          amazon: item.amazon
        });
      });
      callback(output);
    });
}

function checkAltSKU(sku) {
  if (
    sku == `S-T-01` ||
    sku == `S-T-02` ||
    sku == `S-T-03` ||
    sku == `S-T-04` ||
    sku == `S-T-05` ||
    sku == `S-T-06` ||
    sku == `S-T-07` ||
    sku == `S-T-08` ||
    sku == `S-T-09`
  ) {
    let output = `${sku}N`;
    return output;
  } else {
    return sku;
  }
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
    .then(function (response) {
      let data = JSON.parse(response);
      let items = data.Data.OrderItems;
      items.forEach(function (postion) {
        postions.push({
          sku: postion.Product.SKU,
          count: postion.Quantity
        });
      });
    })
    .catch(function (err) {
      // API call failed...
    })
    .finally(function () {
      //console.log(billbeeStocks);
      console.log("ready...");
      callback(postions);
    });
}

function defineShippingType(postions, stockServant, stockAmz) {
  let shippingTypes = []; // Verfügbarkeit der jeweiligen Postion mit Servantful als Prio d.h. wenn Servantful in Stock dann wird hier servant angezeigt
  let shippingAmz = []; // Verfügbarkeit auf Amazon: Array wird nur mit amz gepusht wenn der Artikel auf Amazon verfügbar ist wenn da Array gleicher Länge dem shippingTypes Array ist, sind alle Postionen auf Amazon verfügbar
  let shippingType = null;

  postions.forEach(function (postion) {
    let sku = postion.sku,
      count = postion.count,
      amzCount = 0,
      servantCount = 0;

    stockServant.forEach(function (item) {
      if (item.sku == sku) {
        servantCount += item.stock;
      }
    });

    stockAmz.forEach(function (item) {
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

  shippingTypes.forEach(function (type) {
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
    auth = "Basic " + new Buffer(username + ":" + password).toString("base64"),
    bodyTag = null;

  if (shippingTag == `outOfStock`) {
    bodyTag = {
      Tags: [`shippingRec:${shippingTag}`]
    };
  } else {
    bodyTag = {
      Tags: [`shippingRec:${shippingTag}`]
    };
  }

  request.post(
    {
      url: url,
      headers: {
        Authorization: auth,
        "X-Billbee-Api-Key": config.BILLBEE_API_KEY,
        Accept: "application/json"
      },
      body: bodyTag,
      json: true
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(body);
      }
    }
  );
}

function sendInfoMail(mailAdress, orderID) {
  let postions = [];
  let orderNumber = null;
  let shippingAdress = null;
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
    .then(function (response) {
      let data = JSON.parse(response);
      let items = data.Data.OrderItems;
      items.forEach(function (postion) {
        postions.push({
          count: postion.Quantity,
          sku: postion.Product.SKU
        });
      });
      orderNumber = data.Data.OrderNumber;
      shippingAdress = {
        Company: data.Data.ShippingAddress.Company,
        FirstName: data.Data.ShippingAddress.FirstName,
        LastName: data.Data.ShippingAddress.LastName,
        Street: data.Data.ShippingAddress.Street,
        HouseNumber: data.Data.ShippingAddress.HouseNumber,
        Line2: data.Data.ShippingAddress.Line2,
        Line3: data.Data.ShippingAddress.Line3,
        Zip: data.Data.ShippingAddress.Zip,
        City: data.Data.ShippingAddress.City,
        Country: data.Data.ShippingAddress.Country
      };
    })
    .catch(function (err) {
      // API call failed...
    })
    .finally(function () {
      //console.log(billbeeStocks);
      let postionsFormatted = [];
      postions.forEach(function (p) {
        postionsFormatted.push(`${p.count}x ${p.sku}\n`);
      });
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const msg = {
        to: mailAdress,
        from: `info@simaru.de`,
        templateId: "d-f60bb0e177d441ed8595814b9d148586",
        substitutionWrappers: ["{{", "}}"],
        dynamic_template_data: {
          orderNumber: orderNumber,
          orderPositions: postionsFormatted,
          sACompany: shippingAdress.Company,
          sAFirstName: shippingAdress.FirstName,
          sALastName: shippingAdress.LastName,
          sAStreet: shippingAdress.Street,
          sAHouseNumber: shippingAdress.HouseNumber,
          sALine2: shippingAdress.Line2,
          sALine3: shippingAdress.Line3,
          sAZip: shippingAdress.Zip,
          sACity: shippingAdress.City,
          sACountry: shippingAdress.Country,
          subject: `Handlungsbedarf: Artikel OutOfStock OrderID: ${orderNumber}`
        }
      };

      sgMail.send(msg);
    });
}

module.exports = router;
