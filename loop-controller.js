const { setTimeout } = require('timers/promises');

async function printStep(stepName) {
    const time = new Date().toLocaleTimeString();
    console.log(`\n[${time}] 🔄 Transitioning State: ${stepName}`);
    console.log("=".repeat(50));
}

async function invokePlanner(issueDescription) {
    await printStep("PLANNING (Agent: Planner)");
    console.log(`Input Context: Issue '${issueDescription}'`);
    console.log("Retrieving Knowledge: Coding Standards, Architecture Docs...");
    await setTimeout(1000);
    const plan = `1. Analyze ${issueDescription}\n2. Create necessary functions\n3. Write unit tests`;
    console.log(`Output: Implementation Plan created.\n${plan}`);
    return plan;
}

async function invokeBuilder(plan) {
    await printStep("EXECUTING (Agent: Builder)");
    console.log("Input Context: Implementation Plan");
    console.log("Writing code...");
    await setTimeout(2000);
    const diff = "++ function newFeature() {\n++    return true;\n++ }";
    console.log(`Output: Code modifications complete.\n${diff}`);
    return diff;
}

async function invokeTester(diff) {
    await printStep("VERIFYING - TESTS (Agent: Tester)");
    console.log("Input Context: Modified codebase");
    console.log("Running test suite...");
    await setTimeout(1000);
    console.log("Output: All tests pass! (Mocked)");
    return true;
}

async function invokeReviewer(issueDescription, plan, diff) {
    await printStep("VERIFYING - REVIEW (Agent: Reviewer)");
    console.log("Input Context: Issue, Plan, Diff, Coding Standards");
    console.log("Reviewing changes against requirements...");
    await setTimeout(1000);
    console.log("Output: Changes approved! (Maker != Checker enforced)");
    return true;
}

async function runLoop(issueDescription) {
    console.log(`🚀 Starting Autonomous Engineering Loop for task: ${issueDescription}`);
    
    // 1. Plan
    const plan = await invokePlanner(issueDescription);
    
    // 2. Build
    const diff = await invokeBuilder(plan);
    
    // 3. Test
    const testsPassed = await invokeTester(diff);
    if (!testsPassed) {
        console.log("❌ Tests failed. Loop would retry or escalate.");
        return;
    }
        
    // 4. Review
    const reviewApproved = await invokeReviewer(issueDescription, plan, diff);
    if (!reviewApproved) {
        console.log("❌ Review rejected. Loop would route back to Builder.");
        return;
    }
        
    await printStep("COMPLETED");
    console.log("✅ Autonomous Loop finished successfully. Ready for PR or Merge.");
}

const task = process.argv.slice(2).join(' ') || "Add structured logging to API endpoints";
runLoop(task).catch(console.error);
