const Alexa = require('alexa-sdk');
const axios = require('axios');

// exports.handler = function (event, context, callback){
exports.handler = function(event, context, callback) {
   const alexa = Alexa.handler(event, context);
   alexa.dynamoDBTableName = 'LuxAirport';
   alexa.registerHandlers(handlers);
   alexa.execute();
};

const handlers = {

   'NewSession': function () {
      const numberOfVisits = Number(this.attributes['numberOfVisits']);
      if (numberOfVisits) {
         this.attributes['numberOfVisits'] = (numberOfVisits + 1).toString();
         let welcomeBack = '';
         if (!((numberOfVisits + 1) % 2)) welcomeBack += `Excellent! You have come here ${numberOfVisits + 1} times!`;
         welcomeBack = welcomeBack +
            'Welcome back! You can ask me the next flight arrival or ' +
            'departure at Luxembourg airport' +
            'What do you want to do?';
         this.emit(':ask', welcomeBack, 'What do you want to do?');
      } else {
         this.attributes['numberOfVisits'] = '1';
         this.emit(':ask',
            'Welcome to Lux Airport! You can ask me the next flight arrival or ' +
            'departure at Luxembourg airport',
            'What can I do for you?');
      }
   },

   'LaunchRequest': function () {
      this.emit(':ask',
         'Welcome to Lux Airport! You can ask me the next flight arrival or ' +
         'departure at Luxembourg airport',
         'What can I do for you?');
   },

   // Refactor to mutualize code betwwen Departure and Arrivals
   // Handle Airline slot
   'NextDeparture': function() {
      const nextDepartureURL = 'https://api.tfl.lu/v1/Airport/Departures';
      const airportChimeStartSound =
         '<audio src="https://s3-eu-west-1.amazonaws.com/lux-airport/AirportChimeStart.mp3" />';

      axios.get(nextDepartureURL)
         .then((response) => {
            if (response.data.length === 0) {
               throw new Error('I could not find any flight');
            }
            if (response.data[0].airline.toUpperCase() === 'LUXAIR') {
               // Should do a map first
               response.data[0].airline = 'Lux Air';
            }
            const message = 'Next departure is flight number' +
               `<say-as interpret-as="characters">${response.data[0].flight}</say-as>, ` +
               `to, ${response.data[0].destination}, on, ${response.data[0].airline}.`;
            this.emit(':ask', `${airportChimeStartSound} ${message}`,
               'What can I do for you?');
         })
         .catch((e) => {
            this.emit(':ask', `${airportChimeStartSound} ${e.message}`,
               'What can I do for you?');
         });
   },

   'NextArrival': function() {
      const nextArrivalURL = 'https://api.tfl.lu/v1/Airport/Arrivals';
      const airportChimeStartSound =
         '<audio src="https://s3-eu-west-1.amazonaws.com/lux-airport/AirportChimeStart.mp3" />';

      axios.get(nextArrivalURL)
         .then((response) => {
            if (response.data.length === 0) throw new Error('I could not find any flight');
            let flight= {
              airline: response.data[0].airline,
              number: response.data[0].flight,
              originDestination: response.data[0].destination
            };
            // if (response.data[0].airline.toUpperCase() === 'LUXAIR') {
            //    // Should do a map first
            //    response.data[0].airline = 'Lux Air';
            // }
            flight.airline = flight.airline.toUpperCase().replace('LUXAIR', 'Lux Air');
            const message =
               'Next arrival is flight number <say-as interpret-as="characters">' +
               `${flight.number}</say-as>, from, ${flight.originDestination}, ` +
               `on, ${flight.airline} `;
            this.emit(':ask', `${airportChimeStartSound} ${message}`,
               'What can I do for you?');
         })
         .catch((e) => {
            this.emit(':ask', `${airportChimeStartSound} ${e.message}`,
               'What can I do for you?');
         });
   },

   'AMAZON.StopIntent': function () {
      // State Automatically Saved with :tell
      this.emit(':tell', 'Goodbye! We hope to see you again very soon at Lux Airport.');
   },

   'AMAZON.CancelIntent': function () {
      // State Automatically Saved with :tell
      this.emit(':tell', 'Goodbye! We hope to see you again very soon at Lux Airport.');
   },

   'SessionEndedRequest': function () {
      // Force State Save When User Times Out
      this.emit(':saveState', true);
   },

};
