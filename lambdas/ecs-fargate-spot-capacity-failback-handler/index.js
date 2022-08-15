const AWS = require('aws-sdk');
const ecs = new AWS.ECS();

exports.handler =  async function(event, context) {
  // Log the full event
  console.log("RECEIVING EVENT: \n" + JSON.stringify(event, null, 2));
  
  // Get cluster and service name
  const splitArn = event.resources[0].split('/');
  const clusterName = splitArn[1];
  const serviceName = splitArn[2];

  // Initializing parameters for the request
  const params = {
    cluster: clusterName,
    service: serviceName,
    forceNewDeployment: true,
    capacityProviderStrategy: [
      {
        capacityProvider: 'FARGATE',
        base: 1,
        weight: 1
      },
      {
        capacityProvider: 'FARGATE_SPOT',
        base: 0,
        weight: 0
      }
    ]
  };

  // Updating the affected service
  try {
    console.log(`Updating ${clusterName}/${serviceName} to fully use FARGATE capacity.`)
    const results = await ecs.updateService(params).promise();
    console.log(results);
  }
  catch (err) {
    console.log(err, err.stack);
    throw err;
  }

}