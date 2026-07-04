import assert from "node:assert/strict";
import test from "node:test";

import { parseSecretFile } from "./secrets.ts";

test("parseSecretFile reads key=value pairs", () => {
  const values = parseSecretFile(`
# comment
admin.username=maxbugaiov
admin.password=secret!

user.username=mahogany
user.password=Alberta
`);
  assert.equal(values["admin.username"], "maxbugaiov");
  assert.equal(values["user.password"], "Alberta");
});
