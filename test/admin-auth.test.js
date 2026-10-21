import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import User from "../src/models/user.model.js";
import adminRoutes from "../src/routes/admin.routes.js";
import { verifyJwt } from "../src/middleware/auth.middleware.js";
import requireAdmin from "../src/middleware/requireAdmin.middleware.js";
import { registerSchema } from "../src/validations/auth.validation.js";
import { updateAccountDetailsSchema } from "../src/validations/user.validation.js";

const secret = "test-access-token-secret";
process.env.ACCESS_TOKEN_SECRET = secret;

test("admin API requires an access token and the database-loaded admin role", async (t) => {
    const firstEndpoint = adminRoutes.stack.findIndex((layer) => layer.route);
    assert.ok(firstEndpoint >= 2, "the router must install authentication and authorization before endpoints");
    assert.equal(adminRoutes.stack[1].handle, requireAdmin);

    const users = new Map([
        ["customer-id", { _id: "customer-id", fullName: "Customer", email: "customer@example.test", role: "user" }],
        ["admin-id", { _id: "admin-id", fullName: "Admin", email: "admin@example.test", role: "admin" }],
    ]);
    const originalFindById = User.findById;
    User.findById = (id) => {
        const user = users.get(id.toString()) || null;
        return {
            select: async () => user,
            then: (resolve, reject) => Promise.resolve(user).then(resolve, reject),
        };
    };
    t.after(() => {
        User.findById = originalFindById;
    });

    const authorize = async (token, guard = requireAdmin) => {
        const req = {
            cookies: {},
            get: () => token ? `Bearer ${token}` : undefined,
        };
        let error;
        await verifyJwt(req, {}, (nextError) => { error = nextError; });
        if (!error) guard(req, {}, (nextError) => { error = nextError; });
        return { req, error };
    };

    const anonymous = await authorize(null);
    assert.equal(anonymous.error.statusCode, 401);

    const customerToken = jwt.sign({ _id: "customer-id", role: "admin" }, secret);
    const customer = await authorize(customerToken);
    assert.equal(customer.error.statusCode, 403, "database role must override a forged/stale token role");

    const adminToken = jwt.sign({ _id: "admin-id", role: "user" }, secret);
    const admin = await authorize(adminToken);
    assert.equal(admin.error, undefined, "database admin role grants access despite a stale token role");
    assert.equal(admin.req.user.email, "admin@example.test");

    users.get("admin-id").role = "user";
    assert.equal((await authorize(adminToken)).error.statusCode, 403, "a demoted account loses API access despite its still-valid token");
});

test("public registration and account updates reject role assignment", () => {
    const registration = registerSchema.validate({
        fullName: "Example User",
        email: "user@example.test",
        password: "safe-password",
        role: "admin",
    });
    assert.ok(registration.error, "registration must reject an unexpected role field");

    const accountUpdate = updateAccountDetailsSchema.validate({ role: "admin" });
    assert.ok(accountUpdate.error, "profile updates must reject role changes");
});
