# Starter TypeScript Lambda

This is a step by step guide on how to bootstrap, integrate and deploy a TypeScript lambda using the [GuCDK](https://github.com/guardian/cdk/blob/main/src/experimental/riff-raff-yaml-file/README.md), [GitHub actions](https://docs.github.com/en/actions) and [Riff Raff](https://riffraff.gutools.co.uk/).

You can choose between two options:

[Option 1 - Build it from scratch](#option-1---build-it-from-scratch)

- [1.1 Create local repository](#11-create-local-repository)
- [1.2 Write starter lambda](#12-write-starter-lambda)
- [1.3 Configure infrastructure as code](#13-configure-infrastructure-as-code)
- [1.4 Configure GitHub integration](#14-configure-github-integration)
- [1.5 Update test snapshot](#15-update-test-snapshot)
- [1.6 Connect local repo to remote repo](#16-connect-local-repo-to-remote-repo)
- [1.7 Test integration on GitHub](#17-test-integration-on-github)
- [1.8 Test deployment on Riff Raff](#18-test-deployment-on-riff-raff)
- [1.9 Test lambda on AWS](#19-test-lambda-on-aws)
- [1.10 How to update application code](#110-how-to-update-application-code)
- [1.11 How to update AWS resources](#111-how-to-update-aws-resources)

[Option 2 - Clone the repo and rename project configurations](#option-2---clone-the-repo-and-rename-project-configurations)

- [2.1 Clone this repo](#21-clone-this-repo)
- [2.2 Delete git folder](#22-delete-git-folder)
- [2.3 Rename project configurations](#23-rename-project-configurations)
- [2.4 Rename Riff Raff project name](#24-rename-riff-raff-project-name)

## Option 1 - Build it from scratch

### 1.1 Create local repository

- Create project folder (replace with your app name):

  ```sh
  mkdir starter-typescript-lambda
  ```

- Change into project folder:

  ```sh
  cd starter-typescript-lambda
  ```

- Open project repository:
  ```sh
  code starter-typescript-lambda
  ```

### 1.2 Write starter lambda

- Initialise a `node` project:
  ```
  yarn init
  ```
- Specify the `node` version by creating a `.nvmrc` file:

  ```
  // .nvmrc

  18
  ```

- Configure formatter by installing `prettier` and `@guardian/prettier` in the `package.json`:

  ```
  yarn add -D prettier @guardian/prettier
  ```

  ```
  // package.json

  "prettier": "@guardian/prettier"
  ```

- Install dependencies:
  ```sh
  yarn add aws-lambda
  yarn add -D @types/aws-lambda @types/node typescript
  ```
- Write starter “Hello World” lambda handler:

  ```ts
  // src/index.ts

  import {
  	APIGatewayProxyEvent,
  	APIGatewayEventRequestContext,
  	APIGatewayProxyCallback,
  } from 'aws-lambda';

  export const handler = (
  	event: APIGatewayProxyEvent,
  	context: APIGatewayEventRequestContext,
  	callback: APIGatewayProxyCallback,
  ): Promise<string> => {
  	const message = 'Hello World!';
  	console.log(message);
  	return Promise.resolve(message);
  };
  ```

### 1.3 Configure infrastructure as code

- Create a new [GuCDK](https://github.com/guardian/cdk/blob/main/docs/setting-up-a-gucdk-project.md) project (replace with your project configuration). If you want to deploy the stack to the `membership` AWS account, replace `playground` with `membership`:
  ```
  npx @guardian/cdk@latest new \
    --app starter-typescript-lambda \
    --stack playground \
    --stage CODE \
    --stage PROD \
    --package-manager yarn
  ```
- Configure starter lambda stack (replace with your app configuration):

  ```ts
  // cdk/lib/starter-typescript-lambda.ts

  import { GuScheduledLambda } from '@guardian/cdk';
  import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
  import { GuStack } from '@guardian/cdk/lib/constructs/core';
  import { Duration } from 'aws-cdk-lib';
  import type { App } from 'aws-cdk-lib';
  import { Schedule } from 'aws-cdk-lib/aws-events';
  import { Runtime } from 'aws-cdk-lib/aws-lambda';

  const APP_NAME = 'starter-typescript-lambda';

  export enum LoggingLevel {
  	SILLY,
  	TRACE,
  	DEBUG,
  	INFO,
  	WARN,
  	ERROR,
  	FATAL,
  }

  export class StarterTypescriptLambda extends GuStack {
  	constructor(
  		scope: App,
  		id: string,
  		props: GuStackProps,
  		loggingLevel: number = LoggingLevel.WARN,
  	) {
  		super(scope, id, props);

  		const otherConfig = {
  			app: APP_NAME,
  			runtime: Runtime.NODEJS_18_X,
  			fileName: `${APP_NAME}.zip`,
  			timeout: Duration.millis(45000),
  			environment: {
  				Bucket: `${APP_NAME}-dist`,
  				Stage: this.stage,
  				LoggingLevel: loggingLevel.toString(),
  			},
  		};

  		new GuScheduledLambda(this, APP_NAME, {
  			handler: 'dist/lambda/index.handler',
  			rules: [
  				{
  					schedule: Schedule.cron({ hour: '10', minute: '00', weekDay: '2' }),
  				},
  			],
  			monitoringConfiguration: {
  				noMonitoring: true,
  			},
  			...otherConfig,
  		});
  	}
  }
  ```

  Here, replace `playground` with `membership`, if for instance you want to deploy the stack to the `membership` AWS account:

  ```ts
  // cdk/bin/cdk.ts

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
  ```

### 1.4 Configure GitHub integration

- Install `esbuild` and add a `build` script to create the transpiled JavaScript `dist` folder:

  ```
  yarn add -D esbuild
  ```

  ```json
  "scripts": {
      "build": "yarn esbuild --bundle --platform=node --target=node18 --outfile=dist/index.js src/index.ts",
  },
  ```

- Create a `package` script to zip the content of the `dist` folder:

  ```json
  "scripts": {
      "package": "cd dist; zip -qr ../cdk/starter-typescript-lambda.zip ./*"
  },
  ```

- Create a file `ci.yaml` inside `.github/workflows` (replace with you project name and content directories). The `projectName` is what will show in the Riff Raff deploy page dropdown:
  ```yaml
  name: 'CI: Starter Typescript Lambda'
  on: [push]
  jobs:
    ci:
      permissions:
        id-token: write
        contents: read
      runs-on: ubuntu-latest
      steps:
        - name: Checkout
          uses: actions/checkout@v3
        - name: Setup node
          uses: actions/setup-node@v3
          with:
            node-version-file: .nvmrc
            cache: 'yarn'
        - run: |
            yarn install
            yarn build
            yarn package
        - name: CDK synth
          run: |
            yarn install
            yarn tsc
            yarn lint
            yarn test
            yarn synth
          working-directory: cdk
        - name: AWS Auth
          uses: aws-actions/configure-aws-credentials@v2
          with:
            role-to-assume: ${{ secrets.GU_RIFF_RAFF_ROLE_ARN }}
            aws-region: eu-west-1
        - name: Upload to riff-raff
          uses: guardian/actions-riff-raff@v2
          with:
            configPath: cdk/cdk.out/riff-raff.yaml
            projectName: playground::starter-typescript-lambda
            buildNumberOffset: 60
            contentDirectories: |
              cdk.out:
                - cdk/cdk.out/starter-typescript-lambda-CODE.template.json
                - cdk/cdk.out/starter-typescript-lambda-PROD.template.json
              starter-typescript-lambda:
                - cdk/starter-typescript-lambda.zip
  ```

### 1.5 Update test snapshot

- Inside the `cdk` folder, run `yarn test -u` to update the test snapshot and check that the tests pass.

### 1.6 Connect local repo to remote repo

- Create a repository on GitHub

- Connect local repository with GitHub remote repository

- Add a `.gitignore` file (replace with project configurations):

  ```
  dist
  .DS_Store
  node_modules
  starter-typescript-lambda.zip
  ```

- Commit and push changes to GitHub

### 1.7 Test integration on GitHub

- Verify that the CI / CD build is successful

  ![GitHub Actions Successful](docs/github-actions.png 'GitHub Actions Successful')

### 1.8 Test deployment on Riff Raff

- Deploy the newly created project on Riff Raff and verify the deployment is successful.

  ![Riff Raff Dropdown](docs/riff-raff-dropdown.png 'Riff Raff Dropdown')

  ***

  ![Riff Raff Deployment Successful](docs/riff-raff-deployment.png 'Riff Raff Deployment Successful')

### 1.9 Test lambda on AWS

- Navigate to lambda in AWS and test that it logs "Hello World!".

  ![AWS Cloudformation Stack](docs/aws-cloudformation-stack.png 'AWS Cloudformation Stack')

  ***

  ![AWS Stack Resources](docs/aws-stack-resources.png 'AWS Stack Resources')

  ***

  ![AWS console lambda test successful](docs/aws-lambda-test.png 'AWS console lambda test successful')

### 1.10 How to update application code

If you want to update the application code:

- commit and push changes to GitHub
- wait for the CI build to complete
- deploy to Riff Raff

### 1.11 How to update AWS resources

- run `yarn test -u` inside the `cdk` folder to update the test snapshot
- commit and push changes to GitHub
- wait for the CI build to complete
- deploy to Riff Raff

## Option 2 - Clone the repo and rename project configurations

### 2.1 Clone this repo

```
git clone git@github.com:guardian/starter-typescript-lambda.git
```

### 2.2 Delete git folder

Change into the newly created project and delete the `.git` folder:

```
rm -rf .git
```

### 2.3 Rename project configurations

- Rename in texts `starter-typescript-lambda` to your `<app-name>`
- Rename in texts `starterTypescriptLambda` to your `<appName>`
- Rename in filenames `starter-typescript-lambda` to your `<app-name>`

### 2.4 Rename Riff Raff project name

In the `ci.yaml` file, rename `projectName: playground::starter-typescript-lambda` to `projectName: <janus-account>::<app-name>`

### 2.6 Deployment

Refer to steps [1.5 Update test snapshot](#15-update-test-snapshot) to [1.11 How to update AWS resources](#111-how-to-update-aws-resources).
