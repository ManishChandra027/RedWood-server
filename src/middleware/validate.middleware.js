
import ApiError from "../utils/ApiError.js";

const validate = (schema, property = "body") => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false,
            convert: true,
        });

        if (error) {
            const errors = error.details.map((err) => err.message);

            return next(
                new ApiError(400, errors.join(", "))
            );
        }

        req.validated ??= {};
        req.validated[property] = value;

        if (property === "body") {
            req.body = value;
        }

        next();
    };
};

export default validate;
