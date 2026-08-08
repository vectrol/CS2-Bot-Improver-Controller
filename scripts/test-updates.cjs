const { app } = require("electron");
const path = require("node:path");

setTimeout(() => {
  console.log("TIMEOUT");
  app.exit(2);
}, 45000);

const pkg = require(path.join(__dirname, "..", "package.json"));
try {
  app.setVersion(pkg.version);
} catch {
  /* older electron without setVersion — ignore */
}

app.whenReady().then(async () => {
  const updates = require(path.join(__dirname, "..", "out", "main", "updates.js"));
  const plugin = await updates.checkPluginUpdate(true);
  console.log("PLUGIN:", JSON.stringify(plugin));
  const controller = await updates.checkControllerUpdate(true);
  console.log("CONTROLLER:", JSON.stringify(controller));
  console.log("REPO:", updates.controllerRepo());

  let fails = 0;
  if (plugin.latest == null || plugin.url == null || plugin.error) {
    console.log("FAIL  plugin network check");
    fails++;
  } else {
    console.log("PASS  plugin network check (latest=" + plugin.latest + ")");
  }
  if (plugin.current !== "1.4.3" || plugin.hasUpdate !== false) {
    console.log("FAIL  plugin version compare (current=1.4.3, no update)");
    fails++;
  } else {
    console.log("PASS  plugin version compare");
  }
  if (controller.current !== pkg.version) {
    console.log("FAIL  controller current version (" + controller.current + ", expected " + pkg.version + ")");
    fails++;
  } else {
    console.log("PASS  controller current version (" + controller.current + ")");
  }
  if (!controller.error && controller.hasUpdate) {
    console.log("FAIL  controller should not report update on release build");
    fails++;
  } else {
    console.log("PASS  controller check ran (hasUpdate=" + controller.hasUpdate + ")");
  }
  console.log(fails === 0 ? "ALL UPDATE TESTS PASSED" : fails + " FAILED");
  app.exit(fails === 0 ? 0 : 1);
});
