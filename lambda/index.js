var Alexa = require('alexa-sdk');
const axios = require('axios');

exports.handler = function(event, context, callback){
  var alexa = Alexa.handler(event, context);
  alexa.registerHandlers(handlers);
  alexa.execute();
};

var handlers = {

  'LaunchRequest': function () {
    this.emit(':ask', 'Welcome to Lux Airport! You can ask me the next flight arrival or departure at Luxembourg airport', 'What can I do for you?');
  },

  'Hello': function () {
    this.emit(':ask', 'Hi there', 'What can I do for you?');
  },

  'NextDeparture': function () {
    var nextDepartureURL = `https://api.tfl.lu/v1/Airport/Departures`;
    var airportChimeStartSound = '<audio src="https://s3-eu-west-1.amazonaws.com/lux-airport/AirportChimeStart.mp3" />';

    axios.get(nextDepartureURL).then((response) => {
        if (response.data.length === 0) {
          throw new Error('I could not find any flight');
        }
        if (response.data[0].airline.toUpperCase() === 'LUXAIR') {
          response.data[0].airline = 'Lux Air';
        }
        var message = `Next departure is flight number <say-as interpret-as="characters">${response.data[0].flight}</say-as>, to, ${response.data[0].destination}, on, ${response.data[0].airline}. <prosody rate="slow" volume="soft">I wish I could go?</prosody> `;
        this.emit(':ask', `${airportChimeStartSound} ${message}`, 'What can I do for you?');
    }).catch((e) => {
        this.emit(':tell', `${airportChimeStartSound} ${e.message}`);
    });
  },

  'NextArrival': function () {
    var nextArrivalURL = `https://api.tfl.lu/v1/Airport/Arrivals`;
    var airportChimeStartSound = '<audio src="https://s3-eu-west-1.amazonaws.com/lux-airport/AirportChimeStart.mp3" />';

    axios.get(nextArrivalURL).then((response) => {
        if (response.data.length === 0) {
          throw new Error('I could not find any flight');
        }
        if (response.data[0].airline.toUpperCase() === 'LUXAIR') {
          response.data[0].airline = 'Lux Air';
        }
        var message = `Next arrival is flight number <say-as interpret-as="characters">${response.data[0].flight}</say-as>, from, ${response.data[0].destination}, on, ${response.data[0].airline} `;
        this.emit(':ask', `${airportChimeStartSound} ${message}`, 'What can I do for you?');
    }).catch((e) => {
        this.emit(':tell', `${airportChimeStartSound} ${e.message}`);
    });
  }

};
