#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EcsFargateSpotCapacityFailbackStack } from '../lib/ecs-fargate-spot-capacity-failback-stack';

const app = new cdk.App();
new EcsFargateSpotCapacityFailbackStack(app, 'ecs-fargate-spot-capacity-failback-stack', {
  emailAddress: app.node.tryGetContext('app-config/emailAddress')
});