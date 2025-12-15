const { , validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'default',
  service: 'my-app',
  location: 'us-west1'
};
exports.connectorConfig = connectorConfig;

