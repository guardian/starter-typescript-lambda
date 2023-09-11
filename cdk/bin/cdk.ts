import 'source-map-support/register';
import { GuRootExperimental } from '@guardian/cdk/lib/experimental/constructs/root';
import {
	LoggingLevel,
	StarterTypescriptLambda,
} from '../lib/starter-typescript-lambda';

const app = new GuRootExperimental();

new StarterTypescriptLambda(
	app,
	'starter-typescript-lambda-CODE',
	{
		env: { region: 'eu-west-1' },
		stack: 'playground',
		stage: 'CODE',
	},
	LoggingLevel.DEBUG,
);

new StarterTypescriptLambda(
	app,
	'starter-typescript-lambda-PROD',
	{
		env: { region: 'eu-west-1' },
		stack: 'playground',
		stage: 'PROD',
	},
	LoggingLevel.INFO,
);
