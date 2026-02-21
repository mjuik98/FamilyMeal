process.env.NEXT_PUBLIC_ENABLE_QA = "true";
process.env.SMOKE_ASSERT_QA_BLOCKED = "true";
delete process.env.QA_ROUTE_TOKEN;

await import("./smoke-test.mjs");
