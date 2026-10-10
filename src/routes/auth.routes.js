import Router from "express";

const router = Router();

router.route("/register").post();
router.route("/login");
router.route("/me");
router.route("/logout");

export default router;
