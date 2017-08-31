'use strict';

const axios = require('axios');
const aws = require('aws-sdk');

const s3 = new aws.S3();

let messageToBeLogged = '';

function addDays(date, days) {
   let result = new Date(date);
   result.setDate(result.getDate() + days);
   return result.getTime();
}

function checkFlightAPI(direction) {
   return new Promise((resolve, reject) => {
      const flightDepURL = `https://api.tfl.lu/v1/Airport/${direction}`;
      const timeStamp = new Date(Date.now());
      messageToBeLogged += `[${timeStamp.toISOString()}] `;
      axios.get(flightDepURL)
         .then((response) => {
            const now = Date.now();
            let next = addDays(now, 1);
            let which = 0;
            response.data.forEach((item, index) => {
               if (item.real) {
                  if (item.real > now && item.real < next) {
                     which = index;
                     next = item.real;
                  }
               } else if (item.scheduled) {
                  if (item.scheduled > now && item.scheduled < next) {
                     which = index;
                     next = item.scheduled;
                  }
               }
            });

            if (response.data.length === 0) {
               messageToBeLogged += `${direction} Empty\r\n`;
            } else if (which === 0) {
               const txt = `${direction} OK` +
                  `${response.data[which].flight} ` +
                  `${response.data[which].statusCode} ` +
                  `${response.data[which].status} ` +
                  `S ${response.data[which].scheduled} ` +
                  `A ${response.data[which].real} ` +
                  '\r\n';
               messageToBeLogged += txt;
            } else {
               const txt = `${direction} NOK ` +
                  `${response.data[which].flight} ` +
                  `${response.data[which].statusCode} ` +
                  `${response.data[which].status} ` +
                  `S ${response.data[which].scheduled} ` +
                  `A ${response.data[which].real} ` +
                  'INSTEAD OF' +
                  `${response.data[0].flight} ` +
                  `${response.data[0].statusCode} ` +
                  `${response.data[0].status} ` +
                  `S ${response.data[0].scheduled} ` +
                  `A ${response.data[0].real}` +
                  '\r\n';
               messageToBeLogged += txt;
            }
            resolve();
         })
         .catch((e) => {
            if (e.code === 'ENOTFOUND') {
               messageToBeLogged += `${direction} Not Found\r\n`;
               reject('Unable to connect to API servers.');
            } else {
               messageToBeLogged += `${direction} Error\r\n`;
               reject(e.message);
            }
         });
   });
}

function writeS3Log() {
   return new Promise((resolve, reject) => {
      const bucket = 'flight-api-check';
      const key = 'FlightAPICheck.log';
      const params = {
         Bucket: bucket,
         Key: key
      };
      s3.getObject(params, (errGet, dataGet) => {
         if (errGet) {
            console.log(errGet);
            const message = `Error getting object ${key} from bucket ` +
               `${bucket}. Make sure they exist and your bucket is ` +
               'in the same region as this function.';
            console.log(message);
            reject(message);
         } else {
            const body = dataGet.Body.toString() + messageToBeLogged;
            const paramsNew = {
               Bucket: bucket,
               Key: key,
               Body: body
            };
            s3.putObject(paramsNew, (errPut) => {
               if (errPut) {
                  console.log(errPut);
                  const message = `Error getting object ${key} from bucket ` +
                     `${bucket}. Make sure they exist and your bucket is ` +
                     'in the same region as this function.';
                  console.log(message);
                  reject(message);
               } else {
                  resolve();
               }
            });
         }
      });
   });
}

exports.handler = (event, context, callback) => {
   // My code
   messageToBeLogged = '';
   checkFlightAPI('Departures')
      .then(() => {
         checkFlightAPI('Arrivals')
            .then(() => {
               messageToBeLogged += '----------\r\n';
               writeS3Log()
                  .then(() => {
                     if (messageToBeLogged.includes(' NOK')) {
                        const sns = new aws.SNS();
                        const params = {
                           Message: `\r\n${messageToBeLogged}`,
                           Subject: 'Flight API Check',
                           TopicArn: 'arn:aws:sns:eu-west-1:330753410310:flight-api-check'
                        };
                        const publishSNSPromise = sns.publish(params)
                           .promise();
                        publishSNSPromise.then(() => {
                              context.succeed();
                           })
                           .catch(() => {
                              context.succeed();
                           });
                     }
                     context.succeed();
                  });
            });
      })
      .catch((err) => {
         console.log(Error);
         context.fail(err.message);
      });

   // End of my code

   callback(null, 'Finished');
};
