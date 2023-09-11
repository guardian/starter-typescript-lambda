import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { StarterTypescriptLambda } from "./starter-typescript-lambda";

describe("The StarterTypescriptLambda stack", () => {
  it("matches the snapshot", () => {
    const app = new App();
    const stack = new StarterTypescriptLambda(app, "StarterTypescriptLambda", { stack: "playground", stage: "TEST" });
    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });
});
